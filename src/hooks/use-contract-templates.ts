import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyId } from "@/hooks/use-profile-company";
import { handleSupabaseError } from "@/lib/supabase-error-handler";
import { toast } from "sonner";

export type ContractTemplateStatus = "active" | "archived";

export type ContractTemplate = {
  id: string;
  company_id: string | null;
  nome: string;
  tipo: string | null;
  description: string | null;
  category: string;
  status: ContractTemplateStatus;
  author_id: string | null;
  variables: string[] | null;
  is_system: boolean;
  html_content: string;
  created_at: string;
  updated_at: string;
};

export const CONTRACT_CATEGORIES = [
  "Direito Civil",
  "Direito Comercial",
  "Direito Laboral",
  "Direito Penal",
  "Direito da Família",
  "Procuração",
  "Outros",
] as const;

export function useContractTemplates(filters?: {
  status?: ContractTemplateStatus | "all";
  category?: string;
  search?: string;
}) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ["contract-templates", companyId, filters],
    queryFn: async () => {
      if (!companyId) return [];
      try {
        let q = supabase
          .from("contract_templates")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false });

        if (filters?.status && filters.status !== "all") {
          q = q.eq("status", filters.status);
        }
        if (filters?.category) {
          q = q.eq("category", filters.category);
        }
        if (filters?.search) {
          q = q.ilike("nome", `%${filters.search}%`);
        }

        const { data, error } = await q;
        if (error) {
          console.error("[useContractTemplates] query error:", error);
          handleSupabaseError(error, { operation: "SELECT", table: "contract_templates" });
          return [];
        }
        return (data ?? []) as ContractTemplate[];
      } catch (e) {
        console.error("[useContractTemplates] unexpected error:", e);
        return [];
      }
    },
    enabled: !!companyId,
  });
}

export function useCreateContractTemplate() {
  const qc = useQueryClient();
  const { profile, isSuperAdmin } = useAuth();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: async (values: {
      nome: string;
      tipo?: string | null;
      description?: string | null;
      category: string;
      status?: ContractTemplateStatus;
      html_content: string;
      variables?: string[];
      is_system?: boolean;
    }) => {
      const getCompanyId = () => (isSuperAdmin ? null : (profile?.company_id ?? null));
      const currentCompanyId = getCompanyId();
      if (!currentCompanyId) throw new Error("Empresa não configurada");

      const payload = {
        company_id: currentCompanyId,
        nome: values.nome,
        tipo: values.tipo ?? null,
        description: values.description ?? null,
        category: values.category,
        status: values.status || "active",
        html_content: values.html_content,
        variables: values.variables ?? [],
        is_system: values.is_system ?? false,
        author_id: profile?.id || null,
      };

      const { data, error } = await supabase
        .from("contract_templates")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data as ContractTemplate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract-templates"] });
      toast.success("Modelo criado com sucesso");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "INSERT", table: "contract_templates" });
    },
  });
}

export function useUpdateContractTemplate() {
  const qc = useQueryClient();
  const { profile, isSuperAdmin } = useAuth();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: async (values: {
      id: string;
      nome?: string;
      tipo?: string | null;
      description?: string | null;
      category?: string;
      status?: ContractTemplateStatus;
      html_content?: string;
      variables?: string[];
      is_system?: boolean;
    }) => {
      const getCompanyId = () => (isSuperAdmin ? null : (profile?.company_id ?? null));
      const currentCompanyId = getCompanyId();

      const payload: Record<string, unknown> = {
        nome: values.nome,
        tipo: values.tipo ?? null,
        description: values.description ?? null,
        category: values.category,
        status: values.status,
        html_content: values.html_content,
        variables: values.variables ?? [],
        is_system: values.is_system ?? false,
        updated_at: new Date().toISOString(),
      };

      let q = supabase.from("contract_templates").update(payload as never).eq("id", values.id);
      if (currentCompanyId) {
        q = q.eq("company_id", currentCompanyId);
      }

      const { data, error } = await q.select().single();
      if (error) throw error;
      return data as ContractTemplate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract-templates"] });
      toast.success("Modelo atualizado com sucesso");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "UPDATE", table: "contract_templates" });
    },
  });
}

export function useDeleteContractTemplate() {
  const qc = useQueryClient();
  const { profile, isSuperAdmin } = useAuth();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: async (id: string) => {
      const getCompanyId = () => (isSuperAdmin ? null : (profile?.company_id ?? null));
      const currentCompanyId = getCompanyId();

      let q = supabase.from("contract_templates").delete().eq("id", id);
      if (currentCompanyId) {
        q = q.eq("company_id", currentCompanyId);
      }

      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract-templates"] });
      toast.success("Modelo eliminado com sucesso");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "DELETE", table: "contract_templates" });
    },
  });
}

export function useDuplicateContractTemplate() {
  const qc = useQueryClient();
  const { profile, isSuperAdmin } = useAuth();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: async (id: string) => {
      const getCompanyId = () => (isSuperAdmin ? null : (profile?.company_id ?? null));
      const currentCompanyId = getCompanyId();
      if (!currentCompanyId) throw new Error("Empresa não configurada");

      const { data: original, error: fetchError } = await supabase
        .from("contract_templates")
        .select("*")
        .eq("id", id)
        .eq("company_id", currentCompanyId)
        .single();

      if (fetchError || !original) throw new Error("Modelo não encontrado");

      const { data, error } = await supabase
        .from("contract_templates")
        .insert({
          ...original,
          id: undefined,
          nome: `${original.nome} (cópia)`,
          created_at: undefined,
          updated_at: undefined,
          author_id: profile?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ContractTemplate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract-templates"] });
      toast.success("Modelo duplicado com sucesso");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "INSERT", table: "contract_templates" });
    },
  });
}
