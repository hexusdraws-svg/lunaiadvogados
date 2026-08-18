import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Eye, Download, Printer } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Receipt } from "@/lib/finance-types";
import { format, parseISO } from "date-fns";
import { pt as dateFnsPt, enUS } from "date-fns/locale";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ReceiptWithDetails = Receipt & {
  transaction_description?: string | null;
  transaction_client_name?: string | null;
  transaction_client_id?: string | null;
  transaction_payment_date?: string | null;
  fee_note_numero?: string | null;
  fee_note_document_type?: string | null;
  fee_note_total?: number | null;
  fee_note_paid_amount?: number | null;
  fee_note_balance?: number | null;
};

export function ReceiptsTable({ companyId, invoiceId, hideFilters = false, filterNumber, filterMethod, responsibleFilter, autoViewFirstReceipt = false }: { companyId?: string | null; invoiceId?: string | null; hideFilters?: boolean; filterNumber?: string; filterMethod?: string; responsibleFilter?: string; autoViewFirstReceipt?: boolean }) {
  const { t, language, currency, dateFormat } = useI18n();
  const locale = language === "en" ? enUS : dateFnsPt;

  const { data: company } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase.from("companies").select("*").eq("id", companyId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

   const { data: companyProfiles = [] } = useQuery({
     queryKey: ["company-profiles", companyId],
     queryFn: async () => {
       if (!companyId) return [];
       const { data, error } = await supabase.from("profiles").select("id, full_name").eq("company_id", companyId);
       if (error) throw error;
       return data ?? [];
     },
     enabled: !!companyId,
   });

   const profileMap = useMemo(() => {
     const map = new Map<string, string>();
     for (const p of companyProfiles) {
       if (p.id) map.set(p.id, p.full_name || "");
     }
     return map;
   }, [companyProfiles]);

    const { data: receipts = [], isLoading } = useQuery({
      queryKey: ["receipts", companyId, invoiceId],
      enabled: !!companyId,
      queryFn: async () => {
        let query = supabase
          .from("receipts")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false });

        if (invoiceId) query = query.eq("fee_note_id", invoiceId);

        const { data, error } = await query;
       if (error) throw error;
       return (data ?? []) as Receipt[];
     },
   });

   const [viewing, setViewing] = useState<ReceiptWithDetails | null>(null);
   const [currentReceiptIndex, setCurrentReceiptIndex] = useState<number>(-1);
   const [internalFilterNumber, setInternalFilterNumber] = useState("");
   const [internalFilterMethod, setInternalFilterMethod] = useState("");
   const [internalResponsibleFilter, setInternalResponsibleFilter] = useState<string>("all");

   const activeFilterNumber = hideFilters ? filterNumber || "" : internalFilterNumber;
   const activeFilterMethod = hideFilters ? filterMethod || "" : internalFilterMethod;
   const activeResponsibleFilter = hideFilters ? (responsibleFilter || "all") : internalResponsibleFilter;

   const getPaymentMethodLabel = (method: string) => t(`finance.paymentMethods.${method}`, { defaultValue: method });

   const truncate = (text: string | null | undefined, max = 50) => {
     if (!text) return "—";
     return text.length > max ? text.slice(0, max) + "…" : text;
   };

   const filtered = useMemo(() => {
     return receipts.filter((r) => {
       const matchesNumber = !activeFilterNumber || (r.receipt_number || "").toLowerCase().includes(activeFilterNumber.toLowerCase());
       const matchesMethod = !activeFilterMethod || r.payment_method === activeFilterMethod;
       const matchesResponsible = activeResponsibleFilter === "all" || r.created_by === activeResponsibleFilter;
       return matchesNumber && matchesMethod && matchesResponsible;
     });
   }, [receipts, activeFilterNumber, activeFilterMethod, activeResponsibleFilter]);

   const paymentMethods = useMemo(() => {
     const methods = Array.from(new Set(receipts.map((r) => r.payment_method).filter(Boolean)));
     return methods;
   }, [receipts]);

   const mostRecentId = useMemo(() => {
     if (filtered.length === 0) return null;
     return filtered[0]?.id || null;
   }, [filtered]);

   const { data: clientDetail } = useQuery({
     queryKey: ["receipt-client", viewing?.transaction_client_id],
     queryFn: async () => {
       if (!viewing?.transaction_client_id) return null;
       const { data, error } = await supabase
         .from("clientes")
         .select("nome, endereco, cidade, provincia, pais")
         .eq("id", viewing.transaction_client_id)
         .maybeSingle();
       if (error) throw error;
       return data;
     },
     enabled: !!viewing?.transaction_client_id,
   });

   const clientAddress = useMemo(() => {
     if (!clientDetail) return "";
     const parts = [clientDetail.endereco, clientDetail.cidade, clientDetail.provincia, clientDetail.pais].filter(Boolean);
     return parts.join(", ");
   }, [clientDetail]);

   const companyAddress = company ? [company.endereco, company.cidade, company.pais].filter(Boolean).join(", ") : "";
   const companyNuit = company?.nuit || null;

   const generatedAt = viewing?.created_at ? format(parseISO(viewing.created_at), "dd/MM/yyyy HH:mm", { locale }) : "—";

   const handleViewReceipt = async (rec: Receipt | null, index?: number) => {
     if (!rec) return;
     const enriched: ReceiptWithDetails = { ...rec };

     if (rec.transaction_id) {
       const { data: tx } = await supabase
         .from("financial_transactions")
         .select("id, description, client_name, client_id, payment_date, payment_method")
         .eq("id", rec.transaction_id)
         .maybeSingle();
       if (tx) {
         enriched.transaction_description = tx.description ?? null;
         enriched.transaction_client_name = tx.client_name ?? null;
         enriched.transaction_client_id = tx.client_id ?? null;
         enriched.transaction_payment_date = tx.payment_date ?? null;
       }
     }

     if (rec.fee_note_id) {
       const { data: fn } = await supabase
         .from("fee_notes")
         .select("id, numero, document_type, total, paid_amount, balance, cliente_id")
         .eq("id", rec.fee_note_id)
         .maybeSingle();
       if (fn) {
         enriched.fee_note_numero = fn.numero ?? null;
         enriched.fee_note_document_type = fn.document_type ?? null;
         enriched.fee_note_total = fn.total ?? null;
         enriched.fee_note_paid_amount = fn.paid_amount ?? null;
         enriched.fee_note_balance = fn.balance ?? null;
         if (!enriched.transaction_client_name && fn.cliente_id) {
           const { data: cliente } = await supabase
             .from("clientes")
             .select("nome")
             .eq("id", fn.cliente_id)
             .maybeSingle();
           if (cliente) {
             enriched.transaction_client_name = cliente.nome ?? null;
           }
         }
       }
     }

     setViewing(enriched);
     if (typeof index === "number") {
       setCurrentReceiptIndex(index);
     }
   };

   const showPreviousReceipt = () => {
     if (currentReceiptIndex > 0) {
       const previousReceipt = filtered[currentReceiptIndex - 1];
       handleViewReceipt(previousReceipt, currentReceiptIndex - 1);
     }
   };

   const showNextReceipt = () => {
     if (currentReceiptIndex < filtered.length - 1) {
       const nextReceipt = filtered[currentReceiptIndex + 1];
       handleViewReceipt(nextReceipt, currentReceiptIndex + 1);
     }
   };

   const autoViewRef = useRef(false);

   useEffect(() => {
     if (!autoViewFirstReceipt || !invoiceId || !receipts.length || autoViewRef.current) {
       return;
     }
     autoViewRef.current = true;
     handleViewReceipt(receipts[0]);
   }, [autoViewFirstReceipt, invoiceId, receipts, handleViewReceipt]);

   useEffect(() => {
     autoViewRef.current = false;
   }, [invoiceId]);

  const handleDownloadPdf = async (rec: ReceiptWithDetails | null) => {
    if (!rec) return;
    const doc = new jsPDF();
    const companyName = company?.nome || "—";
    const generatedPdfAt = rec.created_at ? format(parseISO(rec.created_at), "dd/MM/yyyy HH:mm", { locale }) : "—";
    const clientName = rec.transaction_client_name || "—";
    const currency = company?.currency || "MZN";
    const localeStr = language === "en" ? "en-US" : "pt-PT";

    const fmt = (v: number) => new Intl.NumberFormat(localeStr, { style: "currency", currency }).format(v);

    let currentY = 14;

    if (company?.logo_url) {
      try {
        const response = await fetch(company.logo_url);
        const blob = await response.blob();
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        doc.addImage(dataUrl, "PNG", 14, 14, 22, 22);
        currentY = 42;
      } catch {
        // logo load failed, continue without it
      }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(companyName, 14, currentY);
    currentY += 6;

    if (companyAddress) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(companyAddress, 14, currentY);
      currentY += 5;
    }
    if (company?.email) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(company.email, 14, currentY);
      currentY += 5;
    }
    if (company?.telefone) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(company.telefone, 14, currentY);
      currentY += 5;
    }
    if (companyNuit) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`NUIT: ${companyNuit}`, 14, currentY);
      currentY += 5;
    }

    currentY += 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(t("receipts.receiptNumber", { defaultValue: "RECIBO" }), 196, currentY, { align: "right" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${t("receipts.number", { defaultValue: "Número" })}: ${rec.receipt_number}`, 196, currentY + 8, { align: "right" });
    doc.text(`${t("receipts.generatedAt", { defaultValue: "Gerado em" })}: ${generatedPdfAt}`, 196, currentY + 14, { align: "right" });

    currentY += 24;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(t("receipts.client", { defaultValue: "Cliente" }), 14, currentY);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(clientName, 14, currentY + 6);
    if (clientAddress) {
      doc.text(clientAddress, 14, currentY + 12);
    }

    const tableStartY = currentY + 20;
    const tableData: string[][] = [
      [t("receipts.value", { defaultValue: "Valor" }), fmt(rec.amount)],
      [t("receipts.paymentMethod", { defaultValue: "Método de Pagamento" }), getPaymentMethodLabel(rec.payment_method)],
    ];
    if (rec.receipt_date) {
      tableData.push([t("receipts.paymentDate", { defaultValue: "Data do Pagamento" }), format(parseISO(rec.receipt_date), dateFormat, { locale })]);
    }
    if (rec.fee_note_numero) {
      tableData.push([t("receipts.reference", { defaultValue: "Referência" }), rec.fee_note_numero]);
    }
    if (rec.description || rec.transaction_description) {
      tableData.push([t("receipts.description", { defaultValue: "Descrição" }), rec.description || rec.transaction_description || "—"]);
    }

    autoTable(doc, {
      startY: tableStartY,
      head: [[t("receipts.field", { defaultValue: "Campo" }), t("receipts.detail", { defaultValue: "Detalhe" })]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 9 },
      styles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 110 } },
    });

    const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : 145;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(companyName, 14, finalY);

    doc.save(`recibo-${rec.receipt_number}.pdf`);
    toast.success(t("finance.receipts.generatedAt", { defaultValue: "PDF gerado com sucesso." }));
  };

  const openPrintableView = (rec: ReceiptWithDetails | null) => {
    if (!rec) return;
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      toast.error("Não foi possível abrir a janela de impressão. Verifica o bloqueador de pop-ups.");
      return;
    }

    const paymentDate = rec.receipt_date ? format(parseISO(rec.receipt_date), dateFormat, { locale }) : "—";
    const generatedAtPrint = rec.created_at ? format(parseISO(rec.created_at), "dd/MM/yyyy HH:mm", { locale }) : "—";
    const companyName = company?.nome || "—";
    const currency = company?.currency || "MZN";
    const localeStr = language === "en" ? "en-US" : "pt-PT";
    const fmt = (v: number) => new Intl.NumberFormat(localeStr, { style: "currency", currency }).format(v);

    printWindow.document.write(`
      <html>
        <head>
          <title>${t("receipts.receiptNumber", { defaultValue: "Recibo" })} ${rec.receipt_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 700px; margin: 0 auto; color: #1a1a1a; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 24px; }
            .company-name { font-size: 18px; font-weight: bold; }
            .receipt-title { font-size: 22px; font-weight: bold; text-align: right; }
            .section { margin-bottom: 16px; }
            .label { font-size: 10px; color: #666; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
            .value { font-size: 13px; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            td { padding: 8px; border-bottom: 1px solid #eee; font-size: 12px; }
            td:first-child { font-weight: bold; width: 35%; }
            .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #999; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              ${company?.logo_url ? `<img src="${company.logo_url}" style="height:50px;margin-bottom:8px;" />` : ""}
              <div class="company-name">${companyName}</div>
              <div style="font-size:11px;color:#666;">
                ${[companyAddress, company?.email, company?.telefone, companyNuit ? "NUIT: " + companyNuit : null].filter(Boolean).join("<br/>")}
              </div>
            </div>
            <div class="receipt-title">
              ${t("receipts.receiptNumber", { defaultValue: "RECIBO" })}
              <div style="font-size:14px;font-weight:normal;margin-top:4px;">${rec.receipt_number}</div>
            </div>
          </div>

          <div class="section">
            <div class="label">${t("receipts.client", { defaultValue: "Cliente" })}</div>
            <div class="value">${rec.transaction_client_name || "—"}</div>
          </div>

          <div class="section">
            <table>
              <tr><td>${t("receipts.value", { defaultValue: "Valor" })}</td><td>${fmt(rec.amount)}</td></tr>
              <tr><td>${t("receipts.paymentMethod", { defaultValue: "Método de Pagamento" })}</td><td>${getPaymentMethodLabel(rec.payment_method)}</td></tr>
              <tr><td>${t("receipts.paymentDate", { defaultValue: "Data do Pagamento" })}</td><td>${paymentDate}</td></tr>
              <tr><td>${t("receipts.generatedAt", { defaultValue: "Gerado em" })}</td><td>${generatedAtPrint}</td></tr>
              ${rec.fee_note_numero ? `<tr><td>${t("receipts.reference", { defaultValue: "Referência" })}</td><td>${rec.fee_note_numero}</td></tr>` : ""}
              ${(rec.description || rec.transaction_description) ? `<tr><td>${t("receipts.description", { defaultValue: "Descrição" })}</td><td>${rec.description || rec.transaction_description || "—"}</td></tr>` : ""}
            </table>
          </div>

          <div class="footer">
            ${companyName}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{t("finance.receipts.title", { defaultValue: "Recibos" })}</h3>
          <p className="text-xs text-muted-foreground">{t("finance.receipts.subtitle", { defaultValue: "Recibos gerados automaticamente após recebimento." })}</p>
        </div>
      </div>

       {!hideFilters && (
         <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">{t("finance.receipts.tableNumber")}</Label>
                <Input className="h-9 text-xs" value={internalFilterNumber} onChange={(e) => setInternalFilterNumber(e.target.value)} placeholder={t("finance.receipts.searchPlaceholder")} />
              </div>
              <div>
                <Label className="text-xs">{t("finance.paymentMethods.title")}</Label>
                <Select value={internalFilterMethod} onValueChange={(v) => setInternalFilterMethod(v)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder={t("finance.filters.all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("finance.filters.all")}</SelectItem>
                    {paymentMethods.map((m) => <SelectItem key={m} value={m}>{getPaymentMethodLabel(m)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t("finance.responsible")}</Label>
                <Select value={internalResponsibleFilter} onValueChange={(v) => setInternalResponsibleFilter(v)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder={t("finance.filters.all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("finance.filters.all")}</SelectItem>
                    {companyProfiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name || p.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
         </Card>
       )}

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-xs text-muted-foreground">{t("finance.receipts.empty", { defaultValue: "Sem recibos." })}</Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("finance.receipts.tableNumber")}</TableHead>
                  <TableHead>{t("amount")}</TableHead>
                  <TableHead>{t("finance.paymentMethods.method")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("description")}</TableHead>
                  <TableHead>{t("client", { defaultValue: "Cliente" })}</TableHead>
                  <TableHead>{t("finance.responsible")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
             <TableBody>
               {filtered.map((rec, index) => {
                 const isNew = mostRecentId === rec.id;
                const paymentDate = rec.receipt_date ? format(parseISO(rec.receipt_date), dateFormat, { locale }) : "—";
                const displayDescription = rec.description || rec.transaction_description || "—";
                const creatorName = rec.created_by ? (profileMap.get(rec.created_by) || "—") : "—";
                return (
                  <TableRow key={rec.id} className={isNew ? "bg-primary/5" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {isNew && <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span></span>}
                        <span>{rec.receipt_number}</span>
                      </div>
                    </TableCell>
                     <TableCell>{new Intl.NumberFormat(language === "en" ? "en-US" : "pt-PT", { style: "currency", currency }).format(rec.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{getPaymentMethodLabel(rec.payment_method)}</Badge>
                    </TableCell>
                    <TableCell>{paymentDate}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[240px]">
                      <span className="block truncate" title={displayDescription}>{truncate(displayDescription, 60)}</span>
                    </TableCell>
                    <TableCell className="text-xs">{viewing?.transaction_client_name || rec.transaction_client_name || "—"}</TableCell>
                    <TableCell className="text-xs">{creatorName}</TableCell>
                    <TableCell className="text-right">
                       <div className="flex items-center justify-end gap-1">
                         <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleViewReceipt(rec, index)} title={t("view")}>
                            <Eye className="h-4 w-4" />
                          </Button>
                         <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openPrintableView(rec)} title={t("print")}>
                           <Printer className="h-4 w-4" />
                         </Button>
                         <Button size="icon" variant="ghost" className="h-8 w-8" onClick={async () => await handleDownloadPdf(rec)} title={t("download")}>
                           <Download className="h-4 w-4" />
                         </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("view")} - {viewing?.receipt_number}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("amount")}</p>
                  <p className="font-medium">{new Intl.NumberFormat(language === "en" ? "en-US" : "pt-PT", { style: "currency", currency }).format(viewing.amount)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("finance.paymentMethods.method")}</p>
                  <p className="font-medium">{getPaymentMethodLabel(viewing.payment_method)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("date")}</p>
                  <p className="font-medium">{viewing.receipt_date ? format(parseISO(viewing.receipt_date), dateFormat, { locale }) : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("finance.receipts.generatedAt")}</p>
                  <p className="font-medium">{generatedAt}</p>
                </div>
              </div>

              <div className="space-y-1 rounded-lg border p-3">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">{t("finance.receipts.company")}</p>
                <p className="font-medium">{company?.nome || "—"}</p>
                <p className="text-[11px] text-muted-foreground">{[company?.email, companyAddress].filter(Boolean).join(" · ")}</p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground">{t("description")}</p>
                <p className="font-medium whitespace-pre-wrap">{viewing.description || viewing.transaction_description || "—"}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("client")}</p>
                  <p className="font-medium">{viewing.transaction_client_name || "—"}</p>
                  {clientDetail?.documento && (
                    <p className="text-[11px] text-muted-foreground">{clientDetail.documento}</p>
                  )}
                </div>
                {viewing.fee_note_numero && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t("finance.receipts.reference")}</p>
                    <p className="font-medium">{viewing.fee_note_numero}</p>
                    {viewing.fee_note_document_type && (
                      <p className="text-[11px] text-muted-foreground capitalize">{viewing.fee_note_document_type}</p>
                    )}
                  </div>
                )}
              </div>

              {viewing.created_by && (
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground">{t("finance.responsible")}</p>
                  <p className="font-medium">{profileMap.get(viewing.created_by) || "—"}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentReceiptIndex <= 0}
                onClick={showPreviousReceipt}
              >
                {t("previous", { defaultValue: "Anterior" })}
              </Button>
              <span className="text-xs text-muted-foreground">
                {currentReceiptIndex + 1} / {filtered.length}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentReceiptIndex >= filtered.length - 1}
                onClick={showNextReceipt}
              >
                {t("next", { defaultValue: "Próximo" })}
              </Button>
            </div>
            <Button variant="outline" onClick={() => setViewing(null)}>{t("close")}</Button>
            <Button variant="secondary" onClick={() => openPrintableView(viewing)}>
              <Printer className="mr-2 h-4 w-4" /> {t("print")}
            </Button>
            <Button onClick={async () => await handleDownloadPdf(viewing)}>
              <Download className="mr-2 h-4 w-4" /> {t("downloadPDF")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
