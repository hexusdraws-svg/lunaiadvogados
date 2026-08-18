import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute, SuperAdminRedirect } from "@/components/protected-route";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/hooks/use-i18n";

export const Route = createFileRoute("/leads")({
  component: () => (
    <ProtectedRoute>
      <SuperAdminRedirect>
        <LeadsPage />
      </SuperAdminRedirect>
    </ProtectedRoute>
  ),
});

function LeadsPage() {
  const { t } = useI18n();
  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <PageHeader title={t("leads")} />
        <div className="p-6">
          <p>Leads em construção</p>
        </div>
      </main>
    </div>
  );
}
