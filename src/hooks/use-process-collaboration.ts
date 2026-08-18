import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { handleSupabaseError } from "@/lib/supabase-error-handler";
import { playNotificationSound } from "@/lib/notification-sound";

// ============================================================
// TIPOS CENTRALIZADOS
// ============================================================

export type ProcessCollaborationInvite = {
  id: string;
  company_id: string;
  process_id: string;
  invited_by: string | null;
  invited_professional: string;
  status: "pending" | "accepted" | "rejected";
  invitation_type: "process_collaboration";
  message: string | null;
  created_at: string;
  responded_at: string | null;
  process?: { numero: string; cliente_nome: string | null } | null;
};

export type AppNotification = {
  id: string;
  company_id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success" | "reminder";
  entity_type: "case" | "hearing" | "task" | "document" | "client" | "user" | "system" | null;
  entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

// ============================================================
// CONVITES DE COLABORAÇÃO
// ============================================================

// Convites pendentes para o utilizador atual (com dados do processo)
export function usePendingInvitations() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["process-invitations-pending", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [] as ProcessCollaborationInvite[];
      const { data, error } = await supabase
        .from("process_collaboration_invites")
        .select("*, process:processos(numero, cliente_nome)")
        .eq("invited_professional", profile.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[usePendingInvitations] query error:", error);
        return [] as ProcessCollaborationInvite[];
      }
      return (data ?? []) as unknown as ProcessCollaborationInvite[];
    },
    enabled: typeof window !== "undefined" && !!profile?.id,
    staleTime: 30_000,
  });
}

// Todos os convites de um determinado processo (usado na detail page)
export function useProcessInvitations(processId: string | undefined, statusFilter?: "pending" | "accepted" | "rejected" | null) {
  return useQuery({
    queryKey: ["process-invitations", processId, statusFilter],
    queryFn: async () => {
      if (!processId) return [] as ProcessCollaborationInvite[];
      let q = supabase
        .from("process_collaboration_invites")
        .select("*, process:processos(numero, cliente_nome)")
        .eq("process_id", processId);

      if (statusFilter) {
        q = q.eq("status", statusFilter);
      }

      q = q.order("created_at", { ascending: false });

      const { data, error } = await q;

      if (error) {
        console.error("[useProcessInvitations] error:", error);
        return [] as ProcessCollaborationInvite[];
      }
      return (data ?? []) as unknown as ProcessCollaborationInvite[];
    },
    enabled: typeof window !== "undefined" && !!processId,
  });
}

// Aceita apenas colaboradores cujo convite foi aceito (status = accepted).
// Substituir o uso de processo.colaboradores por este hook.
export function useProcessAcceptedCollaborators(processId: string | undefined) {
  return useProcessInvitations(processId, "accepted");
}

// Verifica se o utilizador actual é o responsável pelo processo (pode convidar).
export function useCanInviteCollaborators(processId: string | undefined) {
  const { profile, isSuperAdmin } = useAuth();

  return useQuery({
    queryKey: ["can-invite-collaborators", processId, profile?.id],
    queryFn: async () => {
      if (!processId || !profile?.id) return false;
      if (isSuperAdmin || profile.role === "admin") return true;

      const { data: processo, error } = await supabase
        .from("processos")
        .select("responsavel_id")
        .eq("id", processId)
        .single();

      if (error || !processo) return false;

      return processo.responsavel_id === profile.id;
    },
    enabled: typeof window !== "undefined" && !!processId && !!profile?.id,
    staleTime: 30_000,
  });
}

