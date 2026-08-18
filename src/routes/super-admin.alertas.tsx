import { createFileRoute } from "@tanstack/react-router";
import { SuperAdminOnly } from "@/components/protected-route";
import { SuperAdminSidebar } from "@/components/super-admin-sidebar";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BellRing, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export const Route = createFileRoute("/super-admin/alertas")({
  head: () => ({ meta: [{ title: "Super Admin · Alertas" }] }),
  component: () => (
    <SuperAdminOnly>
      <AlertasPage />
    </SuperAdminOnly>
  ),
});

function AlertasPage() {
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["super-admin-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*, companies(nome), profiles(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        title: string;
        message: string;
        type: string;
        created_at: string;
        companies: { nome: string } | null;
        profiles: { full_name: string | null; email: string | null } | null;
      }>;
    },
  });

  return (
    <div className="flex h-screen bg-background">
      <SuperAdminSidebar />
      <main className="flex-1 overflow-auto">
        <PageHeader title="Alertas" subtitle="Notificações da plataforma (histórico)" showSearch={false} />

        <div className="space-y-3 p-6 lg:p-8">
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (notifications ?? []).length === 0 ? (
            <Card className="flex flex-col items-center gap-2 p-10 text-center">
              <BellRing className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Sem alertas registados.</p>
            </Card>
          ) : (
            (notifications ?? []).map((n) => (
              <Card key={n.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{n.title}</p>
                      <Badge variant="outline">{n.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground">
                      Empresa: {n.companies?.nome ?? "—"} · Utilizador:{" "}
                      {n.profiles?.full_name || n.profiles?.email || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(n.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
