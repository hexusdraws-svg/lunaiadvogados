import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyId } from "@/hooks/use-profile-company";
import { handleSupabaseError, useSupabaseErrorHandler } from "@/lib/supabase-error-handler";
import { toast } from "sonner";
import { sendWebhook, type WebhookResult } from "@/lib/webhooks";

export type AgendaEventType = "audiencia" | "tarefa" | "consultoria" | "manual";
export type AgendaEventStatus = "scheduled" | "completed" | "cancelled";

export interface AgendaEvent {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
  notes: string | null;
  event_type: AgendaEventType;
  status: AgendaEventStatus;
  phone_country_code: string | null;
  phone_number: string | null;
  reminder_date: string | null;
  reminder_time: string | null;
  created_at: string;
  created_by: string | null;
}

const EVENT_TYPE_COLORS: Record<AgendaEventType, string> = {
  audiencia: "bg-red-500",
  tarefa: "bg-green-500",
  consultoria: "bg-yellow-500",
  manual: "bg-blue-500",
};

export function getEventColor(type: AgendaEventType) {
  return EVENT_TYPE_COLORS[type] ?? "bg-gray-500";
}

export function useAgendaEvents(dateRange?: { start: string; end: string }) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ["agenda-events", companyId, dateRange],
    queryFn: async (): Promise<AgendaEvent[]> => {
      if (!companyId) return [];
      let query = supabase
        .from("agenda")
        .select("*")
        .eq("company_id", companyId)
        .order("event_date", { ascending: true })
        .order("event_time", { ascending: true });

      if (dateRange?.start) query = query.gte("event_date", dateRange.start);
      if (dateRange?.end) query = query.lte("event_date", dateRange.end);

      const { data, error } = await query;
      if (error) {
        console.error("[useAgendaEvents] error:", error);
        return [];
      }
      return (data ?? []) as AgendaEvent[];
    },
    enabled: !!companyId,
  });
}

export function useCreateAgendaEvent() {
  const qc = useQueryClient();
  const handleError = useSupabaseErrorHandler();
  const { profile, isSuperAdmin } = useAuth();
  const companyIdRaw = useCompanyId();

  const getCompanyId = () => {
    if (isSuperAdmin) return companyIdRaw;
    return profile?.company_id ?? companyIdRaw ?? null;
  };

  return useMutation({
    mutationFn: async (input: Omit<AgendaEvent, "id" | "created_at" | "created_by">) => {
      const companyId = getCompanyId();
      if (!companyId) throw new Error("Empresa nÃ£o configurada");

      const { data, error } = await supabase
        .from("agenda")
        .insert({
          ...input,
          company_id: companyId,
          event_type: input.event_type,
          status: "scheduled" as const,
          created_by: profile?.id ?? null,
        } as never)
        .select()
        .single();

      if (error) throw error;
      const createdEvent = data as AgendaEvent;

      void (async () => {
        try {
          const profissionalPhone = [createdEvent.phone_country_code, createdEvent.phone_number]
            .filter(Boolean)
            .join("")
            .trim();

          const profissionalContacto = [profile?.phone_country_code, profile?.phone_number]
            .filter(Boolean)
            .join("")
            .trim();

          const payload = {
            agenda_event_id: createdEvent.id,
            title: createdEvent.title,
            description: createdEvent.description || "",
            event_date: createdEvent.event_date,
            event_time: createdEvent.event_time || null,
            location: createdEvent.location || null,
            notes: createdEvent.notes || null,
            event_type: createdEvent.event_type,
            reminder_date: createdEvent.reminder_date || null,
            reminder_time: createdEvent.reminder_time || null,
            profissional_phone: profissionalPhone || "",
            profissional_contacto: profissionalContacto || "",
          };

          const result: WebhookResult | null = await sendWebhook(
            "agenda.created",
            createdEvent.company_id,
            profile?.id ?? "",
            payload,
          );

          if (result && !result.sent) {
            console.error(`[Agenda] webhook failed: ${result.error}`);
          }
        } catch (webhookError) {
          console.error("[Agenda] Falha ao enviar webhook n8n:", webhookError);
        }
      })();

      return createdEvent;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda-events"] });
      toast.success("Evento criado");
    },
    onError: (e: Error) => handleError(e, { operation: "INSERT", table: "agenda" }),
  });
}

export function useUpdateAgendaEvent() {
  const qc = useQueryClient();
  const handleError = useSupabaseErrorHandler();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AgendaEvent> & { id: string }) => {
      const { error } = await supabase
        .from("agenda")
        .update(updates as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda-events"] });
      toast.success("Evento atualizado");
    },
    onError: (e: Error) => handleError(e, { operation: "UPDATE", table: "agenda" }),
  });
}

export function useDeleteAgendaEvent() {
  const qc = useQueryClient();
  const handleError = useSupabaseErrorHandler();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agenda").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda-events"] });
      toast.success("Evento removido");
    },
    onError: (e: Error) => handleError(e, { operation: "DELETE", table: "agenda" }),
  });
}
