// Re-exporta tudo do hook centralizado de colaboração/convites.
// Mantido para compatibilidade (componentes importam deste caminho).
export {
  usePendingInvitations,
  useProcessInvitations,
  useProcessAcceptedCollaborators,
  useCanInviteCollaborators,
  useCreateCollaborationInvites,
  useRespondToInvitation,
  useNotifications,
  type AppNotification,
} from "@/hooks/use-process-collaboration";
