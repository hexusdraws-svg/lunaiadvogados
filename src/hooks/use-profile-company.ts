import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { handleSupabaseError } from "@/lib/supabase-error-handler";

export function useCompanyId(): string | null {
  const { profile, isSuperAdmin } = useAuth();
  // Super Admin does not belong to any company
  if (isSuperAdmin) return null;
  return profile?.company_id ?? null;
}

export function useProfileCompany() {
  const { profile, loading } = useAuth();
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ["profile-company", companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .maybeSingle();

      if (error) {
        console.error("[useProfileCompany] query error:", error);
        handleSupabaseError(error, { operation: "SELECT", table: "companies" });
        return null;
      }

      return data;
    },
    enabled: !!companyId && !loading,
    staleTime: 60_000,
  });
}
