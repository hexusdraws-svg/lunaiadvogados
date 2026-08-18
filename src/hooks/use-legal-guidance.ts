import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyId } from "@/hooks/use-profile-company";
import { handleSupabaseError } from "@/lib/supabase-error-handler";
import { toast } from "sonner";

export type LegalGuidanceStatus = "processing" | "completed" | "failed";

export type LegalGuidance = {
  id: string;
  company_id: string | null;
  hearing_id: string;
  process_id: string | null;
  status: string;
  summary: string | null;
  legal_analysis: string | null;
  recommended_strategy: string | null;
  probable_questions: unknown | null;
  jurisprudence: unknown | null;
  important_points: unknown | null;
  next_steps: unknown | null;
  audio_url: string | null;
  generated_by: string | null;
  model_used: string | null;
  tokens_used: number | null;
  generation_time: number | null;
  created_at: string;
  updated_at: string;
};

export type LegalGuidanceInsert = {
  company_id?: string | null;
  hearing_id: string;
  process_id?: string | null;
  status?: string;
  summary?: string | null;
  legal_analysis?: string | null;
  recommended_strategy?: string | null;
  probable_questions?: unknown | null;
  jurisprudence?: unknown | null;
  important_points?: unknown | null;
  next_steps?: unknown | null;
  audio_url?: string | null;
  generated_by?: string | null;
  model_used?: string | null;
  tokens_used?: number | null;
  generation_time?: number | null;
};

export type LegalGuidanceUpdate = Partial<LegalGuidanceInsert>;

// Buscar orientação por hearing_id (LIMIT 1)
export function useLegalGuidanceByHearing(hearingId: string | null) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ["legal-guidance", "hearing", hearingId],
    queryFn: async () => {
      if (!hearingId) return null;
      console.log("Opening guidance");
      console.log("Searching guidance for hearing:", hearingId);
      const { data, error } = await supabase
        .from("legal_guidance")
        .select("*")
        .eq("hearing_id", hearingId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log("Supabase result:", data);
      console.log("Supabase error:", error);
      if (Array.isArray(data)) {
        console.log("Rows:", data.length);
      } else {
        console.log("Rows:", data ? 1 : 0);
      }

      if (error) {
        console.error("[useLegalGuidanceByHearing] query error:", error);
        return null;
      }
      if (data) {
        console.log("Guidance found:", data);
      } else {
        console.log("No guidance found");
      }
      return data as LegalGuidance | null;
    },
    enabled: !!hearingId,
    staleTime: 10_000,
    refetchInterval: (query) => {
      const status = (query.state.data as LegalGuidance | null)?.status;
      if (status === "processing") return 4000;
      return false;
    },
  });
}

// Realtime: quando o N8N inserir/atualizar orientação, invalidar cache automaticamente
export function useLegalGuidanceRealtime(hearingId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!hearingId) return;
    const channelName = `legal-guidance-${hearingId}`;

    const setupRealtime = async () => {
      try {
        await supabase.removeChannel(channelName);
      } catch {
        // ignore cleanup errors
      }

      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "legal_guidance",
            filter: `hearing_id=eq.${hearingId}`,
          },
          (payload) => {
            console.log("Realtime update received", payload);
            qc.invalidateQueries({ queryKey: ["legal-guidance", "hearing", hearingId] });
          },
        );

      try {
        channel.subscribe();
      } catch (err) {
        console.error("[useLegalGuidanceRealtime] subscribe error:", err);
      }
    };

    let isActive = true;

    setupRealtime().then(() => {
      if (!isActive) {
        supabase.removeChannel(channelName);
      }
    });

    return () => {
      isActive = false;
      try {
        supabase.removeChannel(channelName);
      } catch {
        // ignore cleanup errors
      }
    };
  }, [hearingId, qc]);
}

export function useCreateLegalGuidance() {
  const qc = useQueryClient();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: async (values: LegalGuidanceInsert) => {
      const { data, error } = await supabase
        .from("legal_guidance")
        .insert({
          company_id: values.company_id ?? companyId ?? null,
          hearing_id: values.hearing_id,
          process_id: values.process_id ?? null,
          status: values.status ?? "processing",
          summary: values.summary ?? null,
          legal_analysis: values.legal_analysis ?? null,
          recommended_strategy: values.recommended_strategy ?? null,
          probable_questions: values.probable_questions ?? null,
          jurisprudence: values.jurisprudence ?? null,
          important_points: values.important_points ?? null,
          next_steps: values.next_steps ?? null,
          audio_url: values.audio_url ?? null,
          generated_by: values.generated_by ?? null,
          model_used: values.model_used ?? null,
          tokens_used: values.tokens_used ?? null,
          generation_time: values.generation_time ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as LegalGuidance;
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["legal-guidance", "hearing", created.hearing_id] });
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "INSERT", table: "legal_guidance" });
    },
  });
}

export function useUpdateLegalGuidance() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: LegalGuidanceUpdate }) => {
      const { data, error } = await supabase
        .from("legal_guidance")
        .update(values as never)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as LegalGuidance;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["legal-guidance", "hearing", updated.hearing_id] });
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "UPDATE", table: "legal_guidance" });
    },
  });
}

// Agrupador que disponibiliza tudo num único hook useLegalGuidance()
export function useLegalGuidance(hearingId: string | null) {
  const query = useLegalGuidanceByHearing(hearingId);
  useLegalGuidanceRealtime(hearingId);

  return {
    guidance: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    status: query.data?.status ?? null,
  };
}
