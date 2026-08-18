import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute, SuperAdminRedirect } from "@/components/protected-route";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { ClienteFormDialog } from "@/components/cliente-form-dialog";
import { ClienteDetailDialog } from "@/components/cliente-detail-dialog";
import { useI18n } from "@/hooks/use-i18n";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyId } from "@/hooks/use-profile-company";
import { useClientes, useProfilesForClientes } from "@/hooks/use-clientes";
import { useSupabaseErrorHandler } from "@/lib/supabase-error-handler";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { pt as dateFnsPt, enUS } from "date-fns/locale";
import {
  Users,
  UserCheck,
  Archive,
  CalendarDays,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  ArchiveRestore,
  Loader2,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { Database } from "@/integrations/supabase/types";

type Cliente = Database["public"]["Tables"]["clientes"]["Row"];

export const Route = createFileRoute("/cadastros/clientes")({
  head: () => ({ meta: [{ title: "Clientes" }] }),
  component: () => (
    <ProtectedRoute>
      <SuperAdminRedirect>
        <ClientesPage />
      </SuperAdminRedirect>
    </ProtectedRoute>
  ),
});

const STATUS_STYLES: Record<string, string> = {
  ativo: "bg-success/15 text-success border-success/30",
  inativo: "bg-muted text-muted-foreground border-border",
  arquivado: "bg-destructive/15 text-destructive border-destructive/30",
};

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  accent: string;
}) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div className={cn("flex items-center justify-between gap-2", accent)}>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", accent)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    </Card>
  );
}

