import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async (values: {
      full_name?: string;
      phone_country_code?: string | null;
      phone_number?: string | null;
      avatar_url?: string | null;
    }) => {
      if (!user?.id) throw new Error("Utilizador não autenticado");

      const { data, error } = await supabase
        .from("profiles")
        .update({
          ...values,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["profile-company"] });
      toast.success("Perfil atualizado com sucesso");
    },
    onError: (e: Error) => {
      console.error("[useUpdateProfile] error:", e);
      toast.error("Erro ao atualizar perfil");
    },
  });
}
