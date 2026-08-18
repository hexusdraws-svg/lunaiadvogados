import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyId } from "@/hooks/use-profile-company";
import { handleSupabaseError } from "@/lib/supabase-error-handler";
import { toast } from "sonner";
import { sendLegalGuidanceWebhook } from "@/services/legal-guidance-webhook";

export type AudienciaStatus = "Scheduled" | "Completed" | "Cancelled" | "Rescheduled";

export type Audiencia = {
  id: string;
  company_id: string;
  case_id: string;
  responsible_professional_id: string;
  responsible_name?: string | null;
  hearing_date: string;
  hearing_time: string;
  court_name: string;
  courtroom: string | null;
  judge_name: string | null;
  city: string;
  address: string | null;
  notes: string | null;
  status: AudienciaStatus;
  reminder_date: string | null;
  reminder_time: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  processo_numero?: string;
  cliente_nome?: string | null;
  enable_legal_guidance?: boolean;
  case_type?: string | null;
  case_description?: string | null;
  people_involved?: string | null;
  expected_outcome?: string | null;
  legal_notes?: string | null;
  legal_guidance_status?: string;
  legal_guidance_generated_at?: string | null;
  legal_guidance_document?: string | null;
};

export function useAudiencias(filters?: {
  status?: AudienciaStatus | "all";
  dateFrom?: string | null;
  dateTo?: string | null;
}) {
  const companyId = useCompanyId();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  return useQuery({
    queryKey: ["audiencias", companyId, filters],
    queryFn: async () => {
      if (!companyId) return [];
      try {
        const { data, error } = await supabase
          .from("hearings")
          .select("*")
          .eq("company_id", companyId);

        if (error) {
          console.error("[useAudiencias] query error:", error);
          return [];
        }

        let results = (data ?? []) as Audiencia[];

        if (!isAdmin && profile?.id) {
          results = results.filter((r) => r.responsible_professional_id === profile.id);
        }

        if (filters?.status && filters.status !== "all") {
          results = results.filter((r) => r.status === filters.status);
        }
        if (filters?.dateFrom) {
          results = results.filter((r) => (r.hearing_date as string) >= filters.dateFrom!);
        }
        if (filters?.dateTo) {
          results = results.filter((r) => (r.hearing_date as string) <= filters.dateTo!);
        }

        const ordered = results.sort((a, b) => {
          const dateComp = a.hearing_date.localeCompare(b.hearing_date as string);
          if (dateComp !== 0) return dateComp;
          return (a.hearing_time as string).localeCompare(b.hearing_time as string);
        });

        let enriched: Record<string, unknown>[] = ordered;
        try {
          const caseIds = ordered.map((r) => r.case_id as string).filter(Boolean);
          const professionalIds = ordered
            .map((r) => r.responsible_professional_id as string)
            .filter(Boolean);
          const uniqueProfessionalIds = Array.from(new Set(professionalIds));

          if (caseIds.length > 0 || uniqueProfessionalIds.length > 0) {
            const [processosRes, profissionaisRes] = await Promise.all([
              caseIds.length > 0
                ? supabase.from("processos").select("id, numero, cliente_nome").in("id", caseIds)
                : Promise.resolve({ data: null }),
              uniqueProfessionalIds.length > 0
                ? supabase.from("profiles").select("id, full_name").in("id", uniqueProfessionalIds)
                : Promise.resolve({ data: null }),
            ]);

            const processosMap = new Map(
              (processosRes.data ?? []).map((p: Record<string, string | null>) => [p.id, p]),
            );
            const profissionaisMap = new Map(
              (profissionaisRes.data ?? []).map((p: Record<string, string | null>) => [
                p.id,
                p.full_name ?? null,
              ]),
            );

            enriched = ordered.map((row) => {
              const proc = processosMap.get(row.case_id as string);
              const responsibleName =
                profissionaisMap.get(row.responsible_professional_id as string) ?? null;
              return {
                ...row,
                processo_numero: proc?.numero ?? null,
                cliente_nome: proc?.cliente_nome ?? null,
                responsible_name: responsibleName,
              };
            });
          }
        } catch (enrichError) {
          console.error("[useAudiencias] enrichment error:", enrichError);
        }

        return enriched as Audiencia[];
      } catch (e) {
        console.error("[useAudiencias] unexpected error:", e);
        return [];
      }
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });
}

export function useAudienciasHoje() {
  const companyId = useCompanyId();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  return useQuery({
    queryKey: ["audiencias-hoje", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const today = new Date().toISOString().slice(0, 10);

      let q = supabase
        .from("hearings")
        .select("*")
        .eq("company_id", companyId)
        .eq("hearing_date", today);

      if (!isAdmin && profile?.id) {
        q = q.eq("responsible_professional_id", profile.id);
      }

      const { data, error } = await q.order("hearing_time", { ascending: true });

      if (error) {
        console.error("[useAudienciasHoje] query error:", error);
        return [];
      }

      const results = (data ?? []) as Record<string, unknown>[];
      let enriched = results;
      try {
        const caseIds = results.map((r) => r.case_id as string).filter(Boolean);
        const professionalIds = results
          .map((r) => r.responsible_professional_id as string)
          .filter(Boolean);
        const uniqueProfessionalIds = Array.from(new Set(professionalIds));

        const [processosRes, profissionaisRes] = await Promise.all([
          caseIds.length > 0
            ? supabase.from("processos").select("id, numero, cliente_nome").in("id", caseIds)
            : Promise.resolve({ data: null }),
          uniqueProfessionalIds.length > 0
            ? supabase.from("profiles").select("id, full_name").in("id", uniqueProfessionalIds)
            : Promise.resolve({ data: null }),
        ]);

        const processosMap = new Map(
          (processosRes.data ?? []).map((p: Record<string, string | null>) => [p.id, p]),
        );
        const profissionaisMap = new Map(
          (profissionaisRes.data ?? []).map((p: Record<string, string | null>) => [
            p.id,
            p.full_name ?? null,
          ]),
        );

        enriched = results.map((row) => {
          const proc = processosMap.get(row.case_id as string);
          const responsibleName =
            profissionaisMap.get(row.responsible_professional_id as string) ?? null;
          return {
            ...row,
            processo_numero: proc?.numero ?? null,
            cliente_nome: proc?.cliente_nome ?? null,
            responsible_name: responsibleName,
          };
        });
      } catch (enrichError) {
        console.error("[useAudienciasHoje] enrichment error:", enrichError);
      }

      return enriched as Audiencia[];
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });
}

export function useProcessosForSelect() {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ["processos-for-audiencias", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("processos")
        .select("id, numero, cliente_nome")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[useProcessosForSelect] query error:", error);
        return [];
      }
      return (data ?? []) as { id: string; numero: string; cliente_nome: string | null }[];
    },
    enabled: !!companyId,
  });
}

