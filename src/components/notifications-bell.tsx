import { Bell, CheckCircle2, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePendingInvitations, useRespondToInvitation, useNotifications } from "@/hooks/use-process-collaboration";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/use-i18n";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

export function NotificationsBell() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: invitations = [] } = usePendingInvitations();
  const { notifications, unreadCount, markAsRead, markAllRead, dismissNotification } = useNotifications();
  const respondMutation = useRespondToInvitation();

  const badgeCount = invitations.length + unreadCount;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-secondary/40 text-muted-foreground transition-colors hover:text-foreground",
            badgeCount > 0 && "text-primary",
          )}
          aria-label={t("notifications.title", { defaultValue: "Notificações" })}
        >
          <Bell className={cn("h-4 w-4", unreadCount > 0 && "animate-[pulse_2s_ease-in-out_infinite]")} />
          {badgeCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold text-foreground">{t("notifications.title", { defaultValue: "Notificações" })}</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => markAllRead()}
            >
              {t("notifications.markAllRead", { defaultValue: "Marcar todas como lidas" })}
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {invitations.length === 0 && notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("notifications.empty", { defaultValue: "Sem notificações" })}</p>
          ) : (
            <div className="space-y-3 p-4">
              {invitations.map((inv) => (
                <div key={`inv-${inv.id}`} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{t("notifications.collaborationInvite", { defaultValue: "Convite de colaboração" })}</p>
                      <p className="text-xs text-muted-foreground">
                        {inv.status === "pending" ? t("notifications.pending", { defaultValue: "Pendente" }) : inv.status}
                      </p>
                      {inv.process?.numero && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("notifications.processLabel", { defaultValue: "Processo:" })} {inv.process.numero}
                        </p>
                      )}
                    </div>
                      <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        title={t("notifications.dismiss", { defaultValue: "Dispensar" })}
                        onClick={() => {
                          if (inv.status === "pending") {
                            respondMutation.mutate(
                              { invitationId: inv.id, accept: false },
                              {
                                onSuccess: () => toast.success(t("notifications.rejectSuccess", { defaultValue: "Convite recusado" })),
                                onError: () => toast.error(t("notifications.rejectError", { defaultValue: "Erro ao recusar convite" })),
                              }
                            );
                          }
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      {inv.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={respondMutation.isPending}
                            onClick={() => respondMutation.mutate(
                              { invitationId: inv.id, accept: false },
                              {
                                onSuccess: () => toast.success(t("notifications.rejectSuccess", { defaultValue: "Convite recusado" })),
                                onError: () => toast.error(t("notifications.rejectError", { defaultValue: "Erro ao recusar convite" })),
                              }
                            )}
                          >
                            {respondMutation.isPending ? t("loading", { defaultValue: "..." }) : t("notifications.reject", { defaultValue: "Recusar" })}
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs bg-green-600 hover:bg-green-700"
                            disabled={respondMutation.isPending}
                            onClick={() => respondMutation.mutate(
                              { invitationId: inv.id, accept: true },
                              {
                                onSuccess: () => toast.success(t("notifications.acceptSuccess", { defaultValue: "Convite aceite" })),
                                onError: () => toast.error(t("notifications.acceptError", { defaultValue: "Erro ao aceitar convite" })),
                              }
                            )}
                          >
                            {respondMutation.isPending ? t("loading", { defaultValue: "..." }) : t("notifications.accept", { defaultValue: "Aceitar" })}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {notifications.map((n) => (
                <div key={`notif-${n.id}`} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(n.created_at).toLocaleString("pt-PT")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!n.is_read && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-success"
                          title={t("notifications.markAsRead", { defaultValue: "Marcar como lido" })}
                          onClick={() => markAsRead(n.id)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        title={t("notifications.dismiss", { defaultValue: "Dispensar" })}
                        onClick={async () => {
                          try {
                            await dismissNotification(n.id);
                          } catch {
                            toast.error(t("notifications.dismissError", { defaultValue: "Erro ao dispensar" }));
                          }
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
