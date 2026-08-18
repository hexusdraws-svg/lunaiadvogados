"use client";

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
import { ArrowLeft, Loader2, Save, BellRing } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useSupabaseErrorHandler } from "@/lib/supabase-error-handler";
import { updateCompanyType } from "@/lib/company";
import {
  useCompanyLicenseAlerts,
  useCreateLicenseAlert,
  useToggleLicenseAlert,
} from "@/hooks/use-license-alerts";

export const Route = createFileRoute("/admin/empresas/$companyId")({
  component: () => (
    <SuperAdminOnly>
      <CompanyDetailPage />
    </SuperAdminOnly>
  ),
});

function CompanyDetailPage() {
  const { companyId } = useParams({ from: "/admin/empresas/$companyId" });
  const queryClient = useQueryClient();
  const handleError = useSupabaseErrorHandler();

  const { data: company, isLoading } = useQuery({
    queryKey: ["admin-company-detail", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: metrics } = useQuery({
    queryKey: ["admin-company-detail-metrics", companyId],
    queryFn: async () => {
      const [profiles, processos, clientes, hearings] = await Promise.all([
        supabase.from("profiles").select("id, role, updated_at").eq("company_id", companyId),
        supabase.from("processos").select("id", { count: "exact", head: true }).eq("company_id", companyId),
        supabase.from("clientes").select("id", { count: "exact", head: true }).eq("company_id", companyId),
        supabase.from("hearings").select("id", { count: "exact", head: true }).eq("company_id", companyId),
      ]);
      const profs = (profiles.data ?? []).filter((p) => p.role !== "super_admin");
      const ultimoAcesso =
        profs
          .map((p) => p.updated_at as string | null)
          .filter(Boolean)
          .sort()
          .reverse()[0] ?? null;
      return {
        profissionais: profs.length,
        processos: processos.count ?? 0,
        clientes: clientes.count ?? 0,
        audiencias: hearings.count ?? 0,
        ultimoAcesso,
      };
    },
  });

  const { data: alerts } = useCompanyLicenseAlerts(companyId);
  const createAlert = useCreateLicenseAlert();
  const toggleAlert = useToggleLicenseAlert();

  const [companyType, setCompanyType] = useState<"office" | "freelancer">("office");
  const [alertDays, setAlertDays] = useState("7");
  const [alertTitle, setAlertTitle] = useState("Licença a expirar");
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    if (company?.company_type) setCompanyType(company.company_type as "office" | "freelancer");
  }, [company?.company_type]);

  const saveType = useMutation({
    mutationFn: async () => {
      await updateCompanyType(companyId, companyType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-company-detail", companyId] });
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      toast.success("Tipo da empresa atualizado");
    },
    onError: (e: Error) => handleError(e, { operation: "UPDATE", table: "companies" }),
  });

  const handleCreateAlert = async () => {
    const days = parseInt(alertDays || "0", 10);
    const message =
      alertMessage.trim() || `O seu acesso expira dentro de ${days} dias.`;
    await createAlert.mutateAsync({
      company_id: companyId,
      days_remaining: days,
      title: alertTitle.trim() || "Licença a expirar",
      message,
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

  return (
    <div className="flex h-screen bg-background">
      <SuperAdminSidebar />
      <main className="flex-1 overflow-auto">
        <PageHeader title={t("admin.companyDetails")} subtitle={company?.nome ?? ""} />

        <div className="space-y-6 p-6 lg:p-8">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/empresas">
              <ArrowLeft className="mr-1 h-4 w-4" /> Voltar às empresas
            </Link>
          </Button>

          {/* RESUMO */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{company?.nome}</h2>
              <Badge variant={company?.status === "active" ? "default" : "destructive"}>
                {company?.status === "active"
                  ? "Activa"
                  : company?.status === "suspended"
                    ? "Suspensa"
                    : "Cancelada"}
              </Badge>
              <Badge variant="outline">
                {company?.company_type === "freelancer" ? "Freelancer" : "Escritório"}
              </Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
              <Metric label="Clientes" value={metrics?.clientes ?? 0} />
              <Metric label="Processos" value={metrics?.processos ?? 0} />
              <Metric label="Profissionais" value={metrics?.profissionais ?? 0} />
              <Metric label="Audiências" value={metrics?.audiencias ?? 0} />
              <Metric
                label="Último acesso"
                value={
                  metrics?.ultimoAcesso
                    ? format(new Date(metrics.ultimoAcesso), "dd/MM/yyyy HH:mm", { locale: pt })
                    : "—"
                }
              />
            </div>
          </Card>

          {/* PARTE 6 — TIPO DA EMPRESA */}
          <Card className="p-5">
            <h3 className="text-base font-semibold">Tipo da Empresa</h3>
            <p className="text-sm text-muted-foreground">
              Escritório: toda a receita pertence ao escritório (sem divisão de honorários).
              Freelancer: com divisão de honorários entre colaboradores.
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={companyType}
                  onValueChange={(v) => setCompanyType(v as "office" | "freelancer")}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office">Escritório</SelectItem>
                    <SelectItem value="freelancer">Freelancer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => saveType.mutate()} disabled={saveType.isPending}>
                {saveType.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Guardar
              </Button>
            </div>
          </Card>

          {/* PARTE 11/12 — ALERTAS DE EXPIRAÇÃO */}
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <BellRing className="h-4 w-4" /> Alertas de Expiração
            </h3>
            <p className="text-sm text-muted-foreground">
              Crie um alerta de licença. Aparecerá como banner fixo e notificação no sino para
              todos os utilizadores da empresa.
            </p>

            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Dias restantes</Label>
                <Input
                  type="number"
                  min={0}
                  value={alertDays}
                  onChange={(e) => setAlertDays(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <Label>Título</Label>
                <Input value={alertTitle} onChange={(e) => setAlertTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5 md:col-span-4">
                <Label>Mensagem</Label>
                <Input
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  placeholder={`O seu acesso expira dentro de ${alertDays || "X"} dias.`}
                />
              </div>
            </div>
            <div className="mt-3">
              <Button onClick={handleCreateAlert} disabled={createAlert.isPending}>
                {createAlert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar alerta
              </Button>
            </div>

            {/* Lista de alertas existentes */}
            <div className="mt-5 space-y-2">
              {(alerts ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem alertas.</p>
              ) : (
                (alerts ?? []).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{a.title}</p>
                        {a.is_active ? (
                          <Badge>Ativo</Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{a.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.days_remaining} dia(s) ·{" "}
                        {format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toggleAlert.mutate({
                          id: a.id,
                          company_id: companyId,
                          is_active: !a.is_active,
                        })
                      }
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
