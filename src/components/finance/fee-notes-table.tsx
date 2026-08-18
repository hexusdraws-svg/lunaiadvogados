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
import { Plus, Pencil, Trash2, Copy, Eye, Download, Send, Check, X } from "lucide-react";
import { toast } from "sonner";
import type { FeeNote, FeeNoteStatus } from "@/lib/finance-types";

type ServiceItem = { description: string; quantity: number; unit_value: number; total: number };
import { useCreateFeeNote, useUpdateFeeNote, useDeleteFeeNote, useDuplicateFeeNote } from "@/hooks/use-financials-new";
import { useAuth } from "@/hooks/use-auth";
import { useClientsForSelect } from "@/hooks/use-financial-transactions";
import { useProcessesForClient } from "@/hooks/use-financial-transactions";
import { format, parseISO } from "date-fns";
import { pt as dateFnsPt, enUS } from "date-fns/locale";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: FeeNoteStatus; labelKey: string }[] = [
  { value: "rascunho", labelKey: "status.draft" },
  { value: "enviado", labelKey: "status.sent" },
  { value: "aceite", labelKey: "status.accepted" },
  { value: "recusado", labelKey: "status.rejected" },
  { value: "expirado", labelKey: "status.expired" },
];

function EmptyState({ onCreate }: { onCreate: () => void }) {
  const { t } = useI18n();
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center">
      <p className="text-sm font-medium text-foreground">{t("finance.feeNotes.empty.title", { defaultValue: "Sem notas de honorários" })}</p>
      <p className="text-xs text-muted-foreground">{t("finance.feeNotes.empty.description", { defaultValue: "Crie um orçamento para enviar ao cliente." })}</p>
      <Button size="sm" className="mt-1 gap-1.5" onClick={onCreate}>
        <Plus className="h-4 w-4" /> {t("finance.feeNotes.create", { defaultValue: "Criar Orçamento" })}
      </Button>
    </Card>
  );
}

