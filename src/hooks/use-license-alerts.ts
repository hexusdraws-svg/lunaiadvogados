import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyId } from "@/hooks/use-profile-company";
import { handleSupabaseError } from "@/lib/supabase-error-handler";
import { toast } from "sonner";

export type CompanyLicenseAlert = {
  id: string;
  company_id: string;
  days_remaining: number;
  title: string;
  message: string;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
};

/**
 * PARTE 13/14 — Alerta ativo da empresa do utilizador atual.
 * Usado pelo banner fixo no topo de todas as páginas.
 */
export function useActiveCompanyLicenseAlert() {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ["company-license-alert", companyId],
    queryFn: async (): Promise<CompanyLicenseAlert | null> => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("company_license_alerts")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("[useActiveCompanyLicenseAlert] error:", error);
        return null;
      }
      return (data as CompanyLicenseAlert) ?? null;
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });
}

/** PARTE 11/12 — Alertas de uma empresa (visão do Super Admin). */
export function useCompanyLicenseAlerts(companyId: string | undefined) {
  return useQuery({
    queryKey: ["company-license-alerts", companyId],
    queryFn: async (): Promise<CompanyLicenseAlert[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("company_license_alerts")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[useCompanyLicenseAlerts] error:", error);
        return [];
      }
      return (data ?? []) as CompanyLicenseAlert[];
    },
    enabled: !!companyId,
  });
}

/** PARTE 12/15 — Criar alerta de expiração (Super Admin) + notificação no sino. */
export function useCreateLicenseAlert() {
  const qc = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      company_id: string;
      days_remaining: number;
      title: string;
      message: string;
    }) => {
      const { data, error } = await supabase
        .from("company_license_alerts")
        .insert({
          company_id: input.company_id,
          days_remaining: input.days_remaining,
          title: input.title,
          message: input.message,
          is_active: true,
          created_by: profile?.id ?? null,
        } as never)
        .select()
        .single();
      if (error) {
        console.error("[useCreateLicenseAlert] insert error:", error);
        throw error;
      }

      // PARTE 15 — Criar também notificações no sino (histórico) para os
      // utilizadores da empresa. Best-effort: não falha o alerta se não conseguir.
      try {
        const { data: companyProfiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("company_id", input.company_id);

        if (companyProfiles && companyProfiles.length > 0) {
          const rows = companyProfiles.map((p) => ({
            company_id: input.company_id,
            user_id: p.id,
            title: input.title,
            message: input.message,
            type: "warning" as const,
            entity_type: "system" as const,
          }));
          await supabase.from("notifications").insert(rows as never);
        }
      } catch (e) {
        console.error("[useCreateLicenseAlert] notification fanout failed:", e);
      }

      return data as CompanyLicenseAlert;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["company-license-alerts", vars.company_id] });
      qc.invalidateQueries({ queryKey: ["company-license-alert"] });
      toast.success("Alerta de expiração criado");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "INSERT", table: "company_license_alerts" });
    },
  });
}

/** Desativar / reativar um alerta existente. */
export function useToggleLicenseAlert() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; company_id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("company_license_alerts")
        .update({ is_active: input.is_active } as never)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["company-license-alerts", vars.company_id] });
      qc.invalidateQueries({ queryKey: ["company-license-alert"] });
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "UPDATE", table: "company_license_alerts" });
    },
  });
}
