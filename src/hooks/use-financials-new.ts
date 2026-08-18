import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useFinancialPermissions } from "@/hooks/use-financial-permissions";
import type { FeeNote, Invoice, Receipt } from "@/lib/finance-types";

const is404 = (error: unknown) => {
  const err = error as { code?: string; message?: string } | null;
  return !!err && (err.code === "PGRST205" || /Could not find the table/.test(err.message || ""));
};

export function useFeeNotes(companyId?: string | null, documentType?: string) {
  const { profile } = useAuth();
  const { filterByCreatedBy } = useFinancialPermissions();

  return useQuery({
    queryKey: ["fee-notes", companyId, documentType, profile?.id, profile?.role],
    enabled: !!companyId,
    queryFn: async () => {
      let query = supabase
        .from("fee_notes")
        .select("*")
        .eq("company_id", companyId)
        .order("issue_date", { ascending: false });

      if (documentType) {
        query = query.eq("document_type", documentType);
      }

      query = filterByCreatedBy(query, profile?.id);

      const { data, error } = await query;
      if (error && !is404(error)) throw error;
      return (data ?? []) as FeeNote[];
    },
  });
}

export function useFeeNote(id?: string) {
  return useQuery({
    queryKey: ["fee-note", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_notes")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error && !is404(error)) throw error;
      return data as FeeNote | null;
    },
  });
}

export function useCreateFeeNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<FeeNote, "id" | "created_at" | "updated_at" | "num">) => {
      const { data, error } = await supabase.from("fee_notes").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_v, vars) => {
      qc.invalidateQueries({ queryKey: ["fee-notes", vars.company_id] });
      qc.invalidateQueries({ queryKey: ["fee-note", vars.id] });
    },
  });
}

export function useUpdateFeeNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FeeNote> }) => {
      const { error } = await supabase.from("fee_notes").update(updates).eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (_v, vars) => {
      qc.invalidateQueries({ queryKey: ["fee-notes", vars.updates.company_id] });
      qc.invalidateQueries({ queryKey: ["fee-note", vars.id] });
    },
  });
}

export function useDeleteFeeNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fee_notes").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id, _vars) => qc.invalidateQueries({ queryKey: ["fee-notes"] }),
  });
}

export function useDuplicateFeeNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const source = await supabase.from("fee_notes").select("*").eq("id", id).single();
      if (source.error) throw source.error;
      const original = source.data as FeeNote;

      const { data: created, error } = await supabase
        .from("fee_notes")
        .insert({
          ...original,
          id: undefined,
          numero: undefined,
          document_type: original.document_type ?? "budget",
          status: "rascunho",
          created_at: undefined,
          updated_at: undefined,
          services: original.services ?? [],
        })
        .select()
        .single();
      if (error) throw error;
      return created;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["fee-notes"] }),
  });
}

