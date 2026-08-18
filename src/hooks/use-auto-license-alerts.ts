import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSupabaseErrorHandler } from "@/lib/supabase-error-handler";
import { toast } from "sonner";

/**
 * PARTE 10 — Verificar automaticamente subscrições próximas do vencimento
 * e criar alertas de expiração.
 *
 * Dispara quando faltam: 7, 3, 1 dia.
 * Evita duplicar alertas já existentes para a mesma empresa + dias_remaining.
 */
export function useAutoLicenseAlerts() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const handleError = useSupabaseErrorHandler();

  return useMutation({
    mutationFn: async () => {
      const today = new Date();
      const checkDays = [7, 3, 1];

      const { data: subscriptions, error: subError } = await supabase
        .from("company_subscriptions")
        .select("company_id, next_due_date, plan")
        .eq("status", "pending")
        .not("next_due_date", "is", null);

      if (subError) throw subError;
      if (!subscriptions || subscriptions.length === 0) return { created: 0 };

      const companyIds = [...new Set(subscriptions.map((s) => s.company_id))];

      const { data: existingAlerts, error: alertError } = await supabase
        .from("company_license_alerts")
        .select("company_id, days_remaining, is_active")
        .in("company_id", companyIds)
        .eq("is_active", true);

      if (alertError) throw alertError;

      const existingKey = (cid: string, days: number) => `${cid}:${days}`;
      const existingSet = new Set((existingAlerts ?? []).map((a) => existingKey(a.company_id, a.days_remaining)));

      const toCreate: Array<{ company_id: string; days_remaining: number; title: string; message: string }> = [];

      for (const sub of subscriptions) {
        const due = new Date(sub.next_due_date);
        const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        for (const days of checkDays) {
          if (diffDays <= days && diffDays > 0 && !existingSet.has(existingKey(sub.company_id, days))) {
            toCreate.push({
              company_id: sub.company_id,
              days_remaining: days,
              title: `Licença a expirar em ${days} dia(s)`,
              message: `A subscrição do plano ${sub.plan ?? ""} da empresa expira dentro de ${days} dia(s). Renove para evitar interrupção.`,
            });
          }
        }
      }

      if (toCreate.length === 0) return { created: 0 };

      const { error: insertError } = await supabase
        .from("company_license_alerts")
        .insert(
          toCreate.map((a) => ({
            ...a,
            is_active: true,
            created_by: profile?.id ?? null,
          })) as never,
        );

      if (insertError) throw insertError;

      // Notificar utilizadores das empresas (best-effort)
      try {
        const uniqueCompanyIds = [...new Set(toCreate.map((a) => a.company_id))];
        const { data: profs } = await supabase.from("profiles").select("id, company_id").in("company_id", uniqueCompanyIds);
        if (profs && profs.length > 0) {
          const rows = profs.map((p) => {
            const alert = toCreate.find((a) => a.company_id === p.company_id)!;
            return {
              company_id: p.company_id,
              user_id: p.id,
              title: alert.title,
              message: alert.message,
              type: "warning" as const,
              entity_type: "system" as const,
            };
          });
          await supabase.from("notifications").insert(rows as never);
        }
      } catch (e) {
        console.error("[useAutoLicenseAlerts] notification fanout failed:", e);
      }

      return { created: toCreate.length };
    },
    onSuccess: (result) => {
      if (result.created > 0) {
        qc.invalidateQueries({ queryKey: ["company-license-alerts"] });
        qc.invalidateQueries({ queryKey: ["super-admin-all-alerts"] });
        toast.success(`${result.created} alerta(s) automático(s) criado(s)`);
      }
    },
    onError: (e: Error) => handleError(e, { operation: "INSERT", table: "company_license_alerts" }),
  });
}
