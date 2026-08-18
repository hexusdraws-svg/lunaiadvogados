import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseErrorHandler } from "@/lib/supabase-error-handler";
import { toast } from "sonner";

export type SubscriptionFrequency = "monthly" | "quarterly" | "semiannual" | "annual";
export type SubscriptionStatus = "paid" | "pending" | "cancelled";

export interface CompanySubscription {
  id: string;
  company_id: string;
  company_name?: string;
  plan: string;
  amount: number;
  frequency: SubscriptionFrequency;
  payment_method: string | null;
  start_date: string;
  next_due_date: string;
  status: SubscriptionStatus;
  paid_at: string | null;
  created_at: string;
}

export function useCompanySubscriptions(filters?: { companyId?: string; startDate?: string; endDate?: string; status?: SubscriptionStatus }) {
  return useQuery({
    queryKey: ["super-admin-subscriptions", filters],
    queryFn: async (): Promise<CompanySubscription[]> => {
      let query = supabase
        .from("company_subscriptions")
        .select("*, companies(nome)")
        .order("next_due_date", { ascending: true });

      if (filters?.companyId) {
        query = query.eq("company_id", filters.companyId);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.startDate) {
        query = query.gte("next_due_date", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("next_due_date", filters.endDate);
      }

      const { data, error } = await query;
      if (error) {
        console.error("[useCompanySubscriptions] error:", error);
        return [];
      }
      return (data ?? []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        company_id: row.company_id as string,
        company_name: row.companies?.nome ?? null,
        plan: row.plan as string,
        amount: Number(row.amount),
        frequency: row.frequency as SubscriptionFrequency,
        payment_method: row.payment_method as string | null,
        start_date: row.start_date as string,
        next_due_date: row.next_due_date as string,
        status: row.status as SubscriptionStatus,
        paid_at: row.paid_at as string | null,
        created_at: row.created_at as string,
      }));
    },
  });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  const handleError = useSupabaseErrorHandler();

  return useMutation({
    mutationFn: async (input: {
      company_id: string;
      plan: string;
      amount: number;
      frequency: SubscriptionFrequency;
      payment_method?: string | null;
      start_date: string | null;
      next_due_date: string | null;
      status?: SubscriptionStatus;
    }) => {
      const { data, error } = await supabase
        .from("company_subscriptions")
        .insert({
          company_id: input.company_id,
          plan: input.plan,
          amount: input.amount,
          frequency: input.frequency,
          payment_method: input.payment_method ?? null,
          start_date: input.start_date,
          next_due_date: input.next_due_date,
          status: input.status ?? "pending",
        } as never)
        .select()
        .single();
      if (error) throw error;
      return data as CompanySubscription;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["super-admin-subscriptions"] });
      toast.success("Subscrição criada");
    },
    onError: (e: Error) => handleError(e, { operation: "INSERT", table: "company_subscriptions" }),
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  const handleError = useSupabaseErrorHandler();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      plan?: string;
      amount?: number;
      frequency?: SubscriptionFrequency;
      payment_method?: string | null;
      next_due_date?: string;
      status?: SubscriptionStatus;
      paid_at?: string | null;
    }) => {
      const { error } = await supabase
        .from("company_subscriptions")
        .update(input as never)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["super-admin-subscriptions"] });
      toast.success("Subscrição atualizada");
    },
    onError: (e: Error) => handleError(e, { operation: "UPDATE", table: "company_subscriptions" }),
  });
}

export function useDeleteSubscription() {
  const qc = useQueryClient();
  const handleError = useSupabaseErrorHandler();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("company_subscriptions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["super-admin-subscriptions"] });
      toast.success("Subscrição removida");
    },
    onError: (e: Error) => handleError(e, { operation: "DELETE", table: "company_subscriptions" }),
  });
}
