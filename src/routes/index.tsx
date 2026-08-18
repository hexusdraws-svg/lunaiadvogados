"use client";

import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/protected-route";
import { SuperAdminRedirect } from "@/components/protected-route";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { AppSidebar } from "@/components/app-sidebar";
import { useAdminDashboard } from "@/hooks/use-admin-dashboard";
import {
  FolderKanban,
  CalendarClock,
  AlertTriangle,
  Users,
} from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard" }] }),
  component: () => (
    <ProtectedRoute>
      <SuperAdminRedirect>
        <DashboardPage />
      </SuperAdminRedirect>
    </ProtectedRoute>
  ),
});

function DashboardPage() {
  const { t } = useI18n();
  const { data, summaryStats, attentionItems, isLoading } =
    useAdminDashboard();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />

      <main className="flex-1 overflow-auto">
        <PageHeader title={t("dashboardTitle")} subtitle={t("dashboard.subtitle")} />

        <div className="p-6 lg:p-8 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={t("dashboard.totalClients")}
              value={summaryStats.totalClientes}
              icon={Users}
              accent="info"
            />
            <StatCard
              label={t("dashboard.activeCases")}
              value={summaryStats.processosAtivos}
              icon={FolderKanban}
              accent="success"
            />
            <StatCard
              label={t("dashboard.hearingsToday")}
              value={summaryStats.audienciasHoje}
              icon={CalendarClock}
              accent="destructive"
            />
            <StatCard
              label={t("dashboard.hearingsWeek")}
              value={summaryStats.audienciasEstaSemana}
              icon={CalendarClock}
              accent="info"
            />
          </div>

          {/* NECESSITAM ATENÇÃO */}
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> {t("attention")}
            </h2>
            {attentionItems.length === 0 ? (
              <div className="glass rounded-2xl border border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">{t("noAttentionItems")}</p>
                <p className="text-xs text-muted-foreground">{t("noAttentionItemsSubtitle")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {attentionItems.slice(0, 8).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3"
                  >
                    <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {item.processo_numero} · {item.cliente_nome || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.descricao}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}