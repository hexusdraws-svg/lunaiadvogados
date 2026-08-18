"use client";

import { createFileRoute } from "@tanstack/react-router";
import { AdminOrAbove, SuperAdminRedirect } from "@/components/protected-route";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { ExecutivePanel, ExecutiveRefreshButton } from "@/components/executive/executive-panel";
import { useI18n } from "@/hooks/use-i18n";

export const Route = createFileRoute("/admin/painel-executivo")({
  head: () => ({ meta: [{ title: "Painel Executivo" }] }),
  component: () => (
    <AdminOrAbove>
      <SuperAdminRedirect>
        <AdminPainelPage />
      </SuperAdminRedirect>
    </AdminOrAbove>
  ),
});

function AdminPainelPage() {
  const { t } = useI18n();

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />

      <main className="flex-1 overflow-auto">
        <PageHeader
          title={t("adminDashboard")}
          subtitle={t("adminDashboardSubtitle")}
        />

        <div className="p-6 pt-4 lg:p-8">
          <ExecutivePanel />
        </div>
      </main>
    </div>
  );
}
