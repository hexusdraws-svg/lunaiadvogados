import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyId } from "@/hooks/use-profile-company";
import { handleSupabaseError } from "@/lib/supabase-error-handler";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export type FinancialTransaction = Tables<"financial_transactions">;

// Unified transaction type for the table component
export type Transaction = FinancialTransaction;

// Unified hook that selects receitas or despesas based on type
export function useFinancialTransactions(type: TransactionType) {
  if (type === "receita") {
    return useFinancialReceitas();
  }
  return useFinancialDespesas();
}

export type TransactionFrequency =
  | "nenhum"
  | "semanal"
  | "quinzenal"
  | "mensal"
  | "trimestral"
  | "semestral"
  | "anual";

export type PaymentMethod =
  | "dinheiro"
  | "transferencia"
  | "mpesa"
  | "emola"
  | "cartao"
  | "cheque"
  | "outro";

export type TransactionType = "receita" | "despesa";

export type TransactionStatus = "aberto" | "recebido" | "pago";

// Hook para receitas
export function useFinancialReceitas() {
  const { profile, isSuperAdmin } = useAuth();
  const companyId = isSuperAdmin ? null : (profile?.company_id ?? null);

  return useQuery({
    queryKey: ["financial-receitas", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("company_id", companyId)
        .eq("transaction_type", "income")
        .order("due_date", { ascending: false });

      if (error) {
        handleSupabaseError(error, { operation: "SELECT", table: "financial_transactions" });
        return [];
      }

      // Normalize status from DB to UI format
      return (data ?? []).map((t) => ({
        ...t,
        status: normalizeStatus(t.status as DbTransactionStatus),
      })) as FinancialTransaction[];
    },
    enabled: !!companyId,
    staleTime: 5 * 60_000,
  });
}

// Hook para despesas
export function useFinancialDespesas() {
  const { profile, isSuperAdmin } = useAuth();
  const companyId = isSuperAdmin ? null : (profile?.company_id ?? null);

  return useQuery({
    queryKey: ["financial-despesas", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("company_id", companyId)
        .eq("transaction_type", "expense")
        .order("due_date", { ascending: false });

      if (error) {
        handleSupabaseError(error, { operation: "SELECT", table: "financial_transactions" });
        return [];
      }

      // Normalize status from DB to UI format
      return (data ?? []).map((t) => ({
        ...t,
        status: normalizeStatus(t.status as DbTransactionStatus),
      })) as FinancialTransaction[];
    },
    enabled: !!companyId,
    staleTime: 5 * 60_000,
  });
}

export function useClientsForSelect() {
  const { profile, isSuperAdmin } = useAuth();
  const companyId = isSuperAdmin ? null : (profile?.company_id ?? null);

  return useQuery({
    queryKey: ["clients-for-financas", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome")
        .eq("company_id", companyId)
        .order("nome");

      if (error) throw error;
      return (data ?? []).map((c) => ({
        id: c.id,
        name: c.nome,
      }));
    },
    enabled: !!companyId,
  });
}

export function useProfessionalsForSelect() {
  const { profile, isSuperAdmin } = useAuth();
  const companyId = isSuperAdmin ? null : (profile?.company_id ?? null);

  return useQuery({
    queryKey: ["professionals-for-financas", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, professional_role, role")
        .eq("company_id", companyId)
        .not("professional_role", "is", null)
        .order("full_name");

      if (error) throw error;
      return (data ?? []).map((p) => ({
        id: p.id,
        name: p.full_name ?? "—",
        role: p.professional_role ?? p.role,
      }));
    },
    enabled: !!companyId,
  });
}

export function useProcessesForClient(clientId: string | null) {
  const { profile, isSuperAdmin } = useAuth();
  const companyId = isSuperAdmin ? null : (profile?.company_id ?? null);

  return useQuery({
    queryKey: ["processos-for-client", companyId, clientId],
    queryFn: async () => {
      if (!companyId || !clientId) return [];
      const { data, error } = await supabase
        .from("processos")
        .select("id, numero, tipo")
        .eq("company_id", companyId)
        .eq("cliente_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as { id: string; numero: string; tipo: string }[];
    },
    enabled: !!companyId && !!clientId,
  });
}

export function useTransactionFeeSplit(recebimentoId: string | null) {
  const { profile, isSuperAdmin } = useAuth();
  const companyId = isSuperAdmin ? null : (profile?.company_id ?? null);

  return useQuery({
    queryKey: ["transaction-fee-split", companyId, recebimentoId],
    queryFn: async () => {
      if (!companyId || !recebimentoId) return [];
      const { data, error } = await supabase
        .from("financial_transactions")
        .select(
          "id, professional_id, amount, description, professional_name",
        )
        .eq("process_id", recebimentoId)
        .eq("fee_split_enabled", true)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: row.id,
        profissional_id: row.professional_id,
        percentagem: row.description ? parseFloat(row.description) : 0,
        valor_calculado: row.amount,
        profissional_nome: row.professional_name ?? "—",
      }));
    },
    enabled: !!companyId && !!recebimentoId,
  });
}

