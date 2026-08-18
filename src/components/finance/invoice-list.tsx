import { useState, useMemo, useEffect } from "react";
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
import { Plus, Pencil, Trash2, Eye, Download, Send, X, DollarSign, Wallet } from "lucide-react";
import type { FeeNote, InvoiceStatus } from "@/lib/finance-types";

type ServiceItem = { description: string; quantity: number; unit_value: number; total: number };
import { useCreateFeeNote, useUpdateFeeNote, useDeleteFeeNote, useCreateIncomeTransaction } from "@/hooks/use-financials-new";
import { useAuth } from "@/hooks/use-auth";
import { useClientsForSelect } from "@/hooks/use-financial-transactions";
import { useProcessesForClient } from "@/hooks/use-financial-transactions";
import { useFinancialPermissions } from "@/hooks/use-financial-permissions";

const STATUS_OPTIONS: { value: InvoiceStatus; labelKey: string; label: string }[] = [
  { value: "pendente", labelKey: "finance.invoices.statusPending", label: "Pendente" },
  { value: "parcial", labelKey: "finance.invoices.statusPartiallyPaid", label: "Parcial" },
  { value: "pago", labelKey: "finance.invoices.statusPaid", label: "Pago" },
  { value: "cancelado", labelKey: "finance.invoices.statusCancelled", label: "Cancelado" },
];

interface InvoiceListProps {
  companyId?: string | null;
  hideFilters?: boolean;
  statusFilter?: string;
  clientFilter?: string;
  responsibleFilter?: string;
  onRegisterPayment?: (invoice: any) => void;
  onOpenReceipt?: (invoice: any) => void;
  adminViewAll?: boolean;
}