export function FeeNotesTable({ companyId, onOpenInvoice }: { companyId?: string | null; onOpenInvoice?: (invoiceId: string) => void }) {
  const { t, language, dateFormat } = useI18n();
  const { profile } = useAuth();
  const locale = language === "en" ? enUS : dateFnsPt;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FeeNote | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [viewing, setViewing] = useState<FeeNote | null>(null);

  const [clientId, setClientId] = useState("");
  const [processoId, setProcessoId] = useState("");
  const [validUntil, setValidUntil] = useState<string | null>(null);
  const [status, setStatus] = useState<FeeNoteStatus>("rascunho");
  const [observations, setObservations] = useState("");
  const [items, setItems] = useState<ServiceItem[]>([
    { description: "", quantity: 1, unit_value: 0, total: 0 },
  ]);

  const { data: clients } = useClientsForSelect();
  const { data: processes } = useProcessesForClient(clientId || null);

  const { data: feeNotes = [], isLoading } = useQuery({
    queryKey: ["fee-notes", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_notes")
        .select("*")
        .eq("company_id", companyId)
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return data as FeeNote[];
    },
  });

  const createMutation = useCreateFeeNote();
  const updateMutation = useUpdateFeeNote();
  const deleteMutation = useDeleteFeeNote();
  const duplicateMutation = useDuplicateFeeNote();

  const resetForm = () => {
    setEditing(null);
    setClientId("");
    setProcessoId("");
    setValidUntil("");
    setStatus("rascunho");
    setObservations("");
    setItems([{ description: "", quantity: 1, unit_value: 0, total: 0, position: 0 }]);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (note: FeeNote) => {
    setEditing(note);
    setClientId(note.cliente_id || "");
    setProcessoId(note.processo_id || "");
    setValidUntil(note.valid_until || "");
    setStatus(note.status || "rascunho");
    setObservations(note.observations || "");
    setItems(
      (note.services || []).map((it: any, idx: number) => ({
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
      valid_until: validUntil || null,
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
      created_by: profile.id,
    };

    try {
      if (editing?.id) {
        await updateMutation.mutateAsync({ id: editing.id, updates: payload });
        toast.success("Orçamento atualizado.");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Orçamento criado.");
      }
      setOpen(false);
      resetForm();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete);
      toast.success("Orçamento eliminado.");
    } catch {
      // handled
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateMutation.mutateAsync(id);
      toast.success("Orçamento duplicado.");
    } catch {
      // handled
    }
  };

  const handleConvertToInvoice = (note: FeeNote) => {
    if (!note.id) return;
    if (onOpenInvoice) onOpenInvoice(note.id);
  };

  const getStatusBadge = (status: FeeNoteStatus) => {
    const styles: Record<FeeNoteStatus, string> = {
      rascunho: "bg-muted text-muted-foreground",
      enviado: "bg-info/10 text-info",
      aceite: "bg-success text-success-foreground",
      recusado: "bg-destructive text-destructive-foreground",
      expirado: "bg-warning text-warning-foreground",
    };
    const labels: Record<FeeNoteStatus, string> = {
      rascunho: t("status.draft", { defaultValue: "Rascunho" }),
      enviado: t("status.sent", { defaultValue: "Enviado" }),
      aceite: t("status.accepted", { defaultValue: "Aceite" }),
      recusado: t("status.rejected", { defaultValue: "Recusado" }),
      expirado: t("status.expired", { defaultValue: "Expirado" }),
    };
    return <Badge className={cn("text-[10px]", styles[status])}>{labels[status]}</Badge>;
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
          <h3 className="text-sm font-semibold">{t("finance.feeNotes.title", { defaultValue: "Notas de Honorários" })}</h3>
          <p className="text-xs text-muted-foreground">{t("finance.feeNotes.subtitle", { defaultValue: "Gerencie orçamentos e propostas." })}</p>
        </div>
        <Button size="sm" className="h-9 gap-1.5" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> {t("finance.feeNotes.create", { defaultValue: "Criar Orçamento" })}
        </Button>
      </div>

      {feeNotes.length === 0 ? (
        <EmptyState onCreate={openCreate} />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("finance.number", { defaultValue: "Número" })}</TableHead>
                <TableHead>{t("client", { defaultValue: "Cliente" })}</TableHead>
                <TableHead>{t("process", { defaultValue: "Processo" })}</TableHead>
                <TableHead>{t("date", { defaultValue: "Data" })}</TableHead>
                <TableHead>{t("validUntil", { defaultValue: "Validade" })}</TableHead>
                <TableHead>{t("amount", { defaultValue: "Total" })}</TableHead>
                <TableHead>{t("status", { defaultValue: "Status" })}</TableHead>
                <TableHead className="text-right">{t("actions", { defaultValue: "Ações" })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feeNotes.map((note) => (
                <TableRow key={note.id}>
                  <TableCell className="font-medium">{note.numero}</TableCell>
                   <TableCell>{note.cliente_id ? (clients?.find((c) => c.id === note.cliente_id)?.name || "—") : "—"}</TableCell>
                  <TableCell>{note.processo_id ? note.processo_id.slice(0, 8) : "—"}</TableCell>
                  <TableCell>{note.issue_date ? format(parseISO(note.issue_date), dateFormat, { locale }) : "—"}</TableCell>
                  <TableCell>{note.valid_until ? format(parseISO(note.valid_until), dateFormat, { locale }) : "—"}</TableCell>
                  <TableCell>{new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(note.total || 0)}</TableCell>
                  <TableCell>{getStatusBadge(note.status as FeeNoteStatus)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewing(note)} title={t("view", { defaultValue: "Visualizar" })}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(note)} title={t("edit", { defaultValue: "Editar" })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDuplicate(note.id!)} title={t("duplicate", { defaultValue: "Duplicar" })}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleConvertToInvoice(note)} title={t("finance.invoices.convert", { defaultValue: "Converter em Fatura" })}>
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setConfirmDelete(note.id!)} title={t("delete", { defaultValue: "Eliminar" })}>
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
            <DialogTitle>{editing ? t("edit", { defaultValue: "Editar" }) : t("finance.feeNotes.create", { defaultValue: "Criar Orçamento" })}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("client", { defaultValue: "Cliente" })}</Label>
                <Select value={clientId} onValueChange={setClientId}>
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
                <Label>{t("validUntil", { defaultValue: "Validade" })}</Label>
                <DateInput
                  value={validUntil}
                  onChange={(v) => setValidUntil(v)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("status", { defaultValue: "Status" })}</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as FeeNoteStatus)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{t(s.labelKey, { defaultValue: s.value })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("observations", { defaultValue: "Observações" })}</Label>
              <Textarea value={observations} onChange={(e) => setObservations(e.target.value)} className="text-xs" rows={2} placeholder={t("observationsPlaceholder", { defaultValue: "Observações adicionais..." })} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>{t("finance.feeNotes.services", { defaultValue: "Serviços" })}</Label>
                <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={addItem}>
                  <Plus className="h-3.5 w-3.5" /> {t("add", { defaultValue: "Adicionar" })}
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 md:col-span-5 space-y-1">
                      <Label className="text-[10px] text-muted-foreground">{t("description", { defaultValue: "Descrição" })}</Label>
                       <Input className="h-8 text-xs" value={item.description} onChange={(e) => updateItem(idx, { description: e.target.value })} placeholder={t("description", { defaultValue: "Descrição" })} />
                    </div>
                    <div className="col-span-4 md:col-span-2 space-y-1">
                      <Label className="text-[10px] text-muted-foreground">{t("quantity", { defaultValue: "Qtd" })}</Label>
                       <Input type="number" className="h-8 text-xs" value={item.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} placeholder="1" />
                    </div>
                    <div className="col-span-4 md:col-span-2 space-y-1">
                      <Label className="text-[10px] text-muted-foreground">{t("unitValue", { defaultValue: "Valor Unit." })}</Label>
                       <Input type="number" className="h-8 text-xs" value={item.unit_value} onChange={(e) => updateItem(idx, { unit_value: Number(e.target.value) })} placeholder="0.00" />
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
                <span>{t("subtotal", { defaultValue: "Subtotal" })}</span>
                <span>{new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(subtotal)}</span>
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
                  <p className="text-[10px] text-muted-foreground">{t("process", { defaultValue: "Processo" })}</p>
                  <p className="font-medium">{viewing.processo_id || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("status", { defaultValue: "Status" })}</p>
                  {getStatusBadge(viewing.status as FeeNoteStatus)}
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("amount", { defaultValue: "Total" })}</p>
                  <p className="font-medium">{new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(viewing.total || 0)}</p>
                </div>
              </div>
              {viewing.observations && (
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("observations", { defaultValue: "Observações" })}</p>
                  <p className="whitespace-pre-wrap">{viewing.observations}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">{t("finance.feeNotes.services", { defaultValue: "Serviços" })}</p>
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

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("process.confirmDelete", { defaultValue: "Confirmar exclusão" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("process.confirmDelete", { defaultValue: "Confirmar exclusão" })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDelete(null)}>{t("cancel", { defaultValue: "Cancelar" })}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("delete", { defaultValue: "Eliminar" })}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
