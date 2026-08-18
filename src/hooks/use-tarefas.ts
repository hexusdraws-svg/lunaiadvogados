import { useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { handleSupabaseError } from "@/lib/supabase-error-handler";
import type { Tarefa, Processo, TaskStatus } from "@/lib/processos";

const TASK_STATUS_LIST: readonly TaskStatus[] = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
];

export function useTarefas(filters?: {
  processoId?: string | null;
  status?: TaskStatus | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}) {
  const { profile, isSuperAdmin } = useAuth();
  const companyId = isSuperAdmin ? null : (profile?.company_id ?? null);

  const filterKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);

  return useQuery({
    queryKey: ["tarefas", companyId, filterKey],
    queryFn: async () => {
      if (!companyId) return [];

      let q = supabase
        .from("tarefas")
        .select("*")
        .eq("company_id", companyId)
        .order("task_date", { ascending: true })
        .order("created_at", { ascending: true });

      if (filters?.processoId) {
        q = q.eq("processo_id", filters.processoId);
      }
      if (filters?.status && filters.status !== "all") {
        q = q.eq("status", filters.status);
      }
      if (filters?.dateFrom) {
        q = q.gte("task_date", filters.dateFrom);
      }
      if (filters?.dateTo) {
        q = q.lte("task_date", filters.dateTo);
      }

      const { data, error } = await q;
      if (error) {
        console.error("[useTarefas] query error:", error);
        return [];
      }
      return (data ?? []) as Tarefa[];
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });
}

export function useTarefasPorProcesso(processoId: string | null) {
  return useTarefas({ processoId });
}

export function useProcessos(tab: "mine" | "all" = "all") {
  const { profile, isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const companyId = isSuperAdmin ? null : (profile?.company_id ?? null);
  const profileId = profile?.id;

  const query = useQuery({
    queryKey: ["processos", companyId],
    queryFn: async () => {
      if (!companyId || !profileId) return [];

      const { data: ownProcesses, error: ownError } = await supabase
        .from("processos")
        .select("*")
        .eq("company_id", companyId)
        .eq("created_by", profileId)
        .order("created_at", { ascending: false });

      if (ownError) {
        console.error("[useProcessos] own processes error:", ownError);
      }

      const { data: collabProcesses, error: collabError } = await supabase
        .from("process_collaboration_invites")
        .select("process_id")
        .eq("invited_professional", profileId)
        .eq("status", "accepted");

      if (collabError) {
        console.error("[useProcessos] collaborator check error:", collabError);
      }

      const ownIds = new Set((ownProcesses ?? []).map((p) => p.id));
      const collabIds = (collabProcesses ?? []).map((c) => c.process_id);
      const allIds = [...ownIds, ...collabIds];

      if (allIds.length === 0) {
        return [];
      }

      const { data: hiddenRows } = await supabase
        .from("process_hidden_users")
        .select("process_id")
        .eq("user_id", profileId)
        .in("process_id", allIds);

      const hiddenIds = new Set((hiddenRows ?? []).map((h) => h.process_id));
      const visibleIds = allIds.filter((id) => !hiddenIds.has(id));

      if (visibleIds.length === 0) {
        return [];
      }

      const { data: allProcesses, error: allError } = await supabase
        .from("processos")
        .select("*")
        .in("id", visibleIds);

      if (allError) {
        console.error("[useProcessos] all processes error:", allError);
        return (ownProcesses ?? []).filter((p) => !hiddenIds.has(p.id)) as Processo[];
      }

      return (allProcesses ?? []) as Processo[];
    },
    enabled: !!companyId && !!profileId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (!companyId || !profileId) return;
    const channelName = `processos-realtime-${companyId}-${profileId}`;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtime = async () => {
      try {
        await supabase.removeChannel(channelName);
      } catch {
        // ignore cleanup errors
      }

      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "processos",
            filter: `company_id=eq.${companyId}`,
          },
          () => {
            qc.invalidateQueries({ queryKey: ["processos", companyId] });
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "process_collaboration_invites" },
          () => {
            qc.invalidateQueries({ queryKey: ["processos", companyId] });
            qc.invalidateQueries({ queryKey: ["process-invitations-pending", profileId] });
            qc.invalidateQueries({ queryKey: ["process-invitations", undefined] });
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "process_hidden_users",
            filter: `user_id=eq.${profileId}`,
          },
          () => {
            qc.invalidateQueries({ queryKey: ["processos", companyId] });
          },
        );

      channel.subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel).catch(() => {});
      }
    };
  }, [companyId, profileId, qc]);

  return query;
}