export function useCreateAudiencia() {
  const qc = useQueryClient();
  const { profile, isSuperAdmin } = useAuth();
  const getCompanyId = () => {
    if (isSuperAdmin) return null;
    return profile?.company_id ?? null;
  };

  return useMutation({
    mutationFn: async (values: {
      case_id: string;
      hearing_date: string;
      hearing_time: string;
      court_name: string;
      courtroom?: string | null;
      judge_name?: string | null;
      city: string;
      address?: string | null;
      notes?: string | null;
      reminder_date?: string | null;
      reminder_time?: string;
      enable_legal_guidance?: boolean;
      case_type?: string | null;
      case_description?: string | null;
      people_involved?: string | null;
      expected_outcome?: string | null;
      legal_notes?: string | null;
      phone_number?: string | null;
      phone_country_code?: string | null;
    }) => {
      const companyId = getCompanyId();
      if (!companyId) throw new Error("Empresa nÃ£o configurada");
      if (!profile?.id) throw new Error("Utilizador nÃ£o autenticado");

      const payload = {
        company_id: companyId,
        case_id: values.case_id,
        responsible_professional_id: profile.id,
        hearing_date: values.hearing_date,
        hearing_time: values.hearing_time,
        court_name: values.court_name,
        courtroom: values.courtroom || null,
        judge_name: values.judge_name || null,
        city: values.city,
        address: values.address || null,
        notes: values.notes || null,
        status: "Scheduled" as const,
        reminder_date: values.reminder_date || null,
        reminder_time: values.reminder_time,
        created_by: profile.id,
      };

      const { data, error } = await supabase.from("hearings").insert(payload).select().single();

      if (error) throw error;
      const hearing = data as Audiencia;

      // Send a single webhook payload (hearing.created) to the unique N8N webhook.
      // The payload includes all hearing data + legal guidance data (enabled: true/false).
      void (async () => {
        try {
          const [{ data: processo }, { data: professional }, { data: company }] = await Promise.all(
            [
              supabase
                .from("processos")
                .select("cliente_id, numero, tipo, status")
                .eq("id", hearing.case_id)
                .maybeSingle(),
              supabase
                .from("profiles")
                .select("full_name, email")
                .eq("id", hearing.responsible_professional_id)
                .maybeSingle(),
              supabase
                .from("companies")
                .select("nome")
                .eq("id", hearing.company_id || "")
                .maybeSingle(),
            ],
          );

          let clientName: string | null = null;
          let clientContact: string | null = null;
          if (processo?.cliente_id) {
            const { data: cliente } = await supabase
              .from("clientes")
              .select("nome, contacto")
              .eq("id", processo.cliente_id)
              .maybeSingle();
            clientName = cliente?.nome ?? null;
            clientContact = cliente?.contacto ?? null;
          }

          void sendLegalGuidanceWebhook({
            hearing,
            processNumero: processo?.numero ?? "",
            processTipo: processo?.tipo ?? null,
            processCliente: clientName ?? null,
            processStatus: processo?.status ?? null,
            clientId: processo?.cliente_id ?? null,
            clientName,
            clientContact,
            professionalName: professional?.full_name ?? null,
            professionalEmail: professional?.email ?? null,
            companyName: company?.nome ?? "",
            hearingWhatsapp: values.phone_number
              ? `${values.phone_country_code}${values.phone_number}`.replace(/\s/g, "")
              : null,
            hearingWhatsappCountryCode: values.phone_country_code || null,
            reminderDate: values.reminder_date ?? null,
            reminderTime: values.reminder_time ?? null,
            legalGuidance: {
              enabled: values.enable_legal_guidance ?? false,
              case_type: values.case_type ?? null,
              description: values.case_description ?? null,
              people_involved: values.people_involved ?? null,
              expected_outcome: values.expected_outcome ?? null,
              notes: values.legal_notes ?? null,
            },
          });
        } catch (webhookError) {
          console.error("[Audiencias] Falha ao enviar webhook n8n:", webhookError);
        }
      })();

      return hearing;
    },
    onSuccess: async (hearing) => {
      qc.invalidateQueries({ queryKey: ["audiencias"] });
      qc.invalidateQueries({ queryKey: ["audiencias-hoje"] });

      try {
        await supabase.from("process_timeline").insert({
          company_id: hearing.company_id,
          case_id: hearing.case_id,
          user_id: hearing.created_by,
          event: "hearing_scheduled",
          description: `AudiÃªncia agendada para ${hearing.hearing_date} Ã s ${hearing.hearing_time}`,
          metadata: {
            hearing_id: hearing.id,
            hearing_date: hearing.hearing_date,
            hearing_time: hearing.hearing_time,
            court_name: hearing.court_name,
          },
        });
      } catch (timelineError) {
        console.error("[Audiencias] Erro ao inserir timeline:", timelineError);
      }
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "INSERT", table: "hearings" });
    },
  });
}

