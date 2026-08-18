import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { pt as dateFnsPt, enUS } from "date-fns/locale";
import { useI18n, usePaymentMethods } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Copy, Eye, Send, X, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { FeeNote, FeeNoteStatus } from "@/lib/finance-types";

type ServiceItem = { description: string; quantity: number; unit_value: string | number; total: number };
import { useCreateFeeNote, useUpdateFeeNote, useDeleteFeeNote, useDuplicateFeeNote } from "@/hooks/use-financials-new";
import { useAuth } from "@/hooks/use-auth";
import { useClientsForSelect } from "@/hooks/use-financial-transactions";
import { useProcessesForClient } from "@/hooks/use-financial-transactions";
import { ConvertBudgetModal } from "./convert-budget-modal";

const STATUS_OPTIONS: { value: FeeNoteStatus; labelKey: string; label: string }[] = [
  { value: "rascunho", labelKey: "finance.budgets.statusDraft", label: "Rascunho" },
  { value: "enviado", labelKey: "finance.budgets.statusSent", label: "Enviado" },
  { value: "aceite", labelKey: "finance.budgets.statusAccepted", label: "Aceite" },
  { value: "recusado", labelKey: "finance.budgets.statusRejected", label: "Rejeitado" },
  { value: "expirado", labelKey: "finance.budgets.statusExpired", label: "Expirado" },
];