// Cria convites pendentes (status = pending) — NÃO dá acesso imediato.
// A notificação persistente é gerada por trigger (trg_notify_process_collaboration_invite).
// Apenas o responsável pelo processo pode enviar convites.
export function useCreateCollaborationInvites() {
  const { profile } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      processId,
      companyId,
      collaborators,
      processoNumero,
    }: {
      processId: string;
      companyId: string;
      collaborators: string[];
      processoNumero: string;
    }) => {
      if (!profile?.id || collaborators.length === 0) return;

      // Validação backend: só o responsável pode convidar
      const { data: processo, error: procError } = await supabase
        .from("processos")
        .select("responsavel_id")
        .eq("id", processId)
        .single();

      if (procError || !processo) {
        throw new Error("Processo não encontrado");
      }

      if (processo.responsavel_id !== profile.id) {
        throw new Error("Apenas o responsável pelo processo pode convidar colaboradores");
      }

      const rows = collaborators.map((colaboradorId) => ({
        company_id: companyId,
        process_id: processId,
        invited_by: profile.id,
        invited_professional: colaboradorId,
        status: "pending" as const,
        invitation_type: "process_collaboration" as const,
        message: `Foi convidado para colaborar no processo ${processoNumero}.`,
      }));

      const { error } = await supabase.from("process_collaboration_invites").insert(rows);
      if (error) {
        console.error("[useCreateCollaborationInvites] insert error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["process-invitations"] });
      qc.invalidateQueries({ queryKey: ["process-invitations-pending"] });
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "INSERT", table: "process_collaboration_invites" });
    },
  });
}

// Responder a um convite (aceitar / rejeitar)
export function useRespondToInvitation() {
  const qc = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ invitationId, accept }: { invitationId: string; accept: boolean }) => {
      if (!profile?.id) throw new Error("Utilizador não autenticado");

      const { error } = await supabase
        .from("process_collaboration_invites")
        .update({
          status: accept ? "accepted" : "rejected",
          responded_at: new Date().toISOString(),
        })
        .eq("id", invitationId)
        .eq("invited_professional", profile.id); // segurança: só o convidado responde

      if (error) throw error;
      return { invitationId, accepted: accept };
    },
    onSuccess: (_data, variables) => {
      // Realtime (useProcessos + useNotifications) já invalida a maioria.
      // Invalidamos apenas os alvos diretos para garantir atualização
      // imediata mesmo sem realtime ativo.
      qc.invalidateQueries({ queryKey: ["processos"] });
      qc.invalidateQueries({ queryKey: ["process-invitations-pending", profile?.id] });

      void playNotificationSound();
      window.dispatchEvent(
        new CustomEvent("invitation-accepted-rejected", {
          detail: { invitationId: variables.invitationId },
        }),
      );
    },
    onError: (e: Error) => {
      handleSupabaseError(e, { operation: "UPDATE", table: "process_collaboration_invites" });
    },
  });
}

// ============================================================
// NOTIFICAÇÕES PERSISTENTES (com realtime → sino atualiza sózinho)
// ============================================================

export function useNotifications() {
  const { profile } = useAuth();
  const qc = useQueryClient();

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ["notifications", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [] as AppNotification[];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("[useNotifications] query error:", error);
        return [] as AppNotification[];
      }
      return (data ?? []) as unknown as AppNotification[];
    },
    enabled: !!profile?.id,
    staleTime: 30_000,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Realtime: invalidate when notifications table changes for this user
  useEffect(() => {
    if (!profile?.id) return;
    const channelName = `notifications-${profile.id}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["notifications", profile?.id] });
        },
      );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, qc]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!profile?.id) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", profile.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["notifications", profile?.id] });
    },
    [profile?.id, qc],
  );

  const markAllRead = useCallback(async () => {
    if (!profile?.id) return;
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", profile.id)
      .eq("is_read", false);
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["notifications", profile?.id] });
  }, [profile?.id, qc]);

  const dismissNotification = useCallback(
    async (id: string) => {
      if (!profile?.id) return;
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id)
        .eq("user_id", profile.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["notifications", profile?.id] });
    },
    [profile?.id, qc],
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    refetch,
    markAsRead,
    markAllRead,
    dismissNotification,
  };
}
