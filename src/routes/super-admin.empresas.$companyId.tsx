import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SuperAdminOnly } from "@/components/protected-route";
import { SuperAdminSidebar } from "@/components/super-admin-sidebar";
import { PageHeader } from "@/components/page-header";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ArrowLeft, Loader2, Save, BellRing, Ban, CheckCircle, Trash2, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useSupabaseErrorHandler } from "@/lib/supabase-error-handler";
import { updateCompanyType, deleteCompany } from "@/lib/company";
import {
  useCompanyLicenseAlerts,
  useCreateLicenseAlert,
  useToggleLicenseAlert,
} from "@/hooks/use-license-alerts";
import type { SuperAdminCompanySummary } from "@/hooks/use-super-admin-dashboard";

export const Route = createFileRoute("/super-admin/empresas/$companyId")({
  component: () => (
    <SuperAdminOnly>
      <CompanyDetailPage />
    </SuperAdminOnly>
  ),
});

type CompanyRow = {
  id: string;
  nome: string | null;
  status: "active" | "suspended" | "cancelled";
  company_type: "office" | "freelancer";
  nuit: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  pais: string | null;
  website: string | null;
  created_at: string;
  [key: string]: unknown;
};

function CompanyDetailPage() {
  const { companyId } = useParams({ from: "/super-admin/empresas/$companyId" });
  const queryClient = useQueryClient();
  const handleError = useSupabaseErrorHandler();

  const { data: company, isLoading } = useQuery({
    queryKey: ["super-admin-company", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").eq("id", companyId).maybeSingle();
      if (error) throw error;
      return data as CompanyRow | null;
    },
  });

  const { data: summary } = useQuery({
    queryKey: ["super-admin-company-summary", companyId],
    queryFn: async (): Promise<SuperAdminCompanySummary | null> => {
      const [profiles, clientes, processos, hearings] = await Promise.all([
        supabase.from("profiles").select("id, role, updated_at").eq("company_id", companyId),
        supabase.from("clientes").select("id", { count: "exact", head: true }).eq("company_id", companyId),
        supabase.from("processos").select("id", { count: "exact", head: true }).eq("company_id", companyId),
        supabase.from("hearings").select("id", { count: "exact", head: true }).eq("company_id", companyId),
      ]);
      const profs = (profiles.data ?? []).filter((p) => p.role !== "super_admin");
      const ultimoAcesso = profs.map((p) => p.updated_at as string | null).filter(Boolean).sort().reverse()[0] ?? null;
      return {
        id: companyId,
        nome: company?.nome ?? "",
        status: (company?.status as "active" | "suspended" | "cancelled") ?? "active",
        company_type: (company?.company_type as "office" | "freelancer") ?? "office",
        plan: (company?.plan as string | undefined) ?? (company?.subscription_tier as string | undefined) ?? null,
        created_at: company?.created_at ?? new Date().toISOString(),
        administrador: null,
        clientes: clientes.count ?? 0,
        processos: processos.count ?? 0,
        profissionais: profs.length,
        audiencias: hearings.count ?? 0,
        ultimo_login: ultimoAcesso,
        dias_licenca: null,
      };
    },
    enabled: !!company,
  });

  const { data: alerts } = useCompanyLicenseAlerts(companyId);
  const createAlert = useCreateLicenseAlert();
  const toggleAlert = useToggleLicenseAlert();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    nuit: "",
    email: "",
    telefone: "",
    endereco: "",
    cidade: "",
    pais: "",
    website: "",
    company_type: "office" as "office" | "freelancer",
    status: "active" as "active" | "suspended" | "cancelled",
  });
  const [alertDays, setAlertDays] = useState("7");
  const [alertTitle, setAlertTitle] = useState("Licença a expirar");
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    if (company) {
      setForm({
        nome: company.nome ?? "",
        nuit: company.nuit ?? "",
        email: company.email ?? "",
        telefone: company.telefone ?? "",
        endereco: company.endereco ?? "",
        cidade: company.cidade ?? "",
        pais: company.pais ?? "",
        website: company.website ?? "",
        company_type: (company.company_type as "office" | "freelancer") ?? "office",
        status: (company.status as "active" | "suspended" | "cancelled") ?? "active",
      });
    }
  }, [company]);

  const saveEdit = useMutation({
    mutationFn: async () => {
      await supabase.from("companies").update({
        nome: form.nome,
        nuit: form.nuit || null,
        email: form.email || null,
        telefone: form.telefone || null,
        endereco: form.endereco || null,
        cidade: form.cidade || null,
        pais: form.pais || null,
        website: form.website || null,
        company_type: form.company_type,
        status: form.status,
      } as never).eq("id", companyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-company", companyId] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-company-summary", companyId] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-companies"] });
      setEditing(false);
      toast.success("Empresa atualizada");
    },
    onError: (e: Error) => handleError(e, { operation: "UPDATE", table: "companies" }),
  });

  const handleCreateAlert = async () => {
    const days = parseInt(alertDays || "0", 10);
    await createAlert.mutateAsync({
      company_id: companyId,
      days_remaining: days,
      title: alertTitle.trim() || "Licença a expirar",
      message: alertMessage.trim() || `O seu acesso expira dentro de ${days} dias.`,
    });
    setAlertMessage("");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const suspendMutation = useMutation({
    mutationFn: async () => {
      await supabase.from("companies").update({ status: "suspended" }).eq("id", companyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-company", companyId] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-companies"] });
      toast.success("Empresa suspensa");
    },
    onError: (e: Error) => handleError(e, { operation: "UPDATE", table: "companies" }),
  });

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      await supabase.from("companies").update({ status: "active" }).eq("id", companyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-company", companyId] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-companies"] });
      toast.success("Empresa reativada");
    },
    onError: (e: Error) => handleError(e, { operation: "UPDATE", table: "companies" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await deleteCompany(companyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-companies"] });
      toast.success("Empresa eliminada");
    },
    onError: (e: Error) => handleError(e, { operation: "DELETE", table: "companies" }),
  });

  return (
    <div className="flex h-screen bg-background">
      <SuperAdminSidebar />
      <main className="flex-1 overflow-auto">
        <PageHeader title="Detalhes da Empresa" subtitle={company?.nome ?? ""} showSearch={false} />

        <div className="space-y-6 p-6 lg:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/super-admin/empresas">
                <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
              </Link>
            </Button>
          </div>

          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{company?.nome}</h2>
              <Badge variant={company?.status === "active" ? "default" : "destructive"}>
                {company?.status === "active" ? "Activa" : company?.status === "suspended" ? "Suspensa" : "Cancelada"}
              </Badge>
              <Badge variant="outline">
                {company?.company_type === "freelancer" ? "Freelancer" : "Escritório"}
              </Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
              <Metric label="Clientes" value={summary?.clientes ?? 0} />
              <Metric label="Processos" value={summary?.processos ?? 0} />
              <Metric label="Profissionais" value={summary?.profissionais ?? 0} />
              <Metric label="Audiências" value={summary?.audiencias ?? 0} />
              <Metric
                label="Último Login"
                value={summary?.ultimo_login ? format(new Date(summary.ultimo_login), "dd/MM/yyyy HH:mm", { locale: pt }) : "—"}
              />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-base font-semibold">Ações Rápidas</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Editar
              </Button>
              {company?.status === "active" ? (
                <Button variant="outline" size="sm" onClick={() => suspendMutation.mutate()}>
                  <Ban className="mr-1 h-4 w-4" /> Suspender
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => reactivateMutation.mutate()}>
                  <CheckCircle className="mr-1 h-4 w-4" /> Reativar
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link to="/super-admin/financeiro" search={{ companyId }}>
                  <BarChart3 className="mr-1 h-4 w-4" /> Ver financeiro
                </Link>
              </Button>
              <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate()}>
                <Trash2 className="mr-1 h-4 w-4" /> Eliminar
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <BellRing className="h-4 w-4" /> Enviar Alerta de Licença
            </h3>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Dias restantes</Label>
                <Input type="number" min={0} value={alertDays} onChange={(e) => setAlertDays(e.target.value)} />
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <Label>Título</Label>
                <Input value={alertTitle} onChange={(e) => setAlertTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5 md:col-span-4">
                <Label>Mensagem</Label>
                <Input value={alertMessage} onChange={(e) => setAlertMessage(e.target.value)} placeholder={`O seu acesso expira dentro de ${alertDays || "X"} dias.`} />
              </div>
            </div>
            <div className="mt-3">
              <Button onClick={handleCreateAlert} disabled={createAlert.isPending}>
                {createAlert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar alerta
              </Button>
            </div>

            <div className="mt-5 space-y-2">
              {(alerts ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem alertas.</p>
              ) : (
                (alerts ?? []).map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{a.title}</p>
                        {a.is_active ? <Badge>Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{a.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.days_remaining} dia(s) · {format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAlert.mutate({ id: a.id, company_id: companyId, is_active: !a.is_active })}
                    >
                      {a.is_active ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </main>

      {/* EDITAR EMPRESA */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>NUIT</Label>
              <Input value={form.nuit} onChange={(e) => setForm({ ...form, nuit: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Endereço</Label>
              <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>País</Label>
              <Input value={form.pais} onChange={(e) => setForm({ ...form, pais: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.company_type} onValueChange={(v) => setForm({ ...form, company_type: v as "office" | "freelancer" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="office">Escritório</SelectItem>
                  <SelectItem value="freelancer">Freelancer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "active" | "suspended" | "cancelled" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="suspended">Suspensa</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button onClick={() => saveEdit.mutate()} disabled={saveEdit.isPending}>
              {saveEdit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