export function BudgetList({ companyId, hideFilters = false, searchNumber, searchClient, filterStatus, responsibleFilter, adminViewAll = false }: { companyId?: string | null; hideFilters?: boolean; searchNumber?: string; searchClient?: string; filterStatus?: string; responsibleFilter?: string; adminViewAll?: boolean }) {
    const { t, language, dateFormat } = useI18n();
   const { profile } = useAuth();
   const locale = language === "en" ? enUS : dateFnsPt;
   const qc = useQueryClient();

  const { data: clients } = useClientsForSelect();
  const [clientId, setClientId] = useState("");
  const { data: processes } = useProcessesForClient(clientId);
  const [processoId, setProcessoId] = useState("");
  const [status, setStatus] = useState<FeeNoteStatus>("rascunho");
  const [issueDate, setIssueDate] = useState<string | null>(null);
  const [validUntil, setValidUntil] = useState<string | null>(null);
  const [observations, setObservations] = useState("");
  const [items, setItems] = useState<ServiceItem[]>([{ description: "", quantity: 1, unit_value: "", total: 0 }]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FeeNote | null>(null);
  const [viewing, setViewing] = useState<FeeNote | null>(null);
  const [converting, setConverting] = useState<FeeNote | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [internalSearchNumber, setInternalSearchNumber] = useState("");
  const [internalSearchClient, setInternalSearchClient] = useState("");
  const [internalFilterStatus, setInternalFilterStatus] = useState<string>("all");
  const [internalResponsibleFilter, setInternalResponsibleFilter] = useState<string>("all");
  const [inlineStatusBudget, setInlineStatusBudget] = useState<string | null>(null);

  const effectiveSearchNumber = hideFilters ? searchNumber || "" : internalSearchNumber;
  const effectiveSearchClient = hideFilters ? searchClient || "" : internalSearchClient;
  const effectiveFilterStatus = hideFilters ? (filterStatus || "all") : internalFilterStatus;
  const effectiveResponsibleFilter = hideFilters ? (responsibleFilter || "all") : internalResponsibleFilter;

   const {
     data: budgets = [],
     isLoading,
     error,
     refetch,
   } = useQuery<FeeNote[]>({
     queryKey: ["fee-notes", companyId, "budget", profile?.id, profile?.role] as const,
     enabled: !!companyId,
      queryFn: async () => {
         if (!companyId) return [];
         let query = supabase
           .from("fee_notes")
           .select("*")
           .eq("company_id", companyId)
           .order("issue_date", { ascending: false });
         if (!adminViewAll || profile?.role !== "admin") {
           query = query.eq("created_by", profile?.id);
         }
         const { data, error } = await query;
        if (error) {
          console.error("BudgetList query error:", error);
          throw error;
        }
        const rows = (data ?? []) as any[];
        return rows.filter((record) => !record.document_type || record.document_type === "budget") as FeeNote[];
     },
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

  const clientNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of clients ?? []) {
      if (c.id) map.set(c.id, c.name || "");
    }
    return map;
  }, [clients]);

  const filteredBudgets = useMemo(() => {
    return budgets.filter((b) => {
      const matchesNumber = !effectiveSearchNumber || (b.numero || "").toLowerCase().includes(effectiveSearchNumber.toLowerCase());
      const clientName = b.cliente_id ? (clientNameMap.get(b.cliente_id) || "") : "";
      const matchesClient = !effectiveSearchClient || clientName.toLowerCase().includes(effectiveSearchClient.toLowerCase());
      const matchesStatus = effectiveFilterStatus === "all" || b.status === effectiveFilterStatus;
      const matchesResponsible = effectiveResponsibleFilter === "all" || b.created_by === effectiveResponsibleFilter;
      return matchesNumber && matchesClient && matchesStatus && matchesResponsible;
    });
  }, [budgets, effectiveSearchNumber, effectiveSearchClient, effectiveFilterStatus, effectiveResponsibleFilter, clientNameMap]);

  const createMutation = useCreateFeeNote();
  const updateMutation = useUpdateFeeNote();
  const deleteMutation = useDeleteFeeNote();
  const duplicateMutation = useDuplicateFeeNote();

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FeeNoteStatus }) => {
      const { error } = await supabase.from("fee_notes").update({ status }).eq("id", id);
      if (error) throw error;
      return id;
    },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["fee-notes", companyId] });
        toast.success(t("finance.budgets.statusUpdated"));
      },
      onError: (e: any) => {
        toast.error(e?.message || t("finance.budgets.statusUpdateError"));
      },
  });

  const subtotal = useMemo(() => items.reduce((acc, it) => acc + (it.total || 0), 0), [items]);
  const total = subtotal + 0;

  const resetForm = () => {
    setEditing(null);
    setClientId("");
    setProcessoId("");
    setStatus("rascunho");
    setIssueDate(null);
    setValidUntil(null);
    setObservations("");
    setItems([{ description: "", quantity: 1, unit_value: "", total: 0 }]);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (budget: FeeNote) => {
    setEditing(budget);
    setClientId(budget.cliente_id || "");
    setProcessoId(budget.processo_id || "");
    setStatus(budget.status as FeeNoteStatus);
    setIssueDate(budget.issue_date || null);
    setValidUntil(budget.valid_until || null);
    setObservations(budget.observations || "");
    setItems(budget.services?.length ? budget.services.map((it: any) => ({ ...it, unit_value: it.unit_value ?? "" })) : [{ description: "", quantity: 1, unit_value: "", total: 0 }]);
    setOpen(true);
  };

  const addItem = () => setItems((prev) => [...prev, { description: "", quantity: 1, unit_value: "", total: 0 }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, patch: Partial<ServiceItem>) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      if (patch.quantity !== undefined || patch.unit_value !== undefined) {
        const qty = Number(next[idx].quantity) || 0;
        const val = next[idx].unit_value === "" ? 0 : Number(next[idx].unit_value) || 0;
        next[idx].total = qty * val;
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!companyId || !profile?.id) return;
     const validItems = items.filter((it) => it.description.trim() !== "" && it.total > 0);
      if (!validItems.length) {
        toast.error(t("finance.budgets.addAtLeastOneItem"));
        return;
      }

    const payload: any = {
      company_id: companyId,
      cliente_id: clientId || null,
      processo_id: processoId || null,
      document_type: "budget",
      valid_until: validUntil || null,
      status: status || "rascunho",
      observations: observations || null,
      services: validItems.map((it, idx) => ({
        description: it.description,
        quantity: it.quantity,
        unit_value: it.unit_value === "" ? 0 : Number(it.unit_value),
        total: it.total,
        position: it.position ?? idx,
      })),
      subtotal,
      tax: 0,
      total,
      created_by: profile.id,
    };

    if (issueDate) {
      payload.issue_date = issueDate;
    }

     if (!editing?.id) {
       try {
         const { data: nextNum, error: numError } = await supabase.rpc("next_budget_number", { p_company_id: companyId });
         if (numError) throw numError;
         payload.numero = nextNum;
       } catch (e) {
         console.error(t("finance.budgets.errorGeneratingNumber"), e);
         toast.error(t("finance.budgets.errorGeneratingNumber"));
         return;
       }
     }

     try {
       if (editing?.id) {
         await updateMutation.mutateAsync({ id: editing.id, updates: payload });
         toast.success(t("finance.budgets.updated"));
       } else {
         await createMutation.mutateAsync(payload);
         toast.success(t("finance.budgets.created"));
       }
      setOpen(false);
      resetForm();
    } catch (e: any) {
      const msg = e?.message || "";
       if (msg.includes("PGRST204") || msg.includes("Could not find the 'cliente_id' column of 'fee_notes'")) {
         toast.error(t("finance.budgets.migrationRequired"));
         return;
       }
       console.error(e);
       toast.error(t("finance.budgets.saveError"));
    }
  };

   const handleDelete = async () => {
     if (!confirmDelete) return;
     try {
       await deleteMutation.mutateAsync(confirmDelete);
       toast.success(t("finance.budgets.deleted"));
     } catch {
       // handled
     } finally {
       setConfirmDelete(null);
     }
   };

   const handleDuplicate = async (id: string) => {
     try {
       await duplicateMutation.mutateAsync(id);
       toast.success(t("finance.budgets.duplicated"));
     } catch {
       // handled
     }
   };

  const handleDownloadPdf = async (budget: FeeNote) => {
    try {
      const doc = new jsPDF();
      
      const company = profile?.company_id ? await supabase
        .from("companies")
        .select("*")
        .eq("id", profile.company_id)
        .single() : { data: null };

      const client = budget.cliente_id ? clients?.find((c) => c.id === budget.cliente_id) : null;
      const process = budget.processo_id ? processes?.find((p) => p.id === budget.processo_id) : null;

      // Header
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(t("finance.budgets.pdfTitle"), 14, 20);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
       doc.text(`${t("finance.budgets.pdfNumber")}: ${budget.numero || "—"}`, 14, 28);
       doc.text(`${t("finance.budgets.pdfIssueDate")}: ${budget.issue_date ? format(parseISO(budget.issue_date), "dd/MM/yyyy") : "—"}`, 14, 34);
       doc.text(`${t("finance.budgets.pdfValidUntil")}: ${budget.valid_until ? format(parseISO(budget.valid_until), "dd/MM/yyyy") : "—"}`, 14, 40);
      doc.text(`${t("finance.budgets.pdfStatus")}: ${budget.status || "—"}`, 14, 46);

      // Company
      let companyY = 58;
      if (company?.data) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(company.data.nome || t("finance.budgets.companyDefault"), 14, companyY);
        companyY += 7;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        if (company.data.endereco) { doc.text(`${t("finance.budgets.pdfAddress")}: ${company.data.endereco}`, 14, companyY); companyY += 5; }
        if (company.data.telefone) { doc.text(`${t("finance.budgets.pdfPhone")}: ${company.data.telefone}`, 14, companyY); companyY += 5; }
        if (company.data.email) { doc.text(`${t("finance.budgets.pdfEmail")}: ${company.data.email}`, 14, companyY); companyY += 5; }
        if (company.data.nuit) { doc.text(`${t("finance.budgets.pdfNuit")}: ${company.data.nuit}`, 14, companyY); companyY += 5; }
        companyY += 4;
      }

      // Client
      const clientY = companyY || 58;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(t("finance.budgets.pdfClient"), 14, clientY);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(client?.name || "—", 14, clientY + 6);
      if (client?.email) doc.text(client.email, 14, clientY + 12);
      if (client?.phone) doc.text(client.phone, 14, clientY + 18);
      if (client?.address) doc.text(client.address, 14, clientY + 24);

      // Process
      if (process) {
        const processY = clientY + 32;
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(t("finance.budgets.pdfProcess"), 14, processY);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(process.numero || "—", 14, processY + 6);
        if (process.tipo) doc.text(process.tipo, 14, processY + 12);
      }

      // Services table
      const startY = process ? (clientY + 42) : (clientY + 32);
      const tableData = (budget.services || []).map((it: any) => [
        it.description,
        String(it.quantity || 1),
        new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(Number(it.unit_value) || 0),
        new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(it.total || 0),
      ]);

      autoTable(doc, {
        startY,
        head: [[t("finance.budgets.tableDescription"), t("finance.budgets.tableQty"), t("finance.budgets.tableUnitValue"), t("finance.budgets.tableTotal")]],
        body: tableData,
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 9 },
        styles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 20, halign: "center" }, 2: { cellWidth: 40, halign: "right" }, 3: { cellWidth: 40, halign: "right" } },
      });

      const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : startY + 20;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`${t("finance.budgets.pdfSubtotal")}: ${new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(budget.subtotal || 0)}`, 14, finalY);
      doc.text(`${t("finance.budgets.pdfTax")}: ${new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(budget.tax || 0)}`, 14, finalY + 6);
      doc.text(`${t("finance.budgets.pdfTotal")}: ${new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(budget.total || 0)}`, 14, finalY + 12);

      if (budget.observations) {
        const obsY = finalY + 22;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(t("finance.budgets.pdfObservations"), 14, obsY);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const splitText = doc.splitTextToSize(budget.observations, 180);
        doc.text(splitText, 14, obsY + 6);
      }

      doc.save(`budget-${budget.numero || budget.id}.pdf`);
      toast.success(t("finance.budgets.pdfGenerated"));
     } catch (e) {
       console.error(e);
       toast.error(t("finance.budgets.pdfError"));
     }
  };

  const getStatusBadge = (s: FeeNoteStatus) => {
    const map: Record<FeeNoteStatus, string> = {
      rascunho: "bg-muted text-muted-foreground",
      enviado: "bg-info/10 text-info",
      aceite: "bg-success text-success-foreground",
      recusado: "bg-destructive text-destructive-foreground",
      expirado: "bg-warning text-warning-foreground",
    };
    const label = STATUS_OPTIONS.find((o) => o.value === s)?.labelKey ? t(STATUS_OPTIONS.find((o) => o.value === s)!.labelKey as any, { defaultValue: s }) : s;
    return <Badge className={cn("text-[10px]", map[s])}>{label}</Badge>;
  };

  return (
    <div className="space-y-4">
       <div className="flex items-center justify-between">
         <div>
           <h3 className="text-sm font-semibold">{t("finance.budgets.title")}</h3>
           <p className="text-xs text-muted-foreground">{t("finance.budgets.subtitle")}</p>
         </div>
         <Button size="sm" onClick={openCreate} className="h-8 gap-1 text-xs">
           <Plus className="h-3.5 w-3.5" /> {t("finance.budgets.create")}
         </Button>
       </div>

        {!hideFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div>
              <Label className="text-xs">{t("finance.budgets.searchPlaceholder")}</Label>
              <Input className="h-9 text-xs" value={internalSearchNumber} onChange={(e) => setInternalSearchNumber(e.target.value)} placeholder={t("finance.budgets.searchPlaceholder")} />
            </div>
            <div>
              <Label className="text-xs">{t("finance.budgets.status")}</Label>
              <Select value={internalFilterStatus} onValueChange={(v) => setInternalFilterStatus(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={t("finance.filters.all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("finance.filters.all")}</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{t(s.labelKey as any, { defaultValue: s.label })}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{t("finance.budgets.responsible")}</Label>
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
            <div>
             <Label className="text-xs">{t("finance.budgets.client")}</Label>
             <Select value={internalSearchClient} onValueChange={(v) => setInternalSearchClient(v)}>
               <SelectTrigger className="h-9 text-xs">
                 <SelectValue placeholder={t("finance.filters.all")} />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">{t("finance.filters.all")}</SelectItem>
               </SelectContent>
             </Select>
           </div>
         </div>
       )}

       {isLoading ? (
         <Card className="p-10 text-center text-xs text-muted-foreground">{t("finance.budgets.loading")}</Card>
       ) : error ? (
         <Card className="p-4 text-xs text-destructive">{t("finance.budgets.error")}: {error instanceof Error ? error.message : "—"}</Card>
       ) : budgets.length === 0 ? (
         <Card className="p-10 text-center text-xs text-muted-foreground">{t("finance.budgets.empty.title")}</Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("finance.budgets.tableNumber")}</TableHead>
                <TableHead>{t("finance.budgets.client")}</TableHead>
                <TableHead>{t("finance.budgets.tableProcess")}</TableHead>
                <TableHead>{t("finance.budgets.tableDate")}</TableHead>
                <TableHead>{t("finance.budgets.tableValidUntil")}</TableHead>
                <TableHead>{t("finance.budgets.tableTotal")}</TableHead>
                 <TableHead>{t("finance.budgets.status")}</TableHead>
                <TableHead>{t("finance.responsible")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBudgets.map((budget) => (
                <TableRow key={budget.id}>
                  <TableCell className="font-medium">{budget.numero}</TableCell>
                  <TableCell>{budget.cliente_id ? (clients?.find((c) => c.id === budget.cliente_id)?.name || "—") : "—"}</TableCell>
                  <TableCell>{budget.processo_id ? processes?.find((p) => p.id === budget.processo_id)?.numero || budget.processo_id.slice(0, 8) : "—"}</TableCell>
                   <TableCell>{budget.issue_date ? format(parseISO(budget.issue_date), dateFormat, { locale }) : "—"}</TableCell>
                   <TableCell>{budget.valid_until ? format(parseISO(budget.valid_until), dateFormat, { locale }) : "—"}</TableCell>
                   <TableCell>{new Intl.NumberFormat(language === "en" ? "en-US" : "pt-PT", { style: "currency", currency: "MZN" }).format(budget.total || 0)}</TableCell>
                  <TableCell>
                  {inlineStatusBudget === budget.id ? (
                    <Select
                      value={budget.status as FeeNoteStatus}
                      onValueChange={(v) => {
                        updateStatusMutation.mutate({ id: budget.id!, status: v as FeeNoteStatus });
                        setInlineStatusBudget(null);
                      }}
                    >
                      <SelectTrigger className="h-7 text-[10px] w-28">
                        <SelectValue />
                      </SelectTrigger>
                       <SelectContent>
                         {STATUS_OPTIONS.map((s) => (
                           <SelectItem key={s.value} value={s.value}>{t(s.labelKey as any, { defaultValue: s.label })}</SelectItem>
                         ))}
                       </SelectContent>
                    </Select>
                  ) : (
                    <Badge
                      className="cursor-pointer text-[10px]"
                      onClick={() => setInlineStatusBudget(budget.id!)}
                      variant="outline"
                    >
                      {getStatusBadge(budget.status as FeeNoteStatus)}
                    </Badge>
                  )}
                  </TableCell>
                  <TableCell className="text-xs">{budget.created_by ? (profileMap.get(budget.created_by) || "—") : "—"}</TableCell>
                   <TableCell className="text-right">
                     <div className="flex items-center justify-end gap-1">
                       <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDownloadPdf(budget)} title={t("finance.budgets.downloadPdf")}>
                         <Download className="h-4 w-4" />
                       </Button>
                       <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewing(budget)} title={t("view")}>
                         <Eye className="h-4 w-4" />
                       </Button>
                       <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(budget)} title={t("edit")}>
                         <Pencil className="h-4 w-4" />
                       </Button>
                       <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDuplicate(budget.id)} title={t("duplicate")}>
                         <Copy className="h-4 w-4" />
                       </Button>
                       <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setConverting(budget)} title={t("finance.budgets.convert")}>
                         <Send className="h-4 w-4" />
                       </Button>
                       <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setConfirmDelete(budget.id!)} title={t("delete")}>
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     </div>
                   </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? t("edit") : t("finance.budgets.create")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 max-h-[70vh] overflow-y-auto">
             <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
               <div className="space-y-1.5">
                 <Label className="text-xs font-medium">{t("finance.budgets.client")}</Label>
                 <Select value={clientId} onValueChange={(v) => { setClientId(v); setProcessoId(""); }}>
                   <SelectTrigger className="h-9 text-xs">
                     <SelectValue placeholder={t("finance.budgets.selectClient")} />
                   </SelectTrigger>
                   <SelectContent>
                     {clients?.map((c) => (
                       <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-1.5">
                 <Label className="text-xs font-medium">{t("finance.budgets.clientProcess")}</Label>
                 <Select value={processoId} onValueChange={setProcessoId} disabled={!clientId}>
                   <SelectTrigger className="h-9 text-xs">
                     <SelectValue placeholder={t("finance.budgets.selectProcess")} />
                   </SelectTrigger>
                   <SelectContent>
                     {processes?.map((p) => (
                       <SelectItem key={p.id} value={p.id}>{p.numero} - {p.tipo}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-1.5">
                 <Label className="text-xs font-medium">{t("finance.budgets.issueDate")}</Label>
                 <DateInput
                  value={issueDate}
                  onChange={(v) => setIssueDate(v)}
                  className="h-9 text-xs"
                />
               </div>
               <div className="space-y-1.5">
                 <Label className="text-xs font-medium">{t("finance.budgets.validUntil")}</Label>
                 <DateInput
                  value={validUntil}
                  onChange={(v) => setValidUntil(v)}
                  className="h-9 text-xs"
                />
               </div>
               <div className="space-y-1.5">
                 <Label className="text-xs font-medium">{t("finance.budgets.status")}</Label>
                 <Select value={status} onValueChange={(v) => setStatus(v as FeeNoteStatus)}>
                   <SelectTrigger className="h-9 text-xs">
                     <SelectValue placeholder={t("finance.budgets.selectStatus")} />
                   </SelectTrigger>
                   <SelectContent>
                     {STATUS_OPTIONS.map((s) => (
                       <SelectItem key={s.value} value={s.value}>{t(s.labelKey as any, { defaultValue: s.label })}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
             </div>

             <div className="space-y-1.5">
               <Label className="text-xs font-medium">{t("finance.budgets.observations")}</Label>
               <Textarea
                 value={observations}
                 onChange={(e) => setObservations(e.target.value)}
                 className="text-xs"
                 rows={2}
                 placeholder={t("finance.budgets.observationsPlaceholder")}
               />
             </div>

             <div>
               <div className="flex items-center justify-between mb-2">
                 <Label className="text-xs font-medium">{t("finance.budgets.services")}</Label>
                 <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={addItem}>
                   <Plus className="h-3.5 w-3.5" /> {t("finance.budgets.addItem")}
                 </Button>
               </div>
              <div className="space-y-2">
                 {items.map((item, idx) => (
                   <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                     <div className="col-span-12 md:col-span-5 space-y-1">
                       <Label className="text-[10px] text-muted-foreground">{t("finance.budgets.tableDescription")}</Label>
                       <Input className="h-8 text-xs" value={item.description} onChange={(e) => updateItem(idx, { description: e.target.value })} placeholder={t("finance.budgets.descriptionPlaceholder")} />
                     </div>
                     <div className="col-span-4 md:col-span-2 space-y-1">
                       <Label className="text-[10px] text-muted-foreground">{t("finance.budgets.tableQty")}</Label>
                       <Input type="number" className="h-8 text-xs" value={item.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} placeholder="1" />
                     </div>
                      <div className="col-span-4 md:col-span-2 space-y-1">
                        <Label className="text-[10px] text-muted-foreground">{t("finance.budgets.tableUnitValue")}</Label>
                        <Input type="text" inputMode="decimal" className="h-8 text-xs" value={item.unit_value} onChange={(e) => updateItem(idx, { unit_value: e.target.value })} placeholder="0.00" />
                      </div>
                     <div className="col-span-3 md:col-span-2 space-y-1">
                       <Label className="text-[10px] text-muted-foreground">{t("finance.budgets.tableTotal")}</Label>
                       <Input className="h-8 text-xs bg-muted" value={new Intl.NumberFormat(language === "en" ? "en-US" : "pt-PT", { style: "currency", currency: "MZN" }).format(item.total)} readOnly />
                     </div>
                    <div className="col-span-1 flex items-end justify-center pb-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeItem(idx)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
               <div className="mt-2 flex items-center justify-between text-xs font-medium">
                 <span>{t("finance.budgets.pdfSubtotal")}</span>
                 <span>{new Intl.NumberFormat(language === "en" ? "en-US" : "pt-PT", { style: "currency", currency: "MZN" }).format(subtotal)}</span>
               </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>{t("cancel")}</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{t("view")} - {viewing?.numero}</DialogTitle>
              {viewing && (
                <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => handleDownloadPdf(viewing)}>
                  <Download className="h-3.5 w-3.5" /> {t("finance.budgets.downloadPdf")}
                </Button>
              )}
            </div>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("finance.budgets.client")}</p>
                  <p className="font-medium">{viewing.cliente_id ? clients?.find((c) => c.id === viewing.cliente_id)?.name || "—" : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("finance.budgets.status")}</p>
                  {getStatusBadge(viewing.status as FeeNoteStatus)}
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("amount")}</p>
                  <p className="font-medium">{new Intl.NumberFormat(language === "en" ? "en-US" : "pt-PT", { style: "currency", currency: "MZN" }).format(viewing.total || 0)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("finance.budgets.balance")}</p>
                  <p className="font-medium">{new Intl.NumberFormat(language === "en" ? "en-US" : "pt-PT", { style: "currency", currency: "MZN" }).format(viewing.balance ?? 0)}</p>
                </div>
              </div>
              {viewing.observations && (
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("finance.budgets.observations")}</p>
                  <p className="whitespace-pre-wrap">{viewing.observations}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">{t("finance.budgets.services")}</p>
                <Table>
                   <TableHeader>
                    <TableRow>
                      <TableHead>{t("finance.budgets.tableDescription")}</TableHead>
                      <TableHead>{t("finance.budgets.tableQty")}</TableHead>
                      <TableHead>{t("finance.budgets.tableUnitValue")}</TableHead>
                      <TableHead>{t("finance.budgets.tableTotal")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(viewing.services || []).map((it: any, idx: number) => (
                      <TableRow key={it.id || idx}>
                        <TableCell>{it.description}</TableCell>
                        <TableCell>{it.quantity}</TableCell>
                        <TableCell>{new Intl.NumberFormat(language === "en" ? "en-US" : "pt-PT", { style: "currency", currency: "MZN" }).format(Number(it.unit_value) || 0)}</TableCell>
                       <TableCell>{new Intl.NumberFormat(language === "en" ? "en-US" : "pt-PT", { style: "currency", currency: "MZN" }).format(it.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("finance.budgets.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("finance.budgets.confirmDeleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDelete(null)}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConvertBudgetModal budget={converting} open={!!converting} onOpenChange={(open) => { if (!open) setConverting(null); }} />
    </div>
  );
}
