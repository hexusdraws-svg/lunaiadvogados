import { createFileRoute } from "@tanstack/react-router";
import { SuperAdminOnly } from "@/components/protected-route";
import { SuperAdminSidebar } from "@/components/super-admin-sidebar";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Settings } from "lucide-react";

export const Route = createFileRoute("/super-admin/configuracoes")({
  head: () => ({ meta: [{ title: "Super Admin · Configurações Globais" }] }),
  component: () => (
    <SuperAdminOnly>
      <ConfiguracoesPage />
    </SuperAdminOnly>
  ),
});

function ConfiguracoesPage() {
  return (
    <div className="flex h-screen bg-background">
      <SuperAdminSidebar />
      <main className="flex-1 overflow-auto">
        <PageHeader title="Configurações Globais" subtitle="Parâmetros da plataforma" showSearch={false} />

        <div className="space-y-4 p-6 lg:p-8">
          <Card className="flex flex-col items-center gap-2 p-10 text-center">
            <Settings className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">Configurações Globais</p>
            <p className="text-xs text-muted-foreground">
              As definições globais da plataforma serão geridas aqui. Nenhuma alteração a
              empresas ou perfis é feita por esta secção.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