export function useCreateTarefa() {
  const qc = useQueryClient();
  const { profile, isSuperAdmin } = useAuth();
  const getCompanyId = () => (isSuperAdmin ? null : (profile?.company_id ?? null));

  return useMutation({
    mutationFn: async (values: {
      title: string;
      description?: string | null;
      processo_id?: string | null;
      client_id?: string | null;
      task_date: string;
    }) => {
      const companyId = getCompanyId();
      if (!companyId) throw new Error("Empresa nÃ£o configurada");

      const { data, error } = await supabase
        .from("tarefas")
        .insert({
          company_id: companyId,
          title: values.title,
          description: values.description || null,
          processo_id: values.processo_id || null,
          client_id: values.client_id || null,
          task_date: values.task_date,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data as Tarefa;
    },
    onSuccess: async (task) => {
      qc.invalidateQueries({ queryKey: ["tarefas"] });
      toast.success("Tarefa criada");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "INSERT", table: "tarefas" });
    },
  });
}

export function useUpdateTarefa() {
  const qc = useQueryClient();
  const { profile, isSuperAdmin } = useAuth();
  const getCompanyId = () => (isSuperAdmin ? null : (profile?.company_id ?? null));

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: {
        title?: string;
        description?: string | null;
        processo_id?: string | null;
        task_date?: string;
        task_time?: string | null;
        status?: TaskStatus;
      };
    }) => {
      const companyId = getCompanyId();
      let q = supabase.from("tarefas").update(updates).eq("id", id).select().single();

      if (companyId) {
        q = q.eq("company_id", companyId);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as Tarefa;
    },
    onSuccess: async (task) => {
      qc.invalidateQueries({ queryKey: ["tarefas"] });
      toast.success("Tarefa actualizada");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "UPDATE", table: "tarefas" });
    },
  });
}

export function useDeleteTarefa() {
  const qc = useQueryClient();
  const { profile, isSuperAdmin } = useAuth();
  const getCompanyId = () => (isSuperAdmin ? null : (profile?.company_id ?? null));

  return useMutation({
    mutationFn: async (id: string) => {
      const companyId = getCompanyId();
      let q = supabase.from("tarefas").delete().eq("id", id);
      if (companyId) {
        q = q.eq("company_id", companyId);
      }
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      const companyId = getCompanyId();
      qc.invalidateQueries({ queryKey: ["tarefas", companyId] });
      toast.success("Tarefa eliminada");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "DELETE", table: "tarefas" });
    },
  });
}

export function useCreateProcesso() {
  const qc = useQueryClient();
  const { profile, isSuperAdmin } = useAuth();

  // Derive companyId at mutation execution time, not hook initialization time
  // This prevents race conditions where profile hasn't loaded yet
  const getCompanyId = () => {
    if (isSuperAdmin) return null;
    return profile?.company_id ?? null;
  };

  return useMutation({
    mutationFn: async (values: {
      numero: string;
      cliente_id?: string | null;
      cliente_nome?: string | null;
      tipo: string;
      status?: string;
      descricao?: string | null;
      responsavel_id?: string | null;
      colaboradores?: string[] | null;
      valor_causa?: number | null;
      prioridade?: string | null;
    }) => {
      const companyId = getCompanyId();
      if (!companyId) {
        throw new Error("Empresa nÃ£o configurada");
      }

      const { data: rpcData, error: rpcError } = await supabase.rpc("next_processo_number", {
        _company_id: companyId,
      });

      const numero =
        values.numero && values.numero.trim()
          ? values.numero.trim()
          : rpcError
            ? `PROC-${new Date().getFullYear()}-0001`
            : (rpcData as string);

      const { data, error } = await supabase
        .from("processos")
        .insert({
          company_id: companyId,
          numero,
          cliente_id: values.cliente_id || null,
          cliente_nome: values.cliente_nome || null,
          tipo: values.tipo,
          status: values.status || "em_andamento",
          descricao: values.descricao || null,
          responsavel_id: values.responsavel_id || null,
          valor_causa: values.valor_causa ?? null,
          prioridade: values.prioridade || "normal",
        })
        .select()
        .single();

      if (error) throw error;
      return data as Processo;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["processos"] });
      toast.success("Processo criado");
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "INSERT", table: "processos" });
    },
  });
}

