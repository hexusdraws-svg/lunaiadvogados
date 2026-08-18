import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Eye, Download, Printer, Pencil, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { FeeNote, FeeNoteStatus, InvoiceStatus, Receipt, PaymentMethod } from "@/lib/finance-types";
import { useUpdateFeeNote } from "@/hooks/use-financials-new";
import { useAuth } from "@/hooks/use-auth";
import { useClientsForSelect } from "@/hooks/use-financial-transactions";
import { format, parseISO } from "date-fns";
import { pt as dateFnsPt, enUS } from "date-fns/locale";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";
import { IncomeHistory } from "./income-history";

export function InvoiceDetails({
  invoice,
  open,
  onOpenChange,
  onEdit,
}: {
  invoice: FeeNote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (invoice: FeeNote) => void;
}) {
  const { t, language, dateFormat } = useI18n();
  const { profile } = useAuth();
  const locale = language === "en" ? enUS : dateFnsPt;
   const updateMutation = useUpdateFeeNote();
   const { data: clients } = useClientsForSelect();

   const getPaymentMethodLabel = (method: string) => t(`finance.paymentMethods.${method}`, { defaultValue: method });

   const subtotal = (invoice?.services || []).reduce((acc, it) => acc + (it.total || 0), 0);
  const total = subtotal + (invoice?.tax || 0);
  const paidAmount = Number(invoice?.paid_amount ?? 0);
  const balance = Number(invoice?.balance ?? 0);

  const { data: receipts = [] } = useQuery({
    queryKey: ["receipts", profile?.company_id, invoice?.id],
    enabled: !!profile?.company_id && !!invoice?.id,
    queryFn: async () => {
      if (!invoice?.id) return [] as Receipt[];

      const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .eq("fee_note_id", invoice.id)
        .eq("company_id", profile!.company_id)
        .order("created_at", { ascending: false });

      if (error && !/PGRST205|Could not find the table/.test(error.message || "")) throw error;
      return (data ?? []) as Receipt[];
    },
  });

  const getStatusBadge = (s: FeeNoteStatus | InvoiceStatus | string) => {
    const styles: Record<string, string> = {
      pendente: "bg-muted text-muted-foreground",
      parcial: "bg-info/10 text-info",
      pago: "bg-success text-success-foreground",
      cancelado: "bg-destructive text-destructive-foreground",
      rascunho: "bg-muted text-muted-foreground",
      enviado: "bg-info/10 text-info",
      aceite: "bg-success text-success-foreground",
      recusado: "bg-destructive text-destructive-foreground",
      expirado: "bg-warning text-warning-foreground",
      arquivado: "bg-muted text-muted-foreground",
    };
    const labels: Record<string, string> = {
      pendente: t("status.pending", { defaultValue: "Pendente" }),
      parcial: t("status.partiallyPaid", { defaultValue: "Parcial" }),
      pago: t("status.paid", { defaultValue: "Pago" }),
      cancelado: t("status.cancelled", { defaultValue: "Cancelado" }),
      rascunho: t("status.draft", { defaultValue: "Rascunho" }),
      enviado: t("status.sent", { defaultValue: "Enviado" }),
      aceite: t("status.accepted", { defaultValue: "Aceite" }),
      recusado: t("status.rejected", { defaultValue: "Recusado" }),
      expirado: t("status.expired", { defaultValue: "Expirado" }),
      arquivado: t("finance.budgets.empty.title", { defaultValue: "Arquivado" }),
    };
    return <Badge className={cn("text-[10px]", styles[s] || "bg-muted text-muted-foreground")}>{labels[s] || s}</Badge>;
  };

  if (!invoice) return null;

  const handleMarkAsPaid = async () => {
    if (!invoice.id) return;
    try {
      await updateMutation.mutateAsync({
        id: invoice.id,
        updates: {
          status: "pago",
          paid_amount: total,
          balance: 0,
        },
      });
      toast.success("Fatura marcada como paga.");
    } catch {
      // handled
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("finance.invoiceDetails.title", { defaultValue: "Detalhes da Fatura" })} - {invoice.numero}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusBadge(invoice.status as FeeNoteStatus | InvoiceStatus)}
            </div>
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => onEdit(invoice)}>
                  <Pencil className="h-3.5 w-3.5" /> {t("edit", { defaultValue: "Editar" })}
                </Button>
              )}
              {balance > 0 && (
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={handleMarkAsPaid} disabled={updateMutation.isPending}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> {t("finance.invoiceDetails.markAsPaid", { defaultValue: "Marcar como Paga" })}
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5" /> {t("finance.invoiceDetails.print", { defaultValue: "Imprimir" })}
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => toast.info("Download do PDF iniciado.")}>
                <Download className="h-3.5 w-3.5" /> {t("finance.downloadPDF", { defaultValue: "Baixar PDF" })}
              </Button>
            </div>
          </div>

          <Card className="p-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[10px] text-muted-foreground">{t("client", { defaultValue: "Cliente" })}</p>
                 <p className="font-medium">{invoice.cliente_id ? (clients?.find((c) => c.id === invoice.cliente_id)?.name || "—") : "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">{t("number", { defaultValue: "Número" })}</p>
                <p className="font-medium">{invoice.numero || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">{t("date", { defaultValue: "Data" })}</p>
                <p className="font-medium">{invoice.issue_date ? format(parseISO(invoice.issue_date), dateFormat, { locale }) : "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">{t("dueDate", { defaultValue: "Vencimento" })}</p>
                <p className="font-medium">{invoice.due_date ? format(parseISO(invoice.due_date), dateFormat, { locale }) : "—"}</p>
              </div>
            </div>

            {invoice.observations && (
              <div className="mt-3">
                <p className="text-[10px] text-muted-foreground">{t("notes", { defaultValue: "Observações" })}</p>
                <p className="whitespace-pre-wrap text-xs">{invoice.observations}</p>
              </div>
            )}
          </Card>

          <div>
            <p className="text-[10px] text-muted-foreground mb-1">{t("finance.feeNotes.services", { defaultValue: "Serviços" })}</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("description", { defaultValue: "Descrição" })}</TableHead>
                  <TableHead>{t("quantity", { defaultValue: "Qtd" })}</TableHead>
                  <TableHead>{t("unitValue", { defaultValue: "Valor Unit." })}</TableHead>
                  <TableHead className="text-right">{t("total", { defaultValue: "Total" })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoice.services || []).map((it: any, idx: number) => (
                  <TableRow key={it.id || idx}>
                    <TableCell className="text-xs">{it.description}</TableCell>
                    <TableCell className="text-xs">{it.quantity}</TableCell>
                    <TableCell className="text-xs">{new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(it.unit_value)}</TableCell>
                    <TableCell className="text-xs text-right">{new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(it.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t("subtotal", { defaultValue: "Subtotal" })}</span>
              <span>{new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(subtotal)}</span>
            </div>
            {invoice.tax ? (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t("finance.feeNotes.services", { defaultValue: "Serviços" })} (Taxa)</span>
                <span>{new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(invoice.tax)}</span>
              </div>
            ) : null}
            <Separator />
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>{t("amount", { defaultValue: "Total" })}</span>
              <span>{new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(total)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t("balance", { defaultValue: "Saldo" })}</span>
              <span>{new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(balance)}</span>
            </div>
          </Card>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold">{t("finance.incomeHistory.title", { defaultValue: "Histórico de Recebimentos" })}</h4>
            <IncomeHistory feeNoteId={invoice.id} />
          </div>

          {receipts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold">{t("finance.receipts.title", { defaultValue: "Recibos" })}</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("finance.number", { defaultValue: "Número" })}</TableHead>
                    <TableHead>{t("date", { defaultValue: "Data" })}</TableHead>
                    <TableHead>{t("amount", { defaultValue: "Valor" })}</TableHead>
                    <TableHead>{t("finance.paymentMethods.method", { defaultValue: "Forma de pagamento" })}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{r.receipt_number}</TableCell>
                      <TableCell className="text-xs">{r.receipt_date ? format(parseISO(r.receipt_date), dateFormat, { locale }) : "—"}</TableCell>
                      <TableCell className="text-xs">{new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(r.amount)}</TableCell>
                       <TableCell className="text-xs">{getPaymentMethodLabel(r.payment_method)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