function ClientesPage() {
  const { t, language, dateFormat } = useI18n();
  const { profile, isSuperAdmin } = useAuth();
  const companyId = useCompanyId();
  const qc = useQueryClient();
  const locale = language === "en" ? enUS : dateFnsPt;
  const handleError = useSupabaseErrorHandler();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [viewing, setViewing] = useState<Cliente | null>(null);
  const [tab, setTab] = useState<"meus" | "todos">("meus");
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [processesClientId, setProcessesClientId] = useState<string | null>(null);

  const fmtDate = (v?: string | null) => {
    if (!v) return "—";
    try {
      return format(parseISO(v), dateFormat, { locale });
    } catch {
      return v;
    }
  };

  const { data: clientes = [], isLoading } = useClientes();

  const { data: profiles = [] } = useProfilesForClientes();

  const lawyerName = (id?: string | null) => {
    if (!id) return "—";
    return profiles.find((p) => p.id === id)?.full_name ?? "—";
  };

  const { data: clientProcesses = [], isLoading: loadingProcesses } = useQuery({
    queryKey: ["client-processes", processesClientId],
    queryFn: async () => {
      if (!processesClientId) return [];
      const { data, error } = await supabase
        .from("processos")
        .select("id, numero, tipo, status, prioridade, responsavel_id, created_at")
        .eq("cliente_id", processesClientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!processesClientId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["clientes-all", companyId] });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return clientes.filter((c) => {
      if (tab === "meus" && c.created_by !== profile?.id) return false;
      if (!q) return true;
      return (
        (c.nome ?? "").toLowerCase().includes(q) ||
        (c.contacto ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.documento ?? "").toLowerCase().includes(q)
      );
    });
  }, [clientes, tab, search, profile?.id]);

  const stats = useMemo(() => {
    return {
      total: clientes.length,
      ativos: clientes.filter((c) => c.estado === "ativo").length,
      arquivados: clientes.filter((c) => c.estado === "arquivado").length,
    };
  }, [clientes]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const { error } = await supabase.from("clientes").delete().eq("id", confirmDelete);
      if (error) throw error;
      toast.success(t("clients.toasts.deleted"));
      invalidate();
    } catch (err) {
      handleError(err, { operation: "DELETE", table: "clientes" });
    } finally {
      setConfirmDelete(null);
    }
  };

  const updateStatus = async (c: Cliente, newStatus: string) => {
    try {
      const { error } = await supabase.from("clientes").update({ estado: newStatus }).eq("id", c.id);
      if (error) throw error;
      invalidate();
    } catch (err) {
      handleError(err, { operation: "UPDATE", table: "clientes" });
    }
  };

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };
  const navigate = useNavigate();

  const openEdit = (c: Cliente) => {
    setEditing(c);
    setOpen(true);
  };
  const openShowProcesses = (c: Cliente) => {
    setProcessesClientId(c.id);
  };

  const docLabel = (c: Cliente) => {
    const rawType = c.tipo_documento ? t(`clients.documentType.${c.tipo_documento}`) : "";
    const type = typeof rawType === "string" ? rawType : "";
    const num = c.documento ?? "";
    if (type && num) return type + ": " + num;
    return type || num || "—";
  };

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <PageHeader title={t("clients.title")} subtitle={t("clients.subtitle")} />

        <div className="space-y-5 p-6 lg:p-8">
          {/* STAT CARDS */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard label={t("clients.stats.total")} value={stats.total} icon={Users} accent="bg-primary/10 text-primary" />
            <StatCard label={t("clients.stats.active")} value={stats.ativos} icon={UserCheck} accent="bg-success/10 text-success" />
            <StatCard label={t("clients.stats.archived")} value={stats.arquivados} icon={Archive} accent="bg-destructive/10 text-destructive" />
          </div>

          {/* TOOLBAR */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("clients.searchPlaceholder")}
                className="pl-9 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button className="gap-1.5 h-9" onClick={openCreate}>
              <Plus className="h-4 w-4" /> {t("clients.addClient")}
            </Button>
          </div>

          {/* TABS */}
          <div className="flex gap-1 border-b border-border">
            <button
              onClick={() => setTab("meus")}
              className={cn(
                "px-3.5 py-2.5 text-sm font-medium border-b-2 transition-colors",
                tab === "meus"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t("clients.myClients")}
            </button>
            <button
              onClick={() => setTab("todos")}
              className={cn(
                "px-3.5 py-2.5 text-sm font-medium border-b-2 transition-colors",
                tab === "todos"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t("clients.allClients")}
            </button>
          </div>

          {/* TABLE */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-12 text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium text-foreground">{t("clients.emptyTitle")}</p>
              <p className="text-xs text-muted-foreground">{t("clients.emptyHint")}</p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("clients.columns.nome")}</TableHead>
                    <TableHead>{t("clients.columns.telefone")}</TableHead>
                    <TableHead>{t("clients.columns.email")}</TableHead>
                    <TableHead>{t("clients.columns.cidade")}</TableHead>
                    <TableHead>{t("clients.columns.documento")}</TableHead>
                    <TableHead>{t("clients.columns.advogado")}</TableHead>
                    <TableHead>{t("clients.columns.dataCadastro")}</TableHead>
                    <TableHead>{t("clients.columns.estado")}</TableHead>
                    <TableHead className="text-right">{t("clients.columns.acoes")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id} className="group cursor-pointer" onClick={() => setViewing(c)}>
                      <TableCell className="font-semibold text-primary hover:underline">
                        {c.nome}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.contacto || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{c.cidade || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{docLabel(c)}</TableCell>
                      <TableCell className="text-muted-foreground">{lawyerName(c.created_by)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtDate(c.created_at)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={c.estado}
                          onValueChange={(newStatus) => updateStatus(c, newStatus)}
                        >
                          <SelectTrigger className="h-7 w-auto gap-1 border-0 p-1 text-[10px] font-medium shadow-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="inativo">Inativo</SelectItem>
                            <SelectItem value="arquivado">Arquivado</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openShowProcesses(c)}>
                              <Eye className="h-3.5 w-3.5 mr-2" /> {t("clients.showProcesses")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(c)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> {t("clients.editClient")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setConfirmDelete(c.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> {t("clients.deleteClient")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </main>

      <ClienteFormDialog
        open={open}
        onOpenChange={setOpen}
        cliente={editing}
        onSaved={invalidate}
      />

      <ClienteDetailDialog
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        cliente={viewing}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("clients.confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("clients.confirmDelete")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={!!processesClientId} onOpenChange={(o) => !o && setProcessesClientId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t("clients.detail.associatedProcesses")}</SheetTitle>
            <SheetDescription>
              {loadingProcesses ? t("loading") ?? "A carregar..." : ""}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {!loadingProcesses && clientProcesses.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("clients.detail.noProcesses")}
              </p>
            )}
            {!loadingProcesses && clientProcesses.length > 0 && (
              <div className="space-y-1.5">
                {clientProcesses.map((proc) => (
                  <button
                    key={proc.id}
                    type="button"
                    onClick={() => {
                      navigate({ to: "/processos/$id", params: { id: proc.id } });
                      setProcessesClientId(null);
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{proc.numero}</p>
                      <p className="truncate text-xs text-muted-foreground">{proc.tipo}</p>
                    </div>
                      <div className="ml-3 flex items-center gap-2">
                        <span className="text-[10px] font-medium uppercase text-muted-foreground">
                          {fmtDate(proc.created_at)}
                        </span>
                      </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
