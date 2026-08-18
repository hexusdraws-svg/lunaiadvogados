import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SuperAdminOnly } from "@/components/protected-route";
import { SuperAdminSidebar } from "@/components/super-admin-sidebar";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export const Route = createFileRoute("/super-admin/licencas")({
  head: () => ({ meta: [{ title: "Super Admin · Licenças" }] }),
  component: () => (
    <SuperAdminOnly>
      <LicencasPage />
    </SuperAdminOnly>
  ),
});

import { useAutoLicenseAlerts } from "@/hooks/use-auto-license-alerts";

export function LicencasPage() {
  const qc = useQueryClient();
  const [companyId, setCompanyId] = useState("");
  const [days, setDays] = useState("7");
  const [title, setTitle] = useState("Licença a expirar");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const autoAlerts = useAutoLicenseAlerts();

  useEffect(() => {
    autoAlerts.mutate();
  }, []);

  const { data: empresas } = useQuery({
    queryKey: ["super-admin-companies-mini"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, nome").order("nome");
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string }[];
    },
  });

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["super-admin-all-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_license_alerts")
        .select("*, companies(nome)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        company_id: string;
        days_remaining: number;
        title: string;
        message: string;
        is_active: boolean;
        created_at: string;
        companies: { nome: string } | null;
      }>;
    },
  });

  const submit = async () => {
    if (!companyId) return toast.error("Selecione uma empresa.");
    const d = parseInt(days || "0", 10);
    setSaving(true);
    try {
      const { data: profile } = await supabase.auth.getUser();
      const { error } = await supabase.from("company_license_alerts").insert({
        company_id: companyId,
        days_remaining: d,
        title: title.trim() || "Licença a expirar",
        message: message.trim() || `O seu acesso expira dentro de ${d} dias.`,
        is_active: true,
        created_by: profile.data.user?.id ?? null,
      } as never);
      if (error) throw error;

      // Notificar utilizadores da empresa (histórico no sino)
      try {
        const { data: profs } = await supabase.from("profiles").select("id").eq("company_id", companyId);
        if (profs?.data && profs.data.length > 0) {
          await supabase.from("notifications").insert(
            profs.data.map((p) => ({
              company_id: companyId,
              user_id: p.id,
              title: title.trim() || "Licença a expirar",
              message: message.trim() || `O seu acesso expira dentro de ${d} dias.`,
              type: "warning",
              entity_type: "system",
            })) as never,
          );
        }
      } catch (e) {
        console.error("notification fanout failed", e);
      }

      qc.invalidateQueries({ queryKey: ["super-admin-all-alerts"] });
      toast.success("Alerta de licença criado");
      setMessage("");
    } catch (e) {
      toast.error("Erro: " + (e instanceof Error ? e.message : ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <SuperAdminSidebar />
      <main className="flex-1 overflow-auto">
        <PageHeader title="Licenças" subtitle="Alertas de expiração de licença" showSearch={false} />

        <div className="space-y-6 p-6 lg:p-8">
          <Card className="max-w-2xl p-5">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <KeyRound className="h-4 w-4" /> Criar Alerta de Licença
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Empresa</Label>
                <select
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                >
                  <option value="">Selecionar empresa</option>
                  {(empresas ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Dias restantes</Label>
                <Input type="number" min={0} value={days} onChange={(e) => setDays(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Mensagem</Label>
                <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder={`O seu acesso expira dentro de ${days || "X"} dias.`} />
              </div>
            </div>
            <Button className="mt-3" onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Criar alerta
            </Button>
          </Card>

          <div className="space-y-3">
            <h3 className="text-base font-semibold">Alertas Existentes</h3>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (alerts ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem alertas.</p>
            ) : (
              (alerts ?? []).map((a) => (
                <Card key={a.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{a.companies?.nome ?? "—"}</p>
                        {a.is_active ? <Badge>Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.days_remaining} dia(s) · {format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
