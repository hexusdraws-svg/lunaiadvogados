import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/use-profile-company";

/**
 * Single source of truth for "clientes" across the app.
 *
 * This is EXACTLY the same query used by the "Clientes" page
 * (queryKey ["clientes-all", companyId]), so the contract wizard and the
 * Clientes page share the same cache — opening the selector reuses the already
 * loaded data instead of hitting Supabase again.
 */
export type UseCliente = {
  id: string;
  nome: string | null;
  documento: string | null;
  tipo_documento: string | null;
  data_emissao: string | null;
  data_validade: string | null;
  local_emissao: string | null;
  nacionalidade: string | null;
  naturalidade: string | null;
  contacto: string | null;
  email: string | null;
  endereco: string | null;
  cidade: string | null;
  provincia: string | null;
  pais: string | null;
  estado_civil: string | null;
  profissao: string | null;
  data_nascimento: string | null;
  observacoes: string | null;
  empresa: string | null;
  estado: string;
  created_by: string | null;
  company_id: string | null;
  created_at: string;
};

export function useClientes() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ["clientes-all", companyId],
    queryFn: async () => {
      if (!companyId) return [] as UseCliente[];
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as UseCliente[];
    },
    enabled: !!companyId,
  });
}

/** Profiles of the company, used to resolve the "advogado responsável" name. */
export function useProfilesForClientes() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ["profiles-for-clientes-list", companyId],
    queryFn: async () => {
      if (!companyId) return [] as Array<{ id: string; full_name: string | null }>;
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("company_id", companyId);
      return (data ?? []) as Array<{ id: string; full_name: string | null }>;
    },
    enabled: !!companyId,
  });
}
