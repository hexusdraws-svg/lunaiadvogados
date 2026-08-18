import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SuperAdminOnly } from "@/components/protected-route";
import { SuperAdminSidebar } from "@/components/super-admin-sidebar";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, TrendingUp, Calendar, DollarSign, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useI18n } from "@/hooks/use-i18n";
import { useCompanySubscriptions, useCreateSubscription, useUpdateSubscription } from "@/hooks/use-company-subscriptions";
import type { SubscriptionFrequency, SubscriptionStatus } from "@/hooks/use-company-subscriptions";

export const Route = createFileRoute("/super-admin/financeiro")({
  head: () => ({ meta: [{ title: "Super Admin · Financeiro" }] }),
  component: () => (
    <SuperAdminOnly>
      <FinanceiroPage />
    </SuperAdminOnly>
  ),
});

const FREQUENCY_LABEL: Record<SubscriptionFrequency, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
};

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  paid: "Pago",
  pending: "Pendente",
  cancelled: "Cancelado",
};

function FinanceiroPage() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | "all">("all");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [form, setForm] = useState({
    company_id: "",
    plan: "basic",
    amount: "",
    frequency: "monthly" as SubscriptionFrequency,
    payment_method: "",
    start_date: null as string | null,
    next_due_date: null as string | null,
    status: "pending" as SubscriptionStatus,
  });

  const paymentMethodOptions = useMemo(
    () => [
      { value: "transferencia", label: t("finance.paymentMethods.transfer", { defaultValue: "Transferência Bancária" }) },
      { value: "dinheiro", label: t("finance.paymentMethods.cash", { defaultValue: "Dinheiro" }) },
      { value: "cartao", label: t("finance.paymentMethods.card", { defaultValue: "Cartão" }) },
      { value: "cheque", label: t("finance.paymentMethods.check", { defaultValue: "Cheque" }) },
      { value: "mpesa", label: t("finance.paymentMethods.mpesa", { defaultValue: "M-Pesa" }) },
      { value: "emola", label: t("finance.paymentMethods.emola", { defaultValue: "E-Mola" }) },
      { value: "outro", label: t("finance.paymentMethods.other", { defaultValue: "Outro" }) },
    ],
    [t],
  );

  const getPaymentMethodLabel = (method: string) =>
    t(`finance.paymentMethods.${method}`, { defaultValue: method });

  const { data: empresas } = useQuery({
    queryKey: ["super-admin-companies-mini"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, nome").order("nome");
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string }[];
    },
  });

  const { data: subscriptions, isLoading } = useCompanySubscriptions({
    status: statusFilter === "all" ? undefined : statusFilter,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const createMutation = useCreateSubscription();
  const updateMutation = useUpdateSubscription();

  const resetForm = () => {
    setForm({
      company_id: "",
      plan: "basic",
      amount: "",
      frequency: "monthly",
      payment_method: "",
      start_date: null,
      next_due_date: null,
      status: "pending",
    });
    setEditId(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (sub: {
    id: string;
    company_id: string;
    plan: string;
    amount: number;
    frequency: SubscriptionFrequency;
    payment_method: string | null;
    start_date: string;
    next_due_date: string;
    status: SubscriptionStatus;
  }) => {
    setForm({
      company_id: sub.company_id,
      plan: sub.plan,
      amount: String(sub.amount),
      frequency: sub.frequency,
      payment_method: sub.payment_method ?? "",
      start_date: sub.start_date,
      next_due_date: sub.next_due_date,
      status: sub.status,
    });
    setEditId(sub.id);
    setOpen(true);
  };

  const submit = async () => {
    if (!form.company_id || !form.amount || !form.start_date || !form.next_due_date) {
      return toast.error("Preencha todos os campos obrigatórios.");
    }
    const payload = {
      company_id: form.company_id,
      plan: form.plan,
      amount: parseFloat(form.amount),
      frequency: form.frequency,
      payment_method: form.payment_method || null,
      start_date: form.start_date,
      next_due_date: form.next_due_date,
      status: form.status,
    };
    if (editId) {
      await updateMutation.mutateAsync({ id: editId, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setOpen(false);
    resetForm();
  };

  const monthlyTotal = (subscriptions ?? [])
    .filter((s) => s.status !== "cancelled")
    .reduce((sum, s) => {
      const mult =
        s.frequency === "monthly" ? 1 :
        s.frequency === "quarterly" ? 1 / 3 :
        s.frequency === "semiannual" ? 1 / 6 :
        1 / 12;
      return sum + Number(s.amount) * mult;
    }, 0);

  const annualTotal = monthlyTotal * 12;

  const predictedTotal = (subscriptions ?? [])
    .filter((s) => s.status !== "cancelled")
    .reduce((sum, s) => sum + Number(s.amount), 0);

  const overdueCount = (subscriptions ?? []).filter((s) => {
    if (s.status === "cancelled" || s.status === "paid") return false;
    return new Date(s.next_due_date) < new Date();
  }).length;

  const companyName = (id: string) => empresas?.find((e) => e.id === id)?.nome ?? "—";

  return (
    <div className="flex h-screen bg-background">
      <SuperAdminSidebar />
      <main className="flex-1 overflow-auto">
        <PageHeader title="Financeiro" subtitle="Assinaturas e receita das empresas" showSearch={false} />

        <div className="space-y-6 p-6 lg:p-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Receita Mensal Estimada</p>
              <p className="text-2xl font-bold">
                {monthlyTotal.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Receita Anual Estimada</p>
              <p className="text-2xl font-bold">
                {annualTotal.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Receita Prevista (próxima cobrança)</p>
              <p className="text-2xl font-bold">
                {predictedTotal.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Inadimplentes</p>
              <p className="text-2xl font-bold text-destructive">{overdueCount}</p>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as SubscriptionStatus | "all")}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <DateInput
              value={startDate}
              onChange={(v) => setStartDate(v)}
              placeholder="Data inicial"
              className="h-9 w-auto"
            />
            <DateInput
              value={endDate}
              onChange={(v) => setEndDate(v)}
              placeholder="Data final"
              className="h-9 w-auto"
            />
            <Button onClick={() => setOpen(true)} className="ml-auto">
              <Plus className="mr-1 h-4 w-4" /> Nova Subscrição
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (subscriptions ?? []).length === 0 ? (
            <Card className="p-10 text-center">
              <p className="text-sm text-muted-foreground">Sem subscrições registadas.</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {(subscriptions ?? []).map((sub) => (
                <Card key={sub.id} className="p-4">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{companyName(sub.company_id)}</p>
                        <Badge>{sub.plan}</Badge>
                        <Badge variant={sub.status === "paid" ? "default" : sub.status === "pending" ? "secondary" : "destructive"}>
                          {STATUS_LABEL[sub.status]}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {sub.amount.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })} · {FREQUENCY_LABEL[sub.frequency]} · {sub.payment_method ? getPaymentMethodLabel(sub.payment_method) : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Início: {format(new Date(sub.start_date), "dd/MM/yyyy", { locale: pt })} · Próxima cobrança: {format(new Date(sub.next_due_date), "dd/MM/yyyy", { locale: pt })}
                        {sub.paid_at && ` · Pago em: ${format(new Date(sub.paid_at), "dd/MM/yyyy", { locale: pt })}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(sub)}>Editar</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Editar Subscrição" : "Nova Subscrição"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Empresa *</Label>
                <select
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                  value={form.company_id}
                  onChange={(e) => setForm({ ...form, company_id: e.target.value })}
                >
                  <option value="">Selecionar empresa</option>
                  {(empresas ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Plano *</Label>
                <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Básico</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor *</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Frequência *</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v as SubscriptionFrequency })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="semiannual">Semestral</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Forma de Pagamento</Label>
                <Select
                  value={form.payment_method}
                  onValueChange={(v) => setForm({ ...form, payment_method: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethodOptions.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Data Início *</Label>
                <DateInput
                  value={form.start_date}
                  onChange={(v) => setForm({ ...form, start_date: v })}
                  placeholder="DD/MM/AAAA"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Próxima Cobrança *</Label>
                <DateInput
                  value={form.next_due_date}
                  onChange={(v) => setForm({ ...form, next_due_date: v })}
                  placeholder="DD/MM/AAAA"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as SubscriptionStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={submit} disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
