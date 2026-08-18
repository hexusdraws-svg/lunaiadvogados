import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export function useHiddenProcesses() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["hidden-processes", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("process_hidden_users")
        .select("process_id")
        .eq("user_id", profile.id);

      if (error) {
        console.error("[useHiddenProcesses] error:", error);
        return [];
      }
      return (data ?? []).map((h) => h.process_id);
    },
    enabled: !!profile?.id,
    staleTime: 60_000,
  });
}

export function useHideProcess() {
  const qc = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (processId: string) => {
      if (!profile?.id) throw new Error("Utilizador não autenticado");
      const { error } = await supabase
        .from("process_hidden_users")
        .insert({ process_id: processId, user_id: profile.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["processos"] });
      qc.invalidateQueries({ queryKey: ["hidden-processes", profile?.id] });
      toast.success("Processo ocultado do seu painel.");
    },
    onError: (e: Error) => {
      console.error("[useHideProcess] error:", e);
      toast.error("Não foi possível ocultar o processo.");
    },
  });
}

export function useUnhideProcess() {
  const qc = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (processId: string) => {
      if (!profile?.id) throw new Error("Utilizador não autenticado");
      const { error } = await supabase
        .from("process_hidden_users")
        .delete()
        .eq("process_id", processId)
        .eq("user_id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["processos"] });
      qc.invalidateQueries({ queryKey: ["hidden-processes", profile?.id] });
      toast.success("Processo voltou a ser visível.");
    },
    onError: (e: Error) => {
      console.error("[useUnhideProcess] error:", e);
      toast.error("Não foi possível mostrar o processo.");
    },
  });
}
