import { createFileRoute, useSearch } from "@tanstack/react-router";
import { SuperAdminOnly } from "@/components/protected-route";
import { SuperAdminSidebar } from "@/components/super-admin-sidebar";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { useSuperAdminStats, useSuperAdminCompanies } from "@/hooks/use-super-admin-dashboard";
import { Building2, Users, UserCircle, Briefcase, Gavel, FileText, Loader2 } from "lucide-react";

export const Route = createFileRoute("/super-admin/estatisticas")({
  head: () => ({ meta: [{ title: "Super Admin · Estatísticas Gerais" }] }),
  component: () => (
    <SuperAdminOnly>
      <EstatisticasPage />
    </SuperAdminOnly>
  ),
  validateSearch: (s: Record<string, unknown>) => ({ companyId: (s.companyId as string) ?? undefined }),
});

function EstatisticasPage() {
  const { companyId } = useSearch({ from: "/super-admin/estatisticas" });
  const { data: stats, isLoading } = useSuperAdminStats();
  const { data: companies } = useSuperAdminCompanies();

  const alvo = companyId ? companies?.find((c) => c.id === companyId) : null;

  return (
    <div className="flex h-screen bg-background">
      <SuperAdminSidebar />
      <main className="flex-1 overflow-auto">
        <PageHeader
          title="Estatísticas Gerais"
          subtitle={alvo ? `Empresa: ${alvo.nome}` : "Agregado de toda a plataforma"}
          showSearch={false}
        />

        <div className="p-6 lg:p-8 space-y-6">
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : alvo ? (
            <>
              <p className="text-sm text-muted-foreground">Métricas da empresa selecionada:</p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Clientes" value={alvo.clientes} icon={UserCircle} accent="info" />
                <StatCard label="Processos" value={alvo.processos} icon={Briefcase} accent="primary" />
                <StatCard label="Profissionais" value={alvo.profissionais} icon={Users} accent="success" />
                <StatCard label="Audiências" value={alvo.audiencias} icon={Gavel} accent="warning" />
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total Empresas" value={stats?.totalCompanies ?? 0} icon={Building2} accent="primary" />
                <StatCard label="Total Advogados" value={stats?.totalProfessionals ?? 0} icon={Users} accent="info" />
                <StatCard label="Total Clientes" value={stats?.totalClients ?? 0} icon={UserCircle} accent="info" />
                <StatCard label="Total Processos" value={stats?.totalProcessos ?? 0} icon={Briefcase} accent="primary" />
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total Audiências" value={stats?.totalAudiencias ?? 0} icon={Gavel} accent="warning" />
                <StatCard label="Total Contratos" value={stats?.totalContratos ?? 0} icon={FileText} accent="success" />
                <StatCard label="Empresas Ativas" value={stats?.activeCompanies ?? 0} icon={Building2} accent="success" />
                <StatCard label="Empresas Suspensas" value={stats?.suspendedCompanies ?? 0} icon={Building2} accent="destructive" />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
