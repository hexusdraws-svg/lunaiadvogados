import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/use-profile-company";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { handleSupabaseError } from "@/lib/supabase-error-handler";

export type ProcessoNota = {
  id: string;
  processo_id: string;
  titulo: string;
  conteudo: string;
  tipo: "nota" | "alerta" | "lembrete";
  company_id?: string | null;
  created_at: string;
  updated_at: string;
};

export function useNotasPorProcesso(processoId: string | null) {
  const companyId = useCompanyId();
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["processo-notas", processoId, companyId],
    queryFn: async () => {
      if (!processoId) return [];

      let q = supabase
        .from("processo_historico")
        .select("*")
        .eq("processo_id", processoId)
        .in("tipo", ["nota", "alerta", "lembrete", "comentario"])
        .order("created_at", { ascending: false });

      if (companyId) {
        q = q.eq("company_id", companyId);
      }

      const { data, error } = await q;
      if (error) {
        console.error("[useNotasPorProcesso] query error:", error);
        return [];
      }

      const notas = (data ?? []) as unknown as ProcessoNota[];
      return notas;
    },
    enabled: !!processoId,
    staleTime: 30_000,
  });
}

export function useCreateNota(processoId: string) {
  const qc = useQueryClient();
  const companyId = useCompanyId();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      titulo,
      conteudo,
      tipo,
    }: {
      titulo: string;
      conteudo: string;
      tipo?: "nota" | "alerta" | "lembrete";
    }) => {
      const finalCompanyId = companyId ?? (profile?.company_id ?? null);
      if (!finalCompanyId) throw new Error("Empresa não configurada");
      if (!profile?.id) throw new Error("Utilizador não autenticado");

      const payload = {
        processo_id: processoId,
        etapa_id: null,
        tarefa_id: null,
        tipo: tipo ?? "nota",
        descricao: `${titulo}\n\n${conteudo}`,
        company_id: finalCompanyId,
      };

      const { data, error } = await supabase
        .from("processo_historico")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ProcessoNota;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["processo-notas", processoId] });
      qc.invalidateQueries({ queryKey: ["processo-historico", processoId] });
      toast.success("Nota guardada");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "INSERT", table: "processo_historico" });
    },
  });
}

export function useUpdateNota(processoId: string) {
  const qc = useQueryClient();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: async ({
      id,
      titulo,
      conteudo,
      tipo,
    }: {
      id: string;
      titulo: string;
      conteudo: string;
      tipo?: "nota" | "alerta" | "lembrete";
    }) => {
      let q = supabase
        .from("processo_historico")
        .update({
          descricao: `${titulo}\n\n${conteudo}`,
          tipo: tipo ?? "nota",
        })
        .eq("id", id);

      if (companyId) {
        q = q.eq("company_id", companyId);
      }

      const { data, error } = await q.select().single();
      if (error) throw error;
      return data as unknown as ProcessoNota;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["processo-notas", processoId] });
      qc.invalidateQueries({ queryKey: ["processo-historico", processoId] });
      toast.success("Nota actualizada");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "UPDATE", table: "processo_historico" });
    },
  });
}

export function useDeleteNota(processoId: string) {
  const qc = useQueryClient();
  const { profile, isSuperAdmin } = useAuth();
  const companyId = isSuperAdmin ? null : (profile?.company_id ?? null);

  return useMutation({
    mutationFn: async (id: string) => {
      let q = supabase.from("processo_historico").delete().eq("id", id);
      if (companyId) {
        q = q.eq("company_id", companyId);
      }
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["processo-notas", processoId] });
      qc.invalidateQueries({ queryKey: ["processo-historico", processoId] });
      toast.success("Nota removida");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "DELETE", table: "processo_historico" });
    },
  });
}