export function useUpdateProcesso() {
  const qc = useQueryClient();
  const { profile, isSuperAdmin } = useAuth();
  const getCompanyId = () => (isSuperAdmin ? null : (profile?.company_id ?? null));

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<{
        cliente_id: string | null;
        cliente_nome: string | null;
        tipo: string;
        status: string;
        descricao: string | null;
        responsavel_id: string | null;
        valor_causa: number | null;
        prioridade: string | null;
        colaboradores: string[] | null;
      }>;
    }) => {
      const companyId = getCompanyId();
      let q = supabase.from("processos").update(updates).eq("id", id).select().single();

      if (companyId) {
        q = q.eq("company_id", companyId);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as Processo;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["processos"] });
      qc.invalidateQueries({ queryKey: ["processo-detail"] });
      toast.success("Processo actualizado");
    },
    onError: (e: Error) => handleSupabaseError(e, { operation: "UPDATE", table: "processos" }),
  });
}

export function useDeleteProcesso() {
  const qc = useQueryClient();
  const { profile, isSuperAdmin } = useAuth();
  const getCompanyId = () => (isSuperAdmin ? null : (profile?.company_id ?? null));

  return useMutation({
    mutationFn: async (id: string) => {
      const companyId = getCompanyId();
      let q = supabase.from("processos").delete().eq("id", id);
      if (companyId) {
        q = q.eq("company_id", companyId);
      }
      if (profile?.id) {
        q = q.eq("created_by", profile.id);
      }
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      const companyId = getCompanyId();
      qc.invalidateQueries({ queryKey: ["processos", companyId] });
      qc.invalidateQueries({ queryKey: ["processo-detail"] });
      toast.success("Processo eliminado");
    },
    onError: (e: Error) => handleSupabaseError(e, { operation: "DELETE", table: "processos" }),
  });
}

export function useCanAccessProcess(processoId: string | undefined) {
  const { profile, isSuperAdmin } = useAuth();
  const companyId = isSuperAdmin ? null : (profile?.company_id ?? null);

  return useQuery({
    queryKey: ["can-access-process", processoId, profile?.id, companyId],
    queryFn: async () => {
      if (!processoId || !profile?.id || !companyId) return false;

      const { data: processo, error: processoError } = await supabase
        .from("processos")
        .select("id, created_by")
        .eq("id", processoId)
        .eq("company_id", companyId)
        .maybeSingle();

      if (processoError || !processo) return false;

      if (processo.created_by === profile.id) return true;

      const { data: invite, error: inviteError } = await supabase
        .from("process_collaboration_invites")
        .select("id")
        .eq("process_id", processoId)
        .eq("invited_professional", profile.id)
        .eq("status", "accepted")
        .maybeSingle();

      if (inviteError) {
        console.error("[useCanAccessProcess] invite check error:", inviteError);
        return false;
      }

      return !!invite;
    },
    enabled: typeof window !== "undefined" && !!processoId && !!profile?.id && !!companyId,
    staleTime: 30_000,
  });
}
export function useLawyersForProcessSelection() {
  const { profile, isSuperAdmin } = useAuth();
  const companyId = isSuperAdmin ? null : (profile?.company_id ?? null);

  return useQuery({
    queryKey: ["lawyers-for-process", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      // Get active profiles with role 'lawyer' or 'admin' in professional_role,
      // OR users with role='admin' (company admin)
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, professional_role, role, status")
        .eq("company_id", companyId)
        .eq("status", "active")
        .order("full_name");

      if (error) {
        console.error("[useLawyersForProcessSelection] query error:", error);
        return [];
      }

      // Filter for lawyers, admins and professionals:
      // - professional_role is 'lawyer'
      // - OR role is 'admin' (company admin)
      // - OR role is 'professional' (team member)
      const filtered = (data ?? []).filter((p) => {
        if (p.professional_role === "lawyer") return true;
        if (p.role === "admin") return true;
        if (p.role === "professional") return true;
        return false;
      });

      // Filter out the current user (they will be the responsible lawyer)
      const withoutSelf = filtered.filter((p) => p.id !== profile?.id);

      return withoutSelf.map((p) => ({
        id: p.id,
        name: p.full_name ?? p.email,
        role: p.professional_role ?? p.role,
      }));
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });
}


