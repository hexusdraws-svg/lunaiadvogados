import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ProtectedRoute, SuperAdminRedirect } from "@/components/protected-route";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/financas")({
  head: () => ({ meta: [{ title: "Finanças" }] }),
  component: () => (
    <ProtectedRoute>
      <SuperAdminRedirect>
        <FinancasShell />
      </SuperAdminRedirect>
    </ProtectedRoute>
  ),
});

function FinancasShell() {
  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <PageHeader title="Finanças" subtitle="Gestão financeira da empresa." showSearch={false} />
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