// Budget to Invoice Conversion
export function useConvertBudgetToInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ budgetId, companyId, createdBy }: { budgetId: string; companyId: string; createdBy: string }) => {
      const { data: budget, error: budgetError } = await supabase
        .from("fee_notes")
        .select("*")
        .eq("id", budgetId)
        .eq("document_type", "budget")
        .single();
      if (budgetError) throw budgetError;
      if (!budget) throw new Error("Orçamento não encontrado.");

      const { data: existing, error: existingError } = await supabase
        .from("fee_notes")
        .select("id")
        .eq("source_fee_note_id", budgetId)
        .eq("document_type", "invoice")
        .limit(1);
      if (existingError) throw existingError;
      if (existing && existing.length > 0) {
        throw new Error("Já existe uma fatura gerada a partir deste orçamento.");
      }

      const year = new Date().getFullYear();
      const { data: lastInvoice, error: lastInvoiceError } = await supabase
        .from("fee_notes")
        .select("numero")
        .eq("document_type", "invoice")
        .like("numero", `FT-${year}-%`)
        .order("numero", { ascending: false })
        .limit(1);
      if (lastInvoiceError && !is404(lastInvoiceError)) throw lastInvoiceError;

      let nextNumber = 1;
      if (lastInvoice && lastInvoice.length > 0 && lastInvoice[0].numero) {
        const parts = lastInvoice[0].numero.split("-");
        const seq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(seq)) nextNumber = seq + 1;
      }
      const invoiceNumber = `FT-${year}-${String(nextNumber).padStart(3, "0")}`;

      const { data: invoice, error: invoiceError } = await supabase
        .from("fee_notes")
        .insert({
          company_id: companyId,
          cliente_id: budget.cliente_id,
          processo_id: budget.processo_id,
          document_type: "invoice",
          numero: invoiceNumber,
          issue_date: new Date().toISOString().split("T")[0],
          status: "pendente",
          subtotal: budget.subtotal,
          tax: budget.tax || 0,
          total: budget.total,
          paid_amount: 0,
          balance: budget.total,
          created_by: createdBy,
          source_fee_note_id: budgetId,
          observations: budget.observations,
          services: budget.services ?? [],
        })
        .select()
        .single();
      if (invoiceError) throw invoiceError;

      await supabase.from("fee_notes").update({ status: "aceite" }).eq("id", budgetId);

      return invoice;
    },
    onSuccess: (_v, vars) => {
      qc.invalidateQueries({ queryKey: ["fee-notes", vars.companyId] });
      qc.invalidateQueries({ queryKey: ["fee-note", vars.budgetId] });
      qc.invalidateQueries({ queryKey: ["invoices", vars.companyId] });
    },
  });
}

// Invoices (fee_notes com document_type = 'invoice')
export function useInvoices(companyId?: string | null) {
  const { profile } = useAuth();
  const { filterByCreatedBy } = useFinancialPermissions();

  return useQuery({
    queryKey: ["invoices", companyId, profile?.id, profile?.role],
    enabled: !!companyId,
    queryFn: async () => {
      let query = supabase
        .from("fee_notes")
        .select("*")
        .eq("company_id", companyId)
        .eq("document_type", "invoice")
        .order("issue_date", { ascending: false });

      query = filterByCreatedBy(query, profile?.id);

      const { data, error } = await query;
      if (error && !is404(error)) throw error;
      return (data ?? []) as Invoice[];
    },
  });
}

export function useInvoice(id?: string) {
  return useQuery({
    queryKey: ["invoice", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_notes")
        .select("*")
        .eq("id", id)
        .eq("document_type", "invoice")
        .maybeSingle();
      if (error && !is404(error)) throw error;
      return data as Invoice | null;
    },
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<Invoice, "id" | "created_at" | "updated_at" | "num">) => {
      const { data, error } = await supabase.from("fee_notes").insert({ ...values, document_type: "invoice" }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_v, vars) => qc.invalidateQueries({ queryKey: ["invoices", vars.company_id] }),
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Invoice> }) => {
      const { error } = await supabase.from("fee_notes").update(updates).eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (_v, vars) => qc.invalidateQueries({ queryKey: ["invoices", vars.updates.company_id] }),
  });
}

// Income transactions
export function useIncomeTransactions(companyId?: string | null) {
  return useQuery({
    queryKey: ["income-transactions", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("company_id", companyId)
        .eq("transaction_type", "income")
        .order("transaction_date", { ascending: false });
      if (error && !is404(error)) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useCreateIncomeTransaction() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (values: { company_id: string; fee_note_id?: string | null; client_id?: string | null; process_id?: string | null; amount: number; description?: string; payment_method?: string | null; payment_date?: string | null; due_date?: string; transaction_type?: string; }) => {
      const table = "financial_transactions";
      const payload = { ...values, created_by: profile?.id || null };
      const { data, error } = await supabase.from(table).insert(payload).select().single();
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: (_v, vars) => {
      qc.invalidateQueries({ queryKey: ["income-transactions"] });
      qc.invalidateQueries({ queryKey: ["fee-notes"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["receipts"] });
      qc.invalidateQueries({ queryKey: ["financial-dashboard"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao registar recebimento. Tenta novamente.");
    },
  });
}

// Receipts
export function useReceipts(companyId?: string | null) {
  return useQuery({
    queryKey: ["receipts", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error && !is404(error)) throw error;
      return (data ?? []) as Receipt[];
    },
  });
}


