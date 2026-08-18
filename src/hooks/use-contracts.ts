import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyId } from "@/hooks/use-profile-company";
import { handleSupabaseError } from "@/lib/supabase-error-handler";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export type ContractStatus = "draft" | "sent" | "signed" | "cancelled";

export type Contract = {
  id: string;
  company_id: string | null;
  nome: string | null;
  numero: string | null;
  tipo: string | null;
  status: string;
  html_final: string;
  template_id: string | null;
  template_nome: string | null;
  cliente_id: string | null;
  cliente_nome: string | null;
  cliente_data: Json;
  processo_id: string | null;
  variables: Json;
  created_at: string;
  updated_at: string | null;
};

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  signed: "Assinado",
  cancelled: "Cancelado",
};

/* ------------------------------------------------------------------ */
/* LIST                                                                 */
/* ------------------------------------------------------------------ */

export function useContracts(filters?: { search?: string; status?: string }) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ["contratos", companyId, filters],
    queryFn: async () => {
      if (!companyId) return [];
      try {
        let q = supabase
          .from("contracts")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false });

        if (filters?.status && filters.status !== "all") {
          q = q.eq("status", filters.status);
        }
        if (filters?.search) {
          q = q.or(`nome.ilike.%${filters.search}%,cliente_nome.ilike.%${filters.search}%`);
        }

        const { data, error } = await q;
        if (error) {
          console.error("[useContracts] query error:", error);
          handleSupabaseError(error, { operation: "SELECT", table: "contracts" });
          return [];
        }
        return (data ?? []) as Contract[];
      } catch (e) {
        console.error("[useContracts] unexpected error:", e);
        return [];
      }
    },
    enabled: !!companyId,
  });
}

/** Contracts linked to a given processo (via processo_id). */
export function useContractsByProcesso(processoId: string | undefined) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ["contratos-by-processo", companyId, processoId],
    queryFn: async () => {
      if (!companyId || !processoId) return [];
      try {
        const { data, error } = await supabase
          .from("contracts")
          .select("*")
          .eq("company_id", companyId)
          .eq("processo_id", processoId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("[useContractsByProcesso] query error:", error);
          handleSupabaseError(error, { operation: "SELECT", table: "contracts" });
          return [];
        }
        return (data ?? []) as Contract[];
      } catch (e) {
        console.error("[useContractsByProcesso] unexpected error:", e);
        return [];
      }
    },
    enabled: !!companyId && !!processoId,
  });
}

/** Processos list for the contract wizard dropdown. */
export function useProcessosForContracts() {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ["processos-for-contracts", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("processos")
        .select("id, numero, cliente_nome, tipo")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[useProcessosForContracts] query error:", error);
        handleSupabaseError(error, { operation: "SELECT", table: "processos" });
        return [];
      }
      return (data ?? []) as {
        id: string;
        numero: string | null;
        cliente_nome: string | null;
        tipo: string | null;
      }[];
    },
    enabled: !!companyId,
  });
}

/* ------------------------------------------------------------------ */
/* MUTATIONS                                                            */
/* ------------------------------------------------------------------ */

type ContractInput = {
  nome: string;
  numero?: string | null;
  tipo?: string | null;
  status?: string;
  html_final: string;
  template_id?: string | null;
  template_nome?: string | null;
  cliente_id?: string | null;
  cliente_nome?: string | null;
  cliente_data?: Json;
  processo_id?: string | null;
  variables?: Json;
};

export function useCreateContract() {
  const qc = useQueryClient();
  const { profile, isSuperAdmin } = useAuth();

  return useMutation({
    mutationFn: async (values: ContractInput) => {
      const currentCompanyId = isSuperAdmin ? null : (profile?.company_id ?? null);
      if (!currentCompanyId) throw new Error("Empresa não configurada");

      const payload = {
        company_id: currentCompanyId,
        nome: values.nome,
        numero: values.numero ?? null,
        tipo: values.tipo ?? null,
        status: values.status || "draft",
        html_final: values.html_final,
        template_id: values.template_id ?? null,
        template_nome: values.template_nome ?? null,
        cliente_id: values.cliente_id ?? null,
        cliente_nome: values.cliente_nome ?? null,
        cliente_data: values.cliente_data ?? {},
        processo_id: values.processo_id ?? null,
        variables: values.variables ?? {},
      };

      const { data, error } = await supabase
        .from("contracts")
        .insert(payload as never)
        .select()
        .single();

      if (error) throw error;
      return data as Contract;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contratos"] });
      qc.invalidateQueries({ queryKey: ["contratos-by-processo"] });
      qc.invalidateQueries({ queryKey: ["list-contratos"] });
      toast.success("Contrato guardado com sucesso");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "INSERT", table: "contracts" });
    },
  });
}

export function useUpdateContract() {
  const qc = useQueryClient();
  const { profile, isSuperAdmin } = useAuth();

  return useMutation({
    mutationFn: async (values: ContractInput & { id: string }) => {
      const currentCompanyId = isSuperAdmin ? null : (profile?.company_id ?? null);

      const payload: Record<string, unknown> = {
        nome: values.nome,
        numero: values.numero ?? null,
        tipo: values.tipo ?? null,
        status: values.status,
        html_final: values.html_final,
        template_id: values.template_id ?? null,
        template_nome: values.template_nome ?? null,
        cliente_id: values.cliente_id ?? null,
        cliente_nome: values.cliente_nome ?? null,
        cliente_data: values.cliente_data ?? {},
        processo_id: values.processo_id ?? null,
        variables: values.variables ?? {},
      };

      let q = supabase.from("contracts").update(payload as never).eq("id", values.id);

      const { data, error } = await q.select().single();
      if (error) throw error;
      return data as Contract;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contratos"] });
      qc.invalidateQueries({ queryKey: ["contratos-by-processo"] });
      qc.invalidateQueries({ queryKey: ["list-contratos"] });
      toast.success("Contrato atualizado com sucesso");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "UPDATE", table: "contracts" });
    },
  });
}

export function useDeleteContract() {
  const qc = useQueryClient();
  const { profile, isSuperAdmin } = useAuth();
  const companyId = isSuperAdmin ? null : (profile?.company_id ?? null);

  return useMutation({
    mutationFn: async (id: string) => {
      let q = supabase.from("contracts").delete().eq("id", id);
      if (companyId) {
        q = q.eq("company_id", companyId);
      }
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contratos"] });
      qc.invalidateQueries({ queryKey: ["contratos-by-processo"] });
      qc.invalidateQueries({ queryKey: ["list-contratos"] });
      toast.success("Contrato eliminado com sucesso");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "DELETE", table: "contracts" });
    },
  });
}