export function useDeleteTransactionFeeSplit() {
  const qc = useQueryClient();
  const { profile, isSuperAdmin } = useAuth();
  const getCompanyId = () => {
    if (isSuperAdmin) return null;
    return profile?.company_id ?? null;
  };

  return useMutation({
    mutationFn: async (splitId: string) => {
      const companyId = getCompanyId();
      let q = supabase.from("financial_transactions").delete().eq("id", splitId);
      if (companyId) {
        q = q.eq("company_id", companyId);
      }
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transaction-fee-split"] });
      toast.success("Divisão eliminada");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "DELETE", table: "financial_transactions" });
    },
  });
}

// Status values that match the database CHECK constraint
export type DbTransactionStatus = "pending" | "paid" | "cancelled" | "overdue";

// UI status values (portuguese) - mapped to DB values
export const statusToDb: Record<string, DbTransactionStatus> = {
  aberto: "pending",
  recebido: "paid",
  pago: "paid",
  vencido: "overdue",
};

// DB status values mapped back to UI (portuguese)
export const statusToUi: Record<DbTransactionStatus, TransactionStatus> = {
  pending: "aberto",
  paid: "recebido",
  overdue: "aberto", // overdue is still "aberto" but marked as vencido in UI
  cancelled: "aberto", // treat cancelled as aberto in UI
};

// Helper to normalize status from DB to UI
export function normalizeStatus(dbStatus: DbTransactionStatus | string | null): TransactionStatus {
  if (!dbStatus) return "aberto";
  return statusToUi[dbStatus as DbTransactionStatus] ?? "aberto";
}

interface TransactionForm {
  description: string;
  amount: string;
  client_id: string | null;
  client_name: string | null;
  process_id?: string | null;
  professional_id: string | null;
  professional_name: string | null;
  due_date: string;
  payment_date?: string | null;
  frequency: TransactionFrequency;
  attachment_url?: string | null;
  attachment_type?: "pdf" | "image" | null;
  status?: TransactionStatus;
  payment_method?: PaymentMethod;
  expense_category?: string;
  fee_split_enabled?: boolean;
  fee_split?: Array<{ professional_id: string; percentage: number }>;
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  const { profile, isSuperAdmin } = useAuth();

  // Derive companyId at mutation execution time, not hook initialization time
  const getCompanyId = () => {
    if (isSuperAdmin) return null;
    return profile?.company_id ?? null;
  };

  return useMutation({
    mutationFn: async ({
      values,
      type,
      expense_category,
    }: {
      values: TransactionForm;
      type: TransactionType;
      expense_category?: string;
    }) => {
      const companyId = getCompanyId();
      if (!companyId) throw new Error("Empresa não configurada");

      // Map UI status to DB status
      const dbStatus = statusToDb[values.status ?? "aberto"] ?? "pending";
      // Map UI type to DB type
      const dbType = type === "receita" ? "income" : "expense";

      const commonPayload = {
        description: values.description,
        amount: parseFloat(values.amount),
        status: dbStatus,
        due_date: values.due_date,
        payment_date: values.payment_date,
        frequency: values.frequency,
        attachment_url: values.attachment_url,
        attachment_type: values.attachment_type,
        payment_method: values.payment_method,
        company_id: companyId,
        transaction_type: dbType,
        created_by: profile?.id || null,
      };

      if (type === "despesa") {
        const payload = {
          ...commonPayload,
          expense_category: expense_category || null,
          professional_id: values.professional_id || null,
          professional_name: values.professional_name || null,
        };
        const { error } = await supabase.from("financial_transactions").insert(payload);
        if (error) throw error;
      } else {
        const payload = {
          ...commonPayload,
          client_id: values.client_id || null,
          client_name: values.client_name || null,
          process_id: values.process_id || null,
          fee_split_enabled: values.fee_split_enabled ?? false,
        };
        const { data, error } = await supabase
          .from("financial_transactions")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;

        if (
          values.fee_split_enabled &&
          values.fee_split &&
          values.fee_split.length > 0 &&
          data.id
        ) {
          const totalPercentage = values.fee_split.reduce((sum, item) => sum + item.percentage, 0);
          if (totalPercentage > 100) {
            throw new Error("A soma das percentagens não pode ultrapassar 100%.");
          }

          const amount = parseFloat(values.amount);
          const splits = values.fee_split.map((item) => ({
            company_id: companyId,
            process_id: data.id,
            professional_id: item.professional_id,
            amount: (amount * item.percentage) / 100,
            description: `Fee split - ${item.percentage}%`,
            transaction_type: "income",
            status: "pending",
            due_date: new Date().toISOString().split('T')[0],
            fee_split_enabled: true,
          }));

          const { error: splitError } = await supabase
            .from("financial_transactions")
            .insert(splits);
          if (splitError) throw splitError;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial-receitas", getCompanyId()] });
      qc.invalidateQueries({ queryKey: ["financial-despesas", getCompanyId()] });
      toast.success("Transação criada com sucesso");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "INSERT" });
    },
  });
}

