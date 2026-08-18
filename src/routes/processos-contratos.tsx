import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute, SuperAdminRedirect } from "@/components/protected-route";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/processos-contratos")({
  component: () => (
    <ProtectedRoute>
      <SuperAdminRedirect>
        <ProcessosContratosPage />
      </SuperAdminRedirect>
    </ProtectedRoute>
  ),
});

function ProcessosContratosPage() {
  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <PageHeader title="Contratos de Processos" />
        <div className="p-6">
          <p>Página em construção</p>
        </div>
      </main>
    </div>
  );
}
