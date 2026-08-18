import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute, SuperAdminRedirect } from "@/components/protected-route";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/hooks/use-i18n";
import { useTarefas, useCreateTarefa, useUpdateTarefa, useDeleteTarefa } from "@/hooks/use-tarefas";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { playNotificationSound } from "@/lib/notification-sound";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import { Loader2, CheckCircle, XCircle, Plus } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tarefas")({
  head: () => ({ meta: [{ title: "Tarefas" }] }),
  component: () => (
    <ProtectedRoute>
      <SuperAdminRedirect>
        <TarefasPage />
      </SuperAdminRedirect>
    </ProtectedRoute>
  ),
});

function TarefasPage() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const { data: tarefas, isLoading } = useTarefas();
  const createTarefa = useCreateTarefa();
  const updateTarefa = useUpdateTarefa();
  const deleteTarefa = useDeleteTarefa();
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    task_date: null as string | null,
  });

  useEffect(() => {
    if (!tarefas || tarefas.length === 0 || !profile) return;
    const today = new Date().toISOString().split("T")[0];
    const vencidas = tarefas.filter(
      (t) => (t.status === "pending" || t.status === "in_progress") && t.task_date && t.task_date <= today,
    );
    if (vencidas.length === 0) return;

    (async () => {
      try {
        const { data: existingNotifications } = await supabase
          .from("notifications")
          .select("entity_id")
          .eq("user_id", profile.id)
          .eq("entity_type", "task")
          .in("entity_id", vencidas.map((v) => v.id))
          .eq("is_read", false);

        const existingIds = new Set((existingNotifications ?? []).map((n) => n.entity_id));
        const novas = vencidas.filter((v) => !existingIds.has(v.id));
        if (novas.length === 0) return;

        const inserts = novas.map((t) => ({
          company_id: t.company_id,
          user_id: profile.id,
          title: "Tarefa vencida",
          message: `A tarefa "${t.title}" venceu em ${t.task_date}.`,
          type: "reminder",
          entity_type: "task",
          entity_id: t.id,
        }));

        await supabase.from("notifications").insert(inserts);
        if (novas.length > 0) {
          void playNotificationSound();
        }
      } catch {
        // silently fail
      }
    })();
  }, [tarefas, profile]);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    createTarefa.mutate(
      {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        task_date: form.task_date || new Date().toISOString().split("T")[0],
      },
      {
        onSuccess: () => {
          setOpenDialog(false);
          setForm({
            title: "",
            description: "",
            task_date: null,
          });
        },
      },
    );
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateTarefa.mutateAsync({
        id,
        updates: { status: status as "pending" | "in_progress" | "completed" | "cancelled" },
      });
    } catch {
      // handled by hook
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja eliminar esta tarefa?")) return;
    try {
      await deleteTarefa.mutateAsync(id);
    } catch {
      // handled by hook
    }
  };

  const statusMap: Record<string, { label: string; variant: string }> = {
    pending: {
      label: t("tarefas.status.pending", { defaultValue: "Pendente" }),
      variant: "bg-warning/15 text-warning border-warning/30",
    },
    in_progress: {
      label: t("tarefas.status.inProgress", { defaultValue: "Em Andamento" }),
      variant: "bg-info/15 text-info border-info/30",
    },
    completed: {
      label: t("tarefas.status.completed", { defaultValue: "Concluída" }),
      variant: "bg-success/15 text-success border-success/30",
    },
    cancelled: {
      label: t("tarefas.status.cancelled", { defaultValue: "Cancelada" }),
      variant: "bg-destructive/15 text-destructive border-destructive/30",
    },
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <PageHeader title={t("tarefas.title")} />
          <div className="p-6 lg:p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <PageHeader
          title={t("tarefas.title")}
          subtitle={t("tarefasSubtitle", { defaultValue: "Gestão de tarefas" })}
          action={
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t("tarefas.addTask", { defaultValue: "Nova Tarefa" })}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{t("tarefas.addTask")}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>{t("tarefas.taskForm.title")}</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder={t("tarefas.taskForm.titlePlaceholder")}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("tarefas.taskForm.description")}</Label>
                    <Input
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder={t("tarefas.taskForm.descriptionPlaceholder")}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("tarefas.taskForm.taskDate")}</Label>
                    <DateInput
                      value={form.task_date}
                      onChange={(v) => setForm({ ...form, task_date: v })}
                      placeholder="DD/MM/AAAA"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpenDialog(false)}>
                      {t("tarefas.taskForm.cancel")}
                    </Button>
                    <Button
                      onClick={handleCreate}
                      disabled={createTarefa.isPending || !form.title.trim()}
                    >
                      {createTarefa.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t("tarefas.taskForm.create")}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          }
        />
        <div className="p-6 lg:p-8 space-y-4">
          {(tarefas ?? []).length === 0 ? (
            <Card className="p-12 text-center">
              <CheckCircle className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium text-foreground">{t("tarefas.empty.title")}</p>
              <p className="text-xs text-muted-foreground">{t("tarefas.empty.subtitle")}</p>
            </Card>
          ) : (
            (tarefas ?? []).map((task) => {
              const info = statusMap[task.status] || statusMap["pending"];
              return (
                <Card key={task.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{task.title}</p>
                      {task.description && (
                        <p className="text-sm text-muted-foreground truncate">{task.description}</p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {task.task_date && (
                          <span>
                            {format(parseISO(task.task_date), "dd/MM/yyyy", { locale: pt })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn(info.variant, "border")}>{info.label}</Badge>
                      {task.status !== "completed" && task.status !== "cancelled" && (
                        <div className="flex gap-1">
                          {task.status === "pending" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatusChange(task.id, "in_progress")}
                              className="h-7 w-7 p-0 text-info"
                              title="Iniciar"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {task.status === "in_progress" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatusChange(task.id, "completed")}
                              className="h-7 w-7 p-0 text-success"
                              title="Concluir"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(task.id)}
                            className="h-7 w-7 p-0 text-destructive"
                            title="Eliminar"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
