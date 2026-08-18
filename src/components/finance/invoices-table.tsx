import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Eye, Download, Send, X } from "lucide-react";
import { toast } from "sonner";
import type { Invoice, InvoiceStatus, PaymentMethod } from "@/lib/finance-types";
import { useCreateInvoice, useUpdateInvoice } from "@/hooks/use-financials-new";
import { useAuth } from "@/hooks/use-auth";
import { useClientsForSelect } from "@/hooks/use-financial-transactions";
import { useProcessesForClient } from "@/hooks/use-financial-transactions";
import { format, parseISO } from "date-fns";
import { pt as dateFnsPt, enUS } from "date-fns/locale";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

type ServiceItem = { description: string; quantity: number; unit_value: number; total: number };

const STATUS_OPTIONS: { value: InvoiceStatus; labelKey: string }[] = [
  { value: "pendente", labelKey: "status.pending" },
  { value: "parcial", labelKey: "status.partiallyPaid" },
  { value: "pago", labelKey: "status.paid" },
  { value: "cancelado", labelKey: "status.cancelled" },
];

export function InvoicesTable({ companyId, onRegisterPayment, onOpenReceipt }: { companyId?: string | null; onRegisterPayment?: (invoice: Invoice) => void; onOpenReceipt?: (invoice: Invoice) => void }) {
  const { t, language, dateFormat } = useI18n();
  const { profile } = useAuth();
  const locale = language === "en" ? enUS : dateFnsPt;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Invoice | null>(null);

  const [clientId, setClientId] = useState("");
  const [processoId, setProcessoId] = useState("");
  const [feeNoteId, setFeeNoteId] = useState("");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [status, setStatus] = useState<InvoiceStatus>("pendente");
  const [observations, setObservations] = useState("");
  const [items, setItems] = useState<ServiceItem[]>([
    { description: "", quantity: 1, unit_value: 0, total: 0 },
  ]);

  const { data: clients } = useClientsForSelect();
  const { data: processes } = useProcessesForClient(clientId || null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_notes")
        .select("*")
        .eq("company_id", companyId)
        .eq("document_type", "invoice")
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return data as FeeNote[];
    },
  });

  const createMutation = useCreateInvoice();
  const updateMutation = useUpdateInvoice();

  const { data: feeNotes = [] } = useQuery({
    queryKey: ["fee-notes", companyId, clientId],
    enabled: !!companyId && !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_notes")
        .select("*")
        .eq("company_id", companyId)
        .eq("cliente_id", clientId)
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return data as FeeNote[];
    },
  });

  const resetForm = () => {
    setEditing(null);
    setClientId("");
    setProcessoId("");
    setFeeNoteId("");
    setDueDate("");
    setStatus("pendente");
    setObservations("");
    setItems([{ description: "", quantity: 1, unit_value: 0, total: 0, position: 0 }]);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (invoice: Invoice) => {
    setEditing(invoice);
    setClientId(invoice.cliente_id || "");
    setProcessoId(invoice.processo_id || "");
    setFeeNoteId(invoice.fee_note_id || "");
    setDueDate(invoice.due_date || "");
    setStatus(invoice.status || "pendente");
    setObservations(invoice.observations || "");
    setItems(
      (invoice.services || []).map((it: any, idx: number) => ({
        id: it.id,
        description: it.description,
        quantity: it.quantity,
        unit_value: it.unit_value,
        total: it.total,
        position: it.position ?? idx,
      })) || [{ description: "", quantity: 1, unit_value: 0, total: 0 }],
    );
    setOpen(true);
  };

  const loadFromFeeNote = () => {
    const note = feeNotes.find((n) => n.id === feeNoteId);
    if (!note) return;
    setItems(
      (note.services || []).map((it: any, idx: number) => ({
        id: it.id,
        description: it.description,
        quantity: it.quantity,
        unit_value: it.unit_value,
        total: it.total,
        position: it.position ?? idx,
      })),
    );
    setProcessoId(note.processo_id || "");
  };

  const addItem = () => setItems((prev) => [...prev, { description: "", quantity: 1, unit_value: 0, total: 0 }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, patch: Partial<ServiceItem>) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      if ("quantity" in patch || "unit_value" in patch) {
        next[idx].total = Number(next[idx].quantity || 0) * Number(next[idx].unit_value || 0);
      }
      return next;
    });
  };

  const subtotal = items.reduce((acc, it) => acc + (it.total || 0), 0);
  const total = subtotal + 0;
  const moneyPaid = Number(editing?.paid_amount ?? 0);
  const balance = Number(editing?.balance ?? 0);

  const handleSave = async () => {
    if (!companyId || !profile?.id) return;
    const validItems = items.filter((it) => it.description.trim() !== "" && it.total > 0);
    if (!validItems.length) {
      toast.error("Adicione pelo menos um item.");
      return;
    }

    const payload = {
      company_id: companyId,
      cliente_id: clientId || null,
      processo_id: processoId || null,
      fee_note_id: feeNoteId || null,
      due_date: dueDate || null,
      status,
      observations: observations || null,
      services: validItems.map((it, idx) => ({
        description: it.description,
        quantity: it.quantity,
        unit_value: it.unit_value,
        total: it.total,
        position: it.position ?? idx,
      })),
      subtotal,
      tax: 0,
      total,
      paid_amount: moneyPaid,
      balance,
      created_by: profile.id,
    };

    try {
      if (editing?.id) {
        await updateMutation.mutateAsync({ id: editing.id, updates: payload });
        toast.success("Fatura atualizada.");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Fatura criada.");
      }
      setOpen(false);
      resetForm();
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusBadge = (s: InvoiceStatus) => {
    const styles: Record<InvoiceStatus, string> = {
      pendente: "bg-muted text-muted-foreground",
      parcial: "bg-info/10 text-info",
      pago: "bg-success text-success-foreground",
      cancelado: "bg-destructive text-destructive-foreground",
    };
    const labels: Record<InvoiceStatus, string> = {
      pendente: t("status.pending", { defaultValue: "Pendente" }),
      parcial: t("status.partiallyPaid", { defaultValue: "Parcial" }),
      pago: t("status.paid", { defaultValue: "Pago" }),
      cancelado: t("status.cancelled", { defaultValue: "Cancelado" }),
    };
    return <Badge className={cn("text-[10px]", styles[s])}>{labels[s]}</Badge>;
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
          <h3 className="text-sm font-semibold">{t("finance.invoices.title", { defaultValue: "Faturas" })}</h3>
          <p className="text-xs text-muted-foreground">{t("finance.invoices.subtitle", { defaultValue: "Faturas emitidas e respetivo estado." })}</p>
        </div>
        <Button size="sm" className="h-9 gap-1.5" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> {t("finance.invoices.create", { defaultValue: "Criar Fatura" })}
        </Button>
      </div>

      {invoices.length === 0 ? (
        <Card className="p-10 text-center text-xs text-muted-foreground">{t("finance.invoices.empty", { defaultValue: "Sem faturas." })}</Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("finance.number", { defaultValue: "Número" })}</TableHead>
                <TableHead>{t("client", { defaultValue: "Cliente" })}</TableHead>
                <TableHead>{t("amount", { defaultValue: "Total" })}</TableHead>
                <TableHead>{t("balance", { defaultValue: "Saldo" })}</TableHead>
                <TableHead>{t("status", { defaultValue: "Status" })}</TableHead>
                <TableHead>{t("date", { defaultValue: "Data" })}</TableHead>
                <TableHead className="text-right">{t("actions", { defaultValue: "Ações" })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.numero}</TableCell>
                   <TableCell>{inv.cliente_id ? (clients?.find((c) => c.id === inv.cliente_id)?.name || "—") : "—"}</TableCell>
                  <TableCell>{new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(inv.total || 0)}</TableCell>
                   <TableCell>{new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(inv.balance ?? 0)}</TableCell>
                  <TableCell>{getStatusBadge(inv.status as InvoiceStatus)}</TableCell>
                  <TableCell>{inv.issue_date ? format(parseISO(inv.issue_date), dateFormat, { locale }) : "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewing(inv)} title={t("view", { defaultValue: "Visualizar" })}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(inv)} title={t("edit", { defaultValue: "Editar" })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                       {(inv.balance ?? 0) > 0 && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onRegisterPayment && onRegisterPayment(inv)} title={t("finance.income.register", { defaultValue: "Registar Recebimento" })}>
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onOpenReceipt && onOpenReceipt(inv)} title={t("finance.receipts.title", { defaultValue: "Recibos" })}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setConfirmDelete(inv.id!)} title={t("delete", { defaultValue: "Eliminar" })}>
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

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? t("edit", { defaultValue: "Editar" }) : t("finance.invoices.create", { defaultValue: "Criar Fatura" })}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("client", { defaultValue: "Cliente" })}</Label>
                <Select value={clientId} onValueChange={(v) => { setClientId(v); setProcessoId(""); setFeeNoteId(""); }}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder={t("selectClient", { defaultValue: "Selecionar cliente" })} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("process", { defaultValue: "Processo" })}</Label>
                <Select value={processoId} onValueChange={setProcessoId} disabled={!clientId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder={t("selectProcess", { defaultValue: "Selecionar processo" })} />
                  </SelectTrigger>
                  <SelectContent>
                    {processes?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.numero}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("finance.feeNotes.title", { defaultValue: "Nota de Honorários" })}</Label>
                <Select value={feeNoteId} onValueChange={(v) => { setFeeNoteId(v); loadFromFeeNote(); }} disabled={!clientId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder={t("selectFeeNote", { defaultValue: "Selecionar orçamento" })} />
                  </SelectTrigger>
                  <SelectContent>
                    {feeNotes.map((n) => (
                      <SelectItem key={n.id} value={n.id!}>{n.numero}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("dueDate", { defaultValue: "Vencimento" })}</Label>
                <DateInput
                  value={dueDate}
                  onChange={(v) => setDueDate(v)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("status", { defaultValue: "Status" })}</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as InvoiceStatus)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (<SelectItem key={s.value} value={s.value}>{t(s.labelKey, { defaultValue: s.value })}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("observations", { defaultValue: "Observações" })}</Label>
              <Textarea value={observations} onChange={(e) => setObservations(e.target.value)} className="text-xs" rows={2} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>{t("finance.invoices.items", { defaultValue: "Itens" })}</Label>
                <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={addItem}>
                  <Plus className="h-3.5 w-3.5" /> {t("add", { defaultValue: "Adicionar" })}
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 md:col-span-5 space-y-1">
                      <Label className="text-[10px] text-muted-foreground">{t("description", { defaultValue: "Descrição" })}</Label>
                      <Input className="h-8 text-xs" value={item.description} onChange={(e) => updateItem(idx, { description: e.target.value })} />
                    </div>
                    <div className="col-span-4 md:col-span-2 space-y-1">
                      <Label className="text-[10px] text-muted-foreground">{t("quantity", { defaultValue: "Qtd" })}</Label>
                      <Input type="number" className="h-8 text-xs" value={item.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-4 md:col-span-2 space-y-1">
                      <Label className="text-[10px] text-muted-foreground">{t("unitValue", { defaultValue: "Valor Unit." })}</Label>
                      <Input type="number" className="h-8 text-xs" value={item.unit_value} onChange={(e) => updateItem(idx, { unit_value: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-3 md:col-span-2 space-y-1">
                      <Label className="text-[10px] text-muted-foreground">{t("total", { defaultValue: "Total" })}</Label>
                      <Input className="h-8 text-xs bg-muted" value={new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(item.total)} readOnly />
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
                <span>{t("subtotal", { defaultValue: "Total" })}</span>
                <span>{new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(total)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>{t("cancel", { defaultValue: "Cancelar" })}</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              {t("save", { defaultValue: "Guardar" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("view", { defaultValue: "Visualizar" })} - {viewing?.numero}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("client", { defaultValue: "Cliente" })}</p>
                  <p className="font-medium">{viewing.cliente_id ? clients?.find((c) => c.id === viewing.cliente_id)?.name || "—" : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("status", { defaultValue: "Status" })}</p>
                  {getStatusBadge(viewing.status as InvoiceStatus)}
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("amount", { defaultValue: "Total" })}</p>
                  <p className="font-medium">{new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(viewing.total || 0)}</p>
                </div>
                 <div>
                   <p className="text-[10px] text-muted-foreground">{t("balance", { defaultValue: "Saldo" })}</p>
                   <p className="font-medium">{new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(viewing.balance ?? 0)}</p>
                 </div>
              </div>
              {viewing.observations && (
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("observations", { defaultValue: "Observações" })}</p>
                  <p className="whitespace-pre-wrap">{viewing.observations}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">{t("finance.invoices.items", { defaultValue: "Itens" })}</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("description", { defaultValue: "Descrição" })}</TableHead>
                      <TableHead>{t("quantity", { defaultValue: "Qtd" })}</TableHead>
                      <TableHead>{t("unitValue", { defaultValue: "Valor Unit." })}</TableHead>
                      <TableHead>{t("total", { defaultValue: "Total" })}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(viewing.services || []).map((it: any, idx: number) => (
                      <TableRow key={it.id || idx}>
                        <TableCell>{it.description}</TableCell>
                        <TableCell>{it.quantity}</TableCell>
                        <TableCell>{new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(it.unit_value)}</TableCell>
                        <TableCell>{new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(it.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
