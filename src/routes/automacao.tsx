import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute, SuperAdminRedirect } from "@/components/protected-route";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/hooks/use-i18n";

export const Route = createFileRoute("/automacao")({
  component: () => (
    <ProtectedRoute>
      <SuperAdminRedirect>
        <AutomacaoPage />
      </SuperAdminRedirect>
    </ProtectedRoute>
  ),
});

function AutomacaoPage() {
  const { t } = useI18n();
  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <PageHeader title={t("automacao")} />
        <div className="p-6">
          <p>Automação em construção</p>
        </div>
      </main>
    </div>
  );
}
