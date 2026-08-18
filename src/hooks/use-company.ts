import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyId } from "./use-profile-company";
import { supabase } from "@/integrations/supabase/client";

export function useActiveCompany() {
  const { loading } = useAuth();
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ["profile-company", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .maybeSingle();
      return data ?? null;
    },
    enabled: !!companyId && !loading,
    staleTime: 60_000,
  });
}