export function useUpdateTransactionStatus() {
  const qc = useQueryClient();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      type,
    }: {
      id: string;
      status: TransactionStatus;
      type?: TransactionType;
    }) => {
      const table = "financial_transactions";
      const dbStatus = statusToDb[status] ?? "pending";
      let q = supabase.from(table).update({ status: dbStatus }).eq("id", id);

      if (companyId) {
        q = q.eq("company_id", companyId);
      }

      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: ["financial-receitas", companyId] });
      qc.invalidateQueries({ queryKey: ["financial-despesas", companyId] });
      toast.success("Status atualizado");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "UPDATE" });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  const { profile, isSuperAdmin } = useAuth();
  const getCompanyId = () => (isSuperAdmin ? null : (profile?.company_id ?? null));

  return useMutation({
    mutationFn: async ({ id, type }: { id: string; type?: TransactionType }) => {
      const table = "financial_transactions";
      const companyId = getCompanyId();
      let q = supabase.from(table).delete().eq("id", id);

      if (companyId) {
        q = q.eq("company_id", companyId);
      }

      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      const companyId = getCompanyId();
      qc.invalidateQueries({ queryKey: ["financial-receitas", companyId] });
      qc.invalidateQueries({ queryKey: ["financial-despesas", companyId] });
      toast.success("Transação eliminada");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "DELETE" });
    },
  });
}

export function useMarkAsReceived() {
  const qc = useQueryClient();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: async (id: string) => {
      // Buscar o registro atual para verificar se payment_date já existe
      const { data: current } = await supabase
        .from("financial_transactions")
        .select("payment_date")
        .eq("id", id)
        .single();

      // Atualizar payment_date apenas se não existir
      const updateData: Record<string, unknown> = { status: "paid" };
      if (!current?.payment_date) {
        updateData.payment_date = new Date().toISOString().slice(0, 10);
      }

      let q = supabase
        .from("financial_transactions")
        .update(updateData as never)
        .eq("id", id);

      if (companyId) {
        q = q.eq("company_id", companyId);
      }

      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial-receitas", companyId] });
      toast.success("Valor recebido");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "UPDATE", table: "financial_transactions" });
    },
  });
}

export function useMarkAsPaid() {
  const qc = useQueryClient();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: async (id: string) => {
      // Buscar o registro atual para verificar se payment_date já existe
      const { data: current } = await supabase
        .from("financial_transactions")
        .select("payment_date")
        .eq("id", id)
        .single();

      // Atualizar payment_date apenas se não existir
      const updateData: Record<string, unknown> = { status: "paid" };
      if (!current?.payment_date) {
        updateData.payment_date = new Date().toISOString().slice(0, 10);
      }

      let q = supabase
        .from("financial_transactions")
        .update(updateData as never)
        .eq("id", id);

      if (companyId) {
        q = q.eq("company_id", companyId);
      }

      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial-despesas", companyId] });
      toast.success("Despesa marcada como paga");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "UPDATE", table: "financial_transactions" });
    },
  });
}

export function uploadAttachment(file: File): Promise<{ url: string; type: "pdf" | "image" }> {
  return new Promise(async (resolve, reject) => {
    const { data, error } = await supabase.storage
      .from("attachments")
      .upload(`${Date.now()}-${file.name}`, file);

    if (error) {
      reject(error);
      return;
    }

    const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(data.path);

    const mimeType = file.type;
    let fileType: "pdf" | "image" = "image";
    if (mimeType === "application/pdf") {
      fileType = "pdf";
    }

    resolve({ url: urlData.publicUrl, type: fileType });
  });
}