export function useUpdateAudienciaStatus() {
  const qc = useQueryClient();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AudienciaStatus }) => {
      let q = supabase.from("hearings").update({ status }).eq("id", id);

      if (companyId) {
        q = q.eq("company_id", companyId);
      }

      const { data, error } = await q.select().single();
      if (error) throw error;
      return data as Audiencia;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audiencias"] });
      qc.invalidateQueries({ queryKey: ["audiencias-hoje"] });
      toast.success("Status actualizado");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "UPDATE", table: "hearings" });
    },
  });
}

export function useDeleteAudiencia() {
  const qc = useQueryClient();
  const { profile, isSuperAdmin } = useAuth();
  const getCompanyId = () => (isSuperAdmin ? null : (profile?.company_id ?? null));

  return useMutation({
    mutationFn: async (id: string) => {
      const companyId = getCompanyId();

      let q = supabase.from("hearings").delete().eq("id", id);
      if (companyId) {
        q = q.eq("company_id", companyId);
      }
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audiencias"] });
      qc.invalidateQueries({ queryKey: ["audiencias-hoje"] });
      toast.success("AudiÃªncia removida");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "DELETE", table: "hearings" });
    },
  });
}

export function useUpdateAudiencia() {
  const qc = useQueryClient();
  const companyId = useCompanyId();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (values: {
      id: string;
      case_id: string;
      hearing_date: string;
      hearing_time: string;
      court_name: string;
      courtroom?: string | null;
      judge_name?: string | null;
      city: string;
      address?: string | null;
      notes?: string | null;
      status: AudienciaStatus;
      reminder_date?: string | null;
      reminder_time?: string;
      enable_legal_guidance?: boolean;
      case_type?: string | null;
      case_description?: string | null;
      people_involved?: string | null;
      expected_outcome?: string | null;
      legal_notes?: string | null;
    }) => {
      const payload: Record<string, unknown> = {
        case_id: values.case_id,
        hearing_date: values.hearing_date,
        hearing_time: values.hearing_time,
        court_name: values.court_name,
        courtroom: values.courtroom || null,
        judge_name: values.judge_name || null,
        city: values.city,
        address: values.address || null,
        notes: values.notes || null,
        status: values.status,
        reminder_date: values.reminder_date || null,
        reminder_time: values.reminder_time || null,
      };

      let q = supabase
        .from("hearings")
        .update(payload as never)
        .eq("id", values.id);
      if (companyId) {
        q = q.eq("company_id", companyId);
      }

      const { data, error } = await q.select().single();
      if (error) throw error;
      const hearing = data as Audiencia;

      return hearing;
    },
    onSuccess: (hearing) => {
      qc.invalidateQueries({ queryKey: ["audiencias"] });
      qc.invalidateQueries({ queryKey: ["audiencias-hoje"] });
      toast.success("AudiÃªncia actualizada");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "UPDATE", table: "hearings" });
    },
  });
}