export function InvoiceList({ companyId, hideFilters, statusFilter, clientFilter, responsibleFilter, onRegisterPayment, onOpenReceipt, adminViewAll = false }: InvoiceListProps) {
   const { t, language, dateFormat } = useI18n();
   const { data: companyPaymentMethods } = usePaymentMethods();
   const { profile } = useAuth();
   const { filterByCreatedBy } = useFinancialPermissions();
   const locale = language === "en" ? enUS : dateFnsPt;

   const { data: clients } = useClientsForSelect();
  const [clientId, setClientId] = useState("");
  const { data: processes } = useProcessesForClient(clientId);
  const [processoId, setProcessoId] = useState("");
  const [feeNoteId, setFeeNoteId] = useState("");
    const { data: feeNotes = [] } = useQuery({
      queryKey: ["fee-notes", companyId, profile?.id, profile?.role],
      enabled: !!companyId,
      queryFn: async () => {
        let query = supabase
          .from("fee_notes")
          .select("*")
          .eq("company_id", companyId)
          .order("issue_date", { ascending: false });
        if (!adminViewAll || profile?.role !== "admin") {
          query = query.eq("created_by", profile?.id);
        }
        const { data, error } = await query;
       if (error && !/PGRST205|Could not find the table/.test(error.message || "")) throw error;
       return (data ?? []) as FeeNote[];
     },
   });
  const [status, setStatus] = useState<InvoiceStatus>("pendente");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [observations, setObservations] = useState("");
  const [items, setItems] = useState<ServiceItem[]>([{ description: "", quantity: 1, unit_value: 0, total: 0 }]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [viewing, setViewing] = useState<any | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentPercent, setPaymentPercent] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("transferencia");
  const [paymentDate, setPaymentDate] = useState<string | null>(new Date().toISOString().split("T")[0]);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [usePercent, setUsePercent] = useState(false);

  const paymentMethodOptions = useMemo(() => {
    if (companyPaymentMethods && companyPaymentMethods.length > 0) {
      return companyPaymentMethods
        .filter((m) => m.is_active)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map((m) => ({ value: m.method_key, label: m.method_label }));
    }
    return [
      { value: "transferencia", label: t("finance.paymentMethods.transfer") },
      { value: "dinheiro", label: t("finance.paymentMethods.cash") },
      { value: "pos", label: t("finance.paymentMethods.card") },
      { value: "cheque", label: t("finance.paymentMethods.check") },
      { value: "mpesa", label: t("finance.paymentMethods.mpesa") },
      { value: "emola", label: t("finance.paymentMethods.emola") },
      { value: "banco", label: t("finance.paymentMethods.bank") },
      { value: "outro", label: t("finance.paymentMethods.other") },
    ];
  }, [companyPaymentMethods, t]);

  const [internalStatusFilter, setInternalStatusFilter] = useState<string>("");
  const [internalClientFilter, setInternalClientFilter] = useState<string>("");
  const [internalResponsibleFilter, setInternalResponsibleFilter] = useState<string>("all");

  const activeStatusFilter = hideFilters ? statusFilter || "" : internalStatusFilter;
  const activeClientFilter = hideFilters ? clientFilter || "" : internalClientFilter;
  const activeResponsibleFilter = hideFilters ? (responsibleFilter || "all") : internalResponsibleFilter;

    const { data: invoices = [], isLoading, error } = useQuery({
      queryKey: ["invoices", companyId, activeStatusFilter, activeClientFilter, activeResponsibleFilter, profile?.id, profile?.role],
      enabled: !!companyId,
      queryFn: async () => {
        let query = supabase
          .from("fee_notes")
          .select("id, company_id, cliente_id, processo_id, document_type, numero, issue_date, due_date, status, total, paid_amount, balance, created_by, created_at, updated_at, services, observations")
          .eq("company_id", companyId)
          .eq("document_type", "invoice")
          .order("issue_date", { ascending: false });

        if (!adminViewAll) {
          query = filterByCreatedBy(query, profile?.id);
        }

        if (activeStatusFilter) {
          query = query.eq("status", activeStatusFilter);
        }
        if (activeClientFilter) {
          query = query.eq("cliente_id", activeClientFilter);
        }
        if (activeResponsibleFilter && activeResponsibleFilter !== "all") {
          query = query.eq("created_by", activeResponsibleFilter);
        }

       const { data, error: queryError } = await query;
       if (queryError) {
         console.error("InvoiceList query error:", queryError);
         throw queryError;
       }
       return (data ?? []) as any[];
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

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesStatus = !activeStatusFilter || inv.status === activeStatusFilter;
      const matchesClient = !activeClientFilter || inv.cliente_id === activeClientFilter;
      const matchesResponsible = activeResponsibleFilter === "all" || inv.created_by === activeResponsibleFilter;
      return matchesStatus && matchesClient && matchesResponsible;
    });
  }, [invoices, activeStatusFilter, activeClientFilter, activeResponsibleFilter]);

  const createMutation = useCreateFeeNote();
  const updateMutation = useUpdateFeeNote();
  const deleteMutation = useDeleteFeeNote();
  const createIncomeMutation = useCreateIncomeTransaction();

    const { data: receipts = [] } = useQuery({
      queryKey: ["receipts", companyId],
      enabled: !!companyId,
      queryFn: async () => {
         let query = supabase
           .from("receipts")
           .select("id, fee_note_id, amount, receipt_date, payment_method, receipt_number, description")
           .eq("company_id", companyId)
           .order("created_at", { ascending: false });
         const { data, error } = await query;
        if (error) throw error;
        return (data ?? []) as any[];
      },
    });

   const getPaidAmount = (invoice: any) => Number(invoice.paid_amount ?? 0);
   const getBalanceDue = (invoice: any) => Number(invoice.balance ?? 0);

  const subtotal = useMemo(() => items.reduce((acc, it) => acc + (it.total || 0), 0), [items]);
  const total = subtotal + 0;

  const resetForm = () => {
    setEditing(null);
    setClientId("");
    setProcessoId("");
    setFeeNoteId("");
    setDueDate(null);
    setStatus("pendente");
    setObservations("");
    setItems([{ description: "", quantity: 1, unit_value: 0, total: 0, position: 0 }]);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (invoice: any) => {
    setEditing(invoice);
    setClientId(invoice.cliente_id || "");
    setProcessoId(invoice.processo_id || "");
    setFeeNoteId(invoice.source_fee_note_id || "");
    setDueDate(invoice.due_date || null);
    setStatus(invoice.status);
    setObservations(invoice.observations || "");
    setItems(invoice.services?.length ? invoice.services : [{ description: "", quantity: 1, unit_value: 0, total: 0 }]);
    setOpen(true);
  };

  const loadFromFeeNote = async () => {
    if (!feeNoteId || !companyId) return;
    let note = feeNotes.find((n) => n.id === feeNoteId);
    if (!note) {
      const { data, error } = await supabase
        .from("fee_notes")
        .select("*")
        .eq("id", feeNoteId)
        .eq("company_id", companyId)
        .maybeSingle();
      if (error || !data) return;
      note = data as FeeNote;
    }
    setClientId(note.cliente_id || "");
    setProcessoId(note.processo_id || "");
    setItems(note.services?.length ? note.services : [{ description: "", quantity: 1, unit_value: 0, total: 0 }]);
  };

  useEffect(() => {
    if (feeNoteId && companyId) {
      loadFromFeeNote();
    }
  }, [feeNoteId, companyId]);

  const handleSave = async () => {
    if (!companyId || !profile?.id) return;
     const validItems = items.filter((it) => it.description.trim() !== "" && it.total > 0);
      if (!validItems.length) {
        toast.error(t("finance.invoices.addAtLeastOneItem"));
        return;
      }

    const payload = {
      company_id: companyId,
      cliente_id: clientId || null,
      processo_id: processoId || null,
      document_type: "invoice" as const,
      source_fee_note_id: feeNoteId || null,
      due_date: dueDate || null,
      status: status as InvoiceStatus,
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
         toast.success(t("finance.invoices.updated"));
       } else {
         await createMutation.mutateAsync(payload);
         toast.success(t("finance.invoices.created"));
       }
       setOpen(false);
       resetForm();
     } catch (e: any) {
       const msg = e?.message || "";
       if (msg.includes("PGRST204") || msg.includes("Could not find the 'cliente_id' column of 'fee_notes'")) {
         toast.error(t("finance.invoices.migrationRequired"));
         return;
       }
       console.error(e);
       toast.error(t("finance.invoices.saveError"));
     }
  };

  const addItem = () => setItems((prev) => [...prev, { description: "", quantity: 1, unit_value: 0, total: 0, position: prev.length }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, patch: Partial<ServiceItem>) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      if (patch.quantity !== undefined || patch.unit_value !== undefined) {
        next[idx].total = Number(next[idx].quantity || 0) * Number(next[idx].unit_value || 0);
      }
      return next;
    });
  };

   const handleDelete = async () => {
     if (!confirmDelete) return;
     try {
       await deleteMutation.mutateAsync(confirmDelete);
       toast.success(t("finance.invoices.deleted"));
     } catch {
       // handled
     } finally {
       setConfirmDelete(null);
     }
   };

     const openPayment = (invoice: any) => {
       setPaymentTarget(invoice);
       const remaining = Number(invoice.balance ?? 0);
       setPaymentAmount(String(remaining));
       setPaymentPercent("");
       setUsePercent(false);
       setPaymentMethod("transferencia");
       setPaymentDate(new Date().toISOString().split("T")[0]);
       setPaymentNotes("");
     };

   const handleRegisterPayment = async () => {
     if (!paymentTarget || !profile?.company_id) return;
     if (usePercent) {
       const pct = Number(paymentPercent);
       if (!pct || pct <= 0 || pct > 100) {
         toast.error(t("finance.invoices.validPercentage"));
         return;
       }
       const rawAmount = Number(((paymentTarget.total || 0) * pct) / 100);
       if (!rawAmount || rawAmount <= 0) {
         toast.error(t("finance.invoices.invalidCalculatedAmount"));
         return;
       }
        const payload = {
          company_id: profile.company_id,
          fee_note_id: paymentTarget.id || null,
          client_id: paymentTarget.cliente_id || null,
          client_name: paymentTarget.cliente_id ? (clients?.find((c) => c.id === paymentTarget.cliente_id)?.name || null) : null,
          process_id: paymentTarget.processo_id || null,
          amount: rawAmount,
          description: paymentTarget.numero ? `${t("finance.invoices.paymentFor")} ${Number(pct).toFixed(2).replace('.', ',')}% ${t("finance.invoices.ofInvoice")} ${paymentTarget.numero}` : t("finance.invoices.partialPayment"),
          payment_method: paymentMethod,
          payment_date: paymentDate || null,
          due_date: paymentTarget.due_date || null,
          transaction_type: "income",
        };
       try {
         await createIncomeMutation.mutateAsync(payload);
         setPaymentTarget(null);
         setPaymentAmount("");
         setPaymentPercent("");
         setUsePercent(false);
         setPaymentNotes("");
       } catch (err) {
         // handled by mutation onError
       }
       return;
     }

     const rawAmount = Number(paymentAmount);
     if (!rawAmount || rawAmount <= 0) {
       toast.error(t("finance.invoices.validAmount"));
       return;
     }

        const payload = {
          company_id: profile.company_id,
          fee_note_id: paymentTarget.id || null,
          client_id: paymentTarget.cliente_id || null,
          client_name: paymentTarget.cliente_id ? (clients?.find((c) => c.id === paymentTarget.cliente_id)?.name || null) : null,
          process_id: paymentTarget.processo_id || null,
          amount: rawAmount,
          description: paymentTarget.numero ? `${t("finance.invoices.paymentFor")} ${t("finance.invoices.invoice")} ${paymentTarget.numero}` : t("finance.invoices.partialPayment"),
          payment_method: paymentMethod,
          payment_date: paymentDate || null,
          due_date: paymentTarget.due_date || null,
          transaction_type: "income",
        };

    try {
      await createIncomeMutation.mutateAsync(payload);
      setPaymentTarget(null);
      setPaymentAmount("");
      setPaymentNotes("");
    } catch (err) {
      // handled by mutation onError
    }
  };

  const getStatusBadge = (s: string) => {
    const styles: Record<string, string> = {
      pendente: "bg-muted text-muted-foreground",
      parcial: "bg-info/10 text-info",
      pago: "bg-success text-success-foreground",
      cancelado: "bg-destructive text-destructive-foreground",
    };
    const label = STATUS_OPTIONS.find((o) => o.value === s)?.labelKey ? t(STATUS_OPTIONS.find((o) => o.value === s)!.labelKey as any, { defaultValue: s }) : s;
    return <Badge className={cn("text-[10px]", styles[s] || "bg-muted text-muted-foreground")}>{label}</Badge>;
  };

  return (
     <div className="space-y-4">
       <div className="flex items-center justify-between">
         <div>
           <h3 className="text-sm font-semibold">{t("finance.invoices.title")}</h3>
           <p className="text-xs text-muted-foreground">{t("finance.invoices.subtitle")}</p>
         </div>
         <Button size="sm" onClick={openCreate} className="h-8 gap-1 text-xs">
           <Plus className="h-3.5 w-3.5" /> {t("finance.invoices.create")}
         </Button>
       </div>

       {!hideFilters && (
         <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
           <div>
             <Label className="text-xs">{t("finance.invoices.status")}</Label>
             <Select value={internalStatusFilter} onValueChange={(v) => setInternalStatusFilter(v === "all" ? "" : v)}>
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
             <Label className="text-xs">{t("finance.invoices.client")}</Label>
             <Select value={internalClientFilter} onValueChange={(v) => setInternalClientFilter(v === "all" ? "" : v)}>
               <SelectTrigger className="h-9 text-xs">
                 <SelectValue placeholder={t("finance.filters.all")} />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">{t("finance.filters.all")}</SelectItem>
                 {clients?.map((c) => (
                   <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
           <div>
             <Label className="text-xs">{t("finance.invoices.responsible")}</Label>
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
       )}

       {isLoading ? (
         <Card className="p-10 text-center text-xs text-muted-foreground">{t("finance.invoices.loading")}</Card>
       ) : error ? (
         <Card className="p-4 text-xs text-destructive">{t("finance.invoices.error")}: {error instanceof Error ? error.message : "—"}</Card>
       ) : invoices.length === 0 ? (
         <Card className="p-10 text-center text-xs text-muted-foreground">{t("finance.invoices.empty")}</Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("finance.invoices.tableNumber")}</TableHead>
                <TableHead>{t("finance.invoices.client")}</TableHead>
                <TableHead>{t("finance.invoices.tableTotal")}</TableHead>
                <TableHead>{t("finance.invoices.tablePaidAmount")}</TableHead>
                <TableHead>{t("finance.invoices.tableBalanceDue")}</TableHead>
                <TableHead>{t("finance.invoices.status")}</TableHead>
                 <TableHead>{t("finance.invoices.tableDate")}</TableHead>
                <TableHead>{t("finance.responsible")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => {
                const paid = getPaidAmount(inv);
                const balance = getBalanceDue(inv);
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.numero}</TableCell>
                    <TableCell>{inv.cliente_id ? (clients?.find((c) => c.id === inv.cliente_id)?.name || "—") : "—"}</TableCell>
                    <TableCell>{new Intl.NumberFormat(language === "en" ? "en-US" : "pt-PT", { style: "currency", currency: "MZN" }).format(inv.total || 0)}</TableCell>
                    <TableCell>{new Intl.NumberFormat(language === "en" ? "en-US" : "pt-PT", { style: "currency", currency: "MZN" }).format(paid)}</TableCell>
                    <TableCell>
                      <span className={cn("text-xs font-medium", balance > 0 ? "text-destructive" : "text-emerald-600")}>
                        {new Intl.NumberFormat(language === "en" ? "en-US" : "pt-PT", { style: "currency", currency: "MZN" }).format(balance)}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(inv.status as InvoiceStatus)}</TableCell>
                     <TableCell>{inv.issue_date ? format(parseISO(inv.issue_date), dateFormat, { locale }) : "—"}</TableCell>
                    <TableCell className="text-xs">{inv.created_by ? (profileMap.get(inv.created_by) || "—") : "—"}</TableCell>
                     <TableCell className="text-right">
                       <div className="flex items-center justify-end gap-1">
                         <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewing(inv)} title={t("view")}>
                           <Eye className="h-4 w-4" />
                         </Button>
                         <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(inv)} title={t("edit")}>
                           <Pencil className="h-4 w-4" />
                         </Button>
                         <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openPayment(inv)} title={t("finance.invoices.registerPayment")}>
                           <DollarSign className="h-4 w-4" />
                         </Button>
                         <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onOpenReceipt && onOpenReceipt(inv)} title={t("finance.invoices.viewReceipts")}>
                           <Wallet className="h-4 w-4" />
                         </Button>
                         <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setConfirmDelete(inv.id!)} title={t("delete")}>
                           <Trash2 className="h-4 w-4" />
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? t("edit") : t("finance.invoices.create")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 max-h-[70vh] overflow-y-auto">
             <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
               <div className="space-y-1.5">
                 <Label className="text-xs font-medium">{t("finance.invoices.client")}</Label>
                 <Select value={clientId} onValueChange={(v) => { setClientId(v); setProcessoId(""); setFeeNoteId(""); }}>
                   <SelectTrigger className="h-9 text-xs">
                     <SelectValue placeholder={t("finance.invoices.selectClient")} />
                   </SelectTrigger>
                   <SelectContent>
                     {clients?.map((c) => (
                       <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-1.5">
                 <Label className="text-xs font-medium">{t("finance.invoices.clientProcess")}</Label>
                 <Select value={processoId} onValueChange={setProcessoId} disabled={!clientId}>
                   <SelectTrigger className="h-9 text-xs">
                     <SelectValue placeholder={t("finance.invoices.selectProcess")} />
                   </SelectTrigger>
                   <SelectContent>
                     {processes?.map((p) => (
                       <SelectItem key={p.id} value={p.id}>{p.numero} - {p.tipo}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-1.5">
                 <Label className="text-xs font-medium">{t("finance.invoices.feeNote")}</Label>
                 <Select value={feeNoteId} onValueChange={(v) => { setFeeNoteId(v); }} disabled={!companyId}>
                   <SelectTrigger className="h-9 text-xs">
                     <SelectValue placeholder={t("finance.invoices.selectFeeNote")} />
                   </SelectTrigger>
                   <SelectContent>
                     {feeNotes
                       .filter((n) => n.document_type === "budget")
                       .map((n) => {
                         const clientName = clients?.find((c) => c.id === n.cliente_id)?.name || "";
                         return (
                           <SelectItem key={n.id} value={n.id}>{n.numero} - {clientName} - {new Intl.NumberFormat(language === "en" ? "en-US" : "pt-PT", { style: "currency", currency: "MZN" }).format(n.total || 0)}</SelectItem>
                         );
                       })}
                   </SelectContent>
                 </Select>
               </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t("finance.invoices.dueDate")}</Label>
                  <DateInput value={dueDate} onChange={(v) => setDueDate(v)} className="h-9 text-xs" />
                </div>
               <div className="space-y-1.5">
                 <Label className="text-xs font-medium">{t("finance.invoices.status")}</Label>
                 <Select value={status} onValueChange={(v) => setStatus(v as InvoiceStatus)}>
                   <SelectTrigger className="h-9 text-xs">
                     <SelectValue placeholder={t("finance.invoices.selectStatus")} />
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
               <Label className="text-xs font-medium">{t("finance.invoices.observations")}</Label>
               <Textarea
                 value={observations}
                 onChange={(e) => setObservations(e.target.value)}
                 className="text-xs"
                 rows={2}
                 placeholder={t("finance.invoices.observationsPlaceholder")}
               />
             </div>

             <div>
               <div className="flex items-center justify-between mb-2">
                 <Label className="text-xs font-medium">{t("finance.invoices.items")}</Label>
                 <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={addItem}>
                   <Plus className="h-3.5 w-3.5" /> {t("finance.invoices.addItem")}
                 </Button>
               </div>
              <div className="space-y-2">
                 {items.map((item, idx) => (
                   <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                     <div className="col-span-12 md:col-span-5 space-y-1">
                       <Label className="text-[10px] text-muted-foreground">{t("finance.invoices.tableDescription")}</Label>
                       <Input className="h-8 text-xs" value={item.description} onChange={(e) => updateItem(idx, { description: e.target.value })} placeholder={t("finance.invoices.descriptionPlaceholder")} />
                     </div>
                     <div className="col-span-4 md:col-span-2 space-y-1">
                       <Label className="text-[10px] text-muted-foreground">{t("finance.invoices.tableQty")}</Label>
                       <Input type="number" className="h-8 text-xs" value={item.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} placeholder="1" />
                     </div>
                     <div className="col-span-4 md:col-span-2 space-y-1">
                       <Label className="text-[10px] text-muted-foreground">{t("finance.invoices.tableUnitValue")}</Label>
                       <Input type="number" className="h-8 text-xs" value={item.unit_value} onChange={(e) => updateItem(idx, { unit_value: Number(e.target.value) })} placeholder="0.00" />
                     </div>
                     <div className="col-span-3 md:col-span-2 space-y-1">
                       <Label className="text-[10px] text-muted-foreground">{t("finance.invoices.tableTotal")}</Label>
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
                 <span>{t("finance.invoices.subtotal")}</span>
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
            <DialogTitle>{t("view")} - {viewing?.numero}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("finance.invoices.client")}</p>
                  <p className="font-medium">{viewing.cliente_id ? clients?.find((c) => c.id === viewing.cliente_id)?.name || "—" : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("finance.invoices.status")}</p>
                  {getStatusBadge(viewing.status)}
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("amount")}</p>
                  <p className="font-medium">{new Intl.NumberFormat(language === "en" ? "en-US" : "pt-PT", { style: "currency", currency: "MZN" }).format(viewing.total || 0)}</p>
                </div>
                 <div>
                   <p className="text-[10px] text-muted-foreground">{t("finance.invoices.balance")}</p>
                   <p className="font-medium">{new Intl.NumberFormat(language === "en" ? "en-US" : "pt-PT", { style: "currency", currency: "MZN" }).format(viewing.balance ?? 0)}</p>
                 </div>
              </div>
              {viewing.observations && (
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("finance.invoices.observations")}</p>
                  <p className="whitespace-pre-wrap">{viewing.observations}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">{t("finance.invoices.items")}</p>
                <Table>
                   <TableHeader>
                    <TableRow>
                      <TableHead>{t("finance.invoices.tableDescription")}</TableHead>
                      <TableHead>{t("finance.invoices.tableQty")}</TableHead>
                      <TableHead>{t("finance.invoices.tableUnitValue")}</TableHead>
                      <TableHead>{t("finance.invoices.tableTotal")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(viewing.services || []).map((it: any, idx: number) => (
                      <TableRow key={it.id || idx}>
                        <TableCell>{it.description}</TableCell>
                        <TableCell>{it.quantity}</TableCell>
                       <TableCell>{new Intl.NumberFormat(language === "en" ? "en-US" : "pt-PT", { style: "currency", currency: "MZN" }).format(it.unit_value)}</TableCell>
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

       <Dialog open={!!paymentTarget} onOpenChange={(o) => !o && setPaymentTarget(null)}>
         <DialogContent className="max-w-2xl">
           <DialogHeader>
             <DialogTitle>{t("finance.invoices.registerPayment")} - {paymentTarget?.numero}</DialogTitle>
           </DialogHeader>
           {paymentTarget && (
             <div className="space-y-3 text-xs">
               <div className="grid grid-cols-2 gap-2">
                 <div>
                   <p className="text-[10px] text-muted-foreground">{t("finance.invoices.client")}</p>
                   <p className="font-medium">{paymentTarget.cliente_id ? clients?.find((c) => c.id === paymentTarget.cliente_id)?.name || "—" : "—"}</p>
                 </div>
                 <div>
                   <p className="text-[10px] text-muted-foreground">{t("amount")}</p>
                   <p className="font-medium">{new Intl.NumberFormat(language === "en" ? "en-US" : "pt-PT", { style: "currency", currency: "MZN" }).format(paymentTarget.total || 0)}</p>
                 </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t("finance.invoices.receivedAmount")}</p>
                    <p className="font-medium">{new Intl.NumberFormat(language === "en" ? "en-US" : "pt-PT", { style: "currency", currency: "MZN" }).format(paymentTarget.paid_amount ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t("finance.invoices.balance")}</p>
                    <p className="font-medium">{new Intl.NumberFormat(language === "en" ? "en-US" : "pt-PT", { style: "currency", currency: "MZN" }).format(paymentTarget.balance ?? 0)}</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 <div className="space-y-1.5">
                   <div className="flex items-center justify-between">
                     <Label className="text-xs font-medium">{t("finance.invoices.paymentAmount")}</Label>
                     <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                       <input type="checkbox" checked={usePercent} onChange={(e) => setUsePercent(e.target.checked)} />
                       {t("finance.invoices.usePercent")}
                     </label>
                   </div>
                   {usePercent ? (
                     <div className="flex items-center gap-1">
                       <Input type="number" className="h-9 text-xs" value={paymentPercent} onChange={(e) => setPaymentPercent(e.target.value)} placeholder="%" />
                       <span className="text-xs text-muted-foreground">% = {new Intl.NumberFormat(language === "en" ? "en-US" : "pt-PT", { style: "currency", currency: "MZN" }).format(((paymentTarget?.total || 0) * Number(paymentPercent || 0)) / 100)}</span>
                     </div>
                   ) : (
                     <Input type="number" className="h-9 text-xs" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" />
                   )}
                    <p className="text-[10px] text-muted-foreground">
                      {t("finance.invoices.available")}: {new Intl.NumberFormat(language === "en" ? "en-US" : "pt-PT", { style: "currency", currency: "MZN" }).format(paymentTarget.balance ?? 0)}
                    </p>
                 </div>
                 <div className="space-y-1.5">
                   <Label className="text-xs font-medium">{t("finance.invoices.paymentMethod")}</Label>
                   <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v)}>
                     <SelectTrigger className="h-9 text-xs">
                       <SelectValue />
                     </SelectTrigger>
                      <SelectContent>
                        {paymentMethodOptions.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                   </Select>
                 </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t("finance.invoices.paymentDate")}</Label>
                    <DateInput className="h-9 text-xs" value={paymentDate} onChange={(v) => setPaymentDate(v)} />
                  </div>
                 <div className="space-y-1.5">
                   <Label className="text-xs font-medium">{t("finance.invoices.notes")}</Label>
                   <Textarea className="text-xs" rows={2} value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder={t("finance.invoices.notesPlaceholder")} />
                 </div>
               </div>

               <div className="flex items-center justify-between text-xs font-medium">
                 <span>{t("finance.invoices.paymentValue")}</span>
                 <span>{new Intl.NumberFormat(language === "en" ? "en-US" : "pt-PT", { style: "currency", currency: "MZN" }).format(Number(paymentAmount) || 0)}</span>
               </div>
             </div>
           )}
           <DialogFooter>
             <Button variant="outline" onClick={() => setPaymentTarget(null)}>{t("cancel")}</Button>
             <Button onClick={handleRegisterPayment} disabled={createIncomeMutation.isPending}>
               {(createIncomeMutation.isPending) && <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
               {t("finance.invoices.registerPayment")}
             </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("finance.invoices.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("finance.invoices.confirmDeleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDelete(null)}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
