import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useRespondToInvitation } from "@/hooks/use-process-collaboration";
import { playNotificationSound } from "@/lib/notification-sound";

const notifiedInvitationIds = new Set<string>();

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const respond = useRespondToInvitation();

  useEffect(() => {
    if (typeof window === "undefined" || !profile?.id) return;
    let cancelled = false;

    const channel = supabase
      .channel(`notifications-global-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "process_collaboration_invites",
          filter: `invited_professional=eq.${profile.id}`,
        },
        async (payload: { new: { id: string; process_id: string; message: string | null; invited_by: string | null } }) => {
          const newInvite = payload.new;
          if (notifiedInvitationIds.has(newInvite.id)) return;
          notifiedInvitationIds.add(newInvite.id);

          const { data: details } = await supabase
            .from("process_collaboration_invites")
            .select("*, inviter:profiles!process_collaboration_invites_invited_by_fkey(full_name), process:processos(numero, cliente_nome)")
            .eq("id", newInvite.id)
            .single();

          if (cancelled || !details) return;

          const d = details as any;
          const inviterName = d.inviter?.full_name ?? "Um utilizador";
          const processoNumero = d.process?.numero ?? "um processo";
          const clienteNome = d.process?.cliente_nome;
          const description = d.message ?? `Foi convidado para colaborar no processo ${processoNumero}.`;

          void playNotificationSound();
          window.dispatchEvent(new CustomEvent("bell-animation-start"));

          toast("Novo convite recebido", {
            description: `${inviterName} convidou-o para colaborar no processo ${processoNumero}${clienteNome ? ` — Cliente: ${clienteNome}` : ""}.`,
            duration: 5000,
            action: {
              label: "Aceitar",
              onClick: async () => {
                await respond.mutateAsync({ invitationId: details.id, accept: true });
                toast.success("Convite aceite");
              },
            },
            cancel: {
              label: "Rejeitar",
              onClick: async () => {
                await respond.mutateAsync({ invitationId: details.id, accept: false });
                toast.success("Convite recusado");
              },
            },
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [profile?.id, respond]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handle = (e: CustomEvent) => {
      const id = e.detail?.invitationId;
      if (id) notifiedInvitationIds.delete(id);
    };
    window.addEventListener("invitation-accepted-rejected", handle as any);
    return () => window.removeEventListener("invitation-accepted-rejected", handle as any);
  }, []);

  return <>{children}</>;
}
