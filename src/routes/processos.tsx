import { createFileRoute, Link, useNavigate, useMatchRoute, Outlet } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ProtectedRoute, SuperAdminRedirect } from "@/components/protected-route";
import {
  useCreateProcesso,
  useUpdateProcesso,
  useDeleteProcesso,
  useLawyersForProcessSelection,
  useProcessos,
} from "@/hooks/use-tarefas";
import { useHideProcess, useUnhideProcess } from "@/hooks/use-process-hidden";
import { useI18n } from "@/hooks/use-i18n";
import { useAuth } from "@/hooks/use-auth";
import { can } from "@/lib/permissions";
import {
  LEGAL_PROCESS_TYPES,
  PROCESS_STATUSES,
  PROCESS_STATUS_LABELS,
  PROCESS_STATUS_STYLES,
  PROCESS_PRIORITIES,
  PROCESS_PRIORITY_LABELS,
  PROCESS_PRIORITY_STYLES,
  type Processo,
} from "@/lib/processos";
import { AppSidebar } from "@/components/app-sidebar";
import { NotificationsBell } from "@/components/notifications-bell";
import { ProcessoFormDialog } from "@/components/processo-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  FolderKanban,
  Plus,
  Search,
  X,
  Archive,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  Copy,
  MoreVertical,
  Loader2,
  Briefcase,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { pt as dateFnsPt, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/processos")({
  head: () => ({ meta: [{ title: "Processos" }] }),
  component: () => (
    <ProtectedRoute>
      <SuperAdminRedirect>
        <ProcessosPage />
      </SuperAdminRedirect>
    </ProtectedRoute>
  ),
});

type SortField =
  | "numero"
  | "cliente_nome"
  | "tipo"
  | "responsavel_id"
  | "status"
  | "prioridade"
  | "created_at"
  | "updated_at";

type FilterState = {
  search: string;
  tipo: string;
  status: string;
  prioridade: string;
  responsavel: string;
};

const PAGE_SIZE = 10;

function ProcessStatsCard({
  label,
  value,
  percent,
  variation,
  trend,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  percent: number;
  variation: string;
  trend: "up" | "down" | "flat";
  icon: typeof Briefcase;
  accent: string;
}) {
  return (
    <Card className="p-3">
      <div className={cn("flex items-center justify-between gap-2", accent)}>
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className={cn("flex h-7 w-7 items-center justify-center rounded-md", accent)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">{value}</p>
      <div className="mt-1.5 flex items-center justify-between">
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full", accent)} style={{ width: `${percent}%` }} />
        </div>
        <span className="ml-2 shrink-0 text-[10px] font-medium text-muted-foreground">
          {percent}%
        </span>
      </div>
      <p
        className={cn(
          "mt-1 flex items-center gap-1 text-[10px] font-medium",
          trend === "up" && "text-success",
          trend === "down" && "text-destructive",
          trend === "flat" && "text-muted-foreground",
        )}
      >
        {trend === "up" && <ArrowUp className="h-3 w-3" />}
        {trend === "down" && <ArrowDown className="h-3 w-3" />}
        {variation}
      </p>
    </Card>
  );
}

function ProcessosPage() {
  const { t, language, dateFormat } = useI18n();
  const { profile, isSuperAdmin } = useAuth();
  const companyId = isSuperAdmin ? null : (profile?.company_id ?? null);
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const isDetail = !!matchRoute({ to: "/processos/$id" });
  const canAdd = can(profile, "create_process");

  const [tab, setTab] = useState<"mine" | "all">("all");
  const { data: allProcessos = [], isLoading } = useProcessos(tab);
  const lawyersQuery = useLawyersForProcessSelection();
  const lawyers = lawyersQuery.data ?? [];

  const isCreator = (p: Processo) => p.created_by === profile?.id;
  const canDelete = (p: Processo) => isCreator(p);

  const hideProcess = useHideProcess();
  const unhideProcess = useUnhideProcess();

  const processos = useMemo(() => {
    const list = allProcessos ?? [];
    if (tab === "mine" && profile?.id) {
      return list.filter((p) => p.created_by === profile.id);
    }
    return list;
  }, [allProcessos, tab, profile?.id]);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    tipo: "",
    status: "",
    prioridade: "",
    responsavel: "",
  });
  const [sort, setSort] = useState<{ field: SortField; dir: "asc" | "desc" }>({
    field: "created_at",
    dir: "desc",
  });
  const [page, setPage] = useState(0);

  const toggleSort = (field: SortField) => {
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === "asc" ? "desc" : "asc",
    }));
  };

  const locale = language === "en" ? enUS : dateFnsPt;

  const fmtDate = (v?: string | null) => {
    if (!v) return "—";
    try {
      return format(parseISO(v), dateFormat, { locale });
    } catch {
      return v;
    }
  };

  const lawyerName = (id?: string | null) => {
    if (!id) return "—";
    if (id === profile?.id) return profile?.full_name ?? "—";
    return lawyers.find((l) => l.id === id)?.name ?? "—";
  };

  const stats = useMemo(() => {
    const list = processos ?? [];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return {
      total: list.length,
      emAndamento: list.filter((p) => p.status === "em_andamento").length,
      concluidos: list.filter((p) => p.status === "concluido").length,
      urgentes: list.filter((p) => p.prioridade === "urgente").length,
      arquivados: list.filter((p) => p.status === "arquivado").length,
      novosSemana: list.filter((p) => p.created_at && new Date(p.created_at) >= weekAgo).length,
    };
  }, [processos]);

  const pct = (n: number) => (stats.total ? Math.round((n / stats.total) * 100) : 0);

  const filtered = useMemo(() => {
    let list = [...(processos ?? [])];
    const q = filters.search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (p) =>
          p.numero.toLowerCase().includes(q) ||
          (p.cliente_nome ?? "").toLowerCase().includes(q) ||
          p.tipo.toLowerCase().includes(q),
      );
    }
    if (filters.tipo) list = list.filter((p) => p.tipo === filters.tipo);
    if (filters.status) list = list.filter((p) => p.status === filters.status);
    if (filters.prioridade) list = list.filter((p) => p.prioridade === filters.prioridade);
    if (filters.responsavel) list = list.filter((p) => p.responsavel_id === filters.responsavel);

    const dir = sort.dir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      const statusOrder: Record<string, number> = {
        em_andamento: 0,
        pendente: 1,
        suspenso: 2,
        novo: 3,
        concluido: 4,
        arquivado: 5,
      };
      const aStatus = statusOrder[a.status] ?? 99;
      const bStatus = statusOrder[b.status] ?? 99;
      if (aStatus !== bStatus) return aStatus - bStatus;

      const aVal = (a as unknown as Record<string, unknown>)[sort.field];
      const bVal = (b as unknown as Record<string, unknown>)[sort.field];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return dir;
      if (bVal == null) return -dir;
      return String(aVal).localeCompare(String(bVal)) * dir;
    });
    return list;
  }, [processos, filters, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const createMutation = useCreateProcesso();
  const updateMutation = useUpdateProcesso();
  const deleteMutation = useDeleteProcesso();

  const activeProcesso = useMemo(
    () => processos?.find((p) => p.id === editingId) ?? null,
    [processos, editingId],
  );

  const openCreate = () => {
    setEditingId(null);
    setOpen(true);
  };
  const openEdit = (p: Processo) => {
    setEditingId(p.id);
    setOpen(true);
  };

  const handleArchive = async () => {
    if (!confirmArchive) return;
    try {
      await updateMutation.mutateAsync({ id: confirmArchive, updates: { status: "arquivado" } });
      toast.success("Processo arquivado com sucesso.");
    } catch {
      // handled
    } finally {
      setConfirmArchive(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete);
      toast.success("Processo eliminado com sucesso.");
    } catch {
      // handled
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleDuplicate = async (p: Processo) => {
    try {
      await createMutation.mutateAsync({
        numero: "",
        cliente_id: p.cliente_id || null,
        cliente_nome: p.cliente_nome || null,
        tipo: p.tipo,
        status: p.status || "novo",
        descricao: p.descricao || null,
        responsavel_id: p.responsavel_id || profile?.id || null,
        valor_causa: p.valor_causa ?? null,
        prioridade: p.prioridade || "media",
        colaboradores: p.colaboradores ?? null,
      });
      toast.success("Processo duplicado com sucesso.");
    } catch {
      // handled
    }
  };

  const clearFilters = () => {
    setFilters({ search: "", tipo: "", status: "", prioridade: "", responsavel: "" });
    setPage(0);
  };

  const activeFilterCount = [
    filters.tipo,
    filters.status,
    filters.prioridade,
    filters.responsavel,
  ].filter(Boolean).length;

  if (isDetail) return <Outlet />;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sortIcon = (field: SortField) =>
    sort.field === field ? (
      sort.dir === "asc" ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : (
        <ArrowDown className="h-3.5 w-3.5" />
      )
    ) : (
      <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
    );

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />

      <main className="flex-1 overflow-auto">
        <div className="flex items-center justify-end px-6 pt-4 lg:px-8">
          <NotificationsBell />
        </div>
        <div className="p-6 lg:p-8">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <ProcessStatsCard
              label={t("processes.totalProcessos")}
              value={stats.total}
              percent={100}
              variation={`${stats.novosSemana} ${t("processes.newThisWeek")}`}
              trend={stats.novosSemana > 0 ? "up" : "flat"}
              icon={Briefcase}
              accent="bg-primary/10 text-primary"
            />
            <ProcessStatsCard
              label={t("processes.active")}
              value={stats.emAndamento}
              percent={pct(stats.emAndamento)}
              variation={`${pct(stats.emAndamento)}${t("processes.ofTotal")}`}
              trend="up"
              icon={TrendingUp}
              accent="bg-info/10 text-info"
            />
            <ProcessStatsCard
              label={t("processes.concluded")}
              value={stats.concluidos}
              percent={pct(stats.concluidos)}
              variation={`${pct(stats.concluidos)}${t("processes.ofTotal")}`}
              trend="up"
              icon={CheckCircle2}
              accent="bg-success/10 text-success"
            />
            <ProcessStatsCard
              label={t("processes.urgent")}
              value={stats.urgentes}
              percent={pct(stats.urgentes)}
              variation={`${pct(stats.urgentes)}${t("processes.ofTotal")}`}
              trend={stats.urgentes > 0 ? "down" : "flat"}
              icon={AlertTriangle}
              accent="bg-destructive/10 text-destructive"
            />
            <ProcessStatsCard
              label={t("processes.archived")}
              value={stats.arquivados}
              percent={pct(stats.arquivados)}
              variation={`${pct(stats.arquivados)}${t("processes.ofTotal")}`}
              trend="flat"
              icon={ArchiveRestore}
              accent="bg-muted text-muted-foreground"
            />
          </div>

           <Card className="mt-5 p-4">
             <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
               <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
                 <div className="relative lg:col-span-2">
                   <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={t("processes.searchPlaceholder")}
                      className="pl-9 h-9"
                     value={filters.search}
                     onChange={(e) => {
                       setFilters((f) => ({ ...f, search: e.target.value }));
                       setPage(0);
                     }}
                   />
                 </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">{t("processes.statusLabel")}</Label>
                    <Select
                      value={filters.status}
                      onValueChange={(v) => {
                        setFilters((f) => ({ ...f, status: v === "all" ? "" : v }));
                        setPage(0);
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder={t("processes.all")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("processes.all")}</SelectItem>
                        {PROCESS_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {t(`process.status.${s}`) || PROCESS_STATUS_LABELS[s] || s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">{t("processes.priorityLabel")}</Label>
                    <Select
                      value={filters.prioridade}
                      onValueChange={(v) => {
                        setFilters((f) => ({ ...f, prioridade: v === "all" ? "" : v }));
                        setPage(0);
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder={t("processes.allPriorities")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("processes.allPriorities")}</SelectItem>
                        {PROCESS_PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {t(`process.priority.${p}`) || PROCESS_PRIORITY_LABELS[p] || p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">{t("processes.responsibleLabel")}</Label>
                   <Select
                     value={filters.responsavel}
                     onValueChange={(v) => {
                       setFilters((f) => ({ ...f, responsavel: v === "all" ? "" : v }));
                       setPage(0);
                     }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder={t("processes.all")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("processes.all")}</SelectItem>
                        {lawyers.map((l) => (
                         <SelectItem key={l.id} value={l.id}>
                           {l.name}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
               </div>

               <div className="flex items-center gap-2">
                 <div className="flex items-center rounded-lg border border-border p-0.5">
                   <button
                     type="button"
                     onClick={() => setTab("mine")}
                     className={cn(
                       "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                       tab === "mine" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                     )}
                    >
                      {t("processes.myProcesses")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab("all")}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                        tab === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t("processes.allProcesses")}
                    </button>
                 </div>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" className="gap-1.5 h-9" onClick={clearFilters}>
                      <X className="h-4 w-4" /> {t("processes.clearFilters")}
                    </Button>
                  )}
                  {canAdd && (
                    <Button className="gap-1.5 h-9" onClick={openCreate}>
                      <Plus className="h-4 w-4" /> {t("processes.newProcess")}
                    </Button>
                  )}
               </div>
             </div>
           </Card>

          <div className="mt-5 flex-1">
             {filtered.length === 0 ? (
               <Card className="p-12 text-center">
                 <FolderKanban className="mx-auto h-10 w-10 text-muted-foreground/40" />
                 <p className="mt-3 text-sm font-medium text-foreground">{t("processes.emptyTitle")}</p>
                 <p className="text-xs text-muted-foreground">
                   {t("processes.emptyHint")}
                 </p>
               </Card>
             ) : (
               <Card className="overflow-hidden">
                  <Table>
                  <TableHeader>
                    <TableRow>
                       <TableHead
                         className="cursor-pointer select-none"
                         onClick={() => toggleSort("numero")}
                       >
                         <span className="inline-flex items-center gap-1">
                           {t("processes.table.number")} {sortIcon("numero")}
                         </span>
                       </TableHead>
                       <TableHead
                         className="cursor-pointer select-none"
                         onClick={() => toggleSort("cliente_nome")}
                       >
                         <span className="inline-flex items-center gap-1">
                           {t("processes.table.client")} {sortIcon("cliente_nome")}
                         </span>
                       </TableHead>
                       <TableHead
                         className="cursor-pointer select-none"
                         onClick={() => toggleSort("tipo")}
                       >
                         <span className="inline-flex items-center gap-1">
                           {t("processes.table.type")} {sortIcon("tipo")}
                         </span>
                       </TableHead>
                       <TableHead
                         className="cursor-pointer select-none"
                         onClick={() => toggleSort("responsavel_id")}
                       >
                         <span className="inline-flex items-center gap-1">
                           {t("processes.table.responsibleLawyer")} {sortIcon("responsavel_id")}
                         </span>
                       </TableHead>
                       <TableHead
                         className="cursor-pointer select-none"
                         onClick={() => toggleSort("created_by")}
                       >
                         <span className="inline-flex items-center gap-1">
                           {t("processes.table.creator")} {sortIcon("created_by")}
                         </span>
                       </TableHead>
                       <TableHead
                         className="cursor-pointer select-none"
                         onClick={() => toggleSort("status")}
                       >
                         <span className="inline-flex items-center gap-1">
                           {t("processes.table.status")} {sortIcon("status")}
                         </span>
                       </TableHead>
                       <TableHead
                         className="cursor-pointer select-none"
                         onClick={() => toggleSort("prioridade")}
                       >
                         <span className="inline-flex items-center gap-1">
                           {t("processes.table.priority")} {sortIcon("prioridade")}
                         </span>
                       </TableHead>
                       <TableHead
                         className="cursor-pointer select-none"
                         onClick={() => toggleSort("created_at")}
                       >
                         <span className="inline-flex items-center gap-1">
                           {t("processes.table.date")} {sortIcon("created_at")}
                         </span>
                       </TableHead>
                       <TableHead
                         className="cursor-pointer select-none"
                         onClick={() => toggleSort("updated_at")}
                       >
                         <span className="inline-flex items-center gap-1">
                           {t("processes.table.lastUpdate")} {sortIcon("updated_at")}
                         </span>
                       </TableHead>
                       <TableHead className="text-right">{t("processes.table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((p) => (
                      <TableRow
                        key={p.id}
                        className="group cursor-pointer"
                        onClick={() => navigate({ to: "/processos/$id", params: { id: p.id } })}
                      >
                        <TableCell className="font-semibold text-primary hover:underline">
                          {p.numero}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate">{p.cliente_nome}</TableCell>
                        <TableCell className="max-w-[160px] truncate text-muted-foreground">
                          {p.tipo}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {lawyerName(p.responsavel_id)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {lawyerName(p.created_by)}
                        </TableCell>
                        <TableCell>
                            <Badge className={cn("text-[10px]", PROCESS_STATUS_STYLES[p.status])}>
                              {t(`process.status.${p.status}`) || PROCESS_STATUS_LABELS[p.status] || p.status}
                            </Badge>
                        </TableCell>
                        <TableCell>
                          {p.prioridade && p.prioridade !== "normal" ? (
                            <Badge
                              className={cn("text-[10px]", PROCESS_PRIORITY_STYLES[p.prioridade])}
                            >
                              {t(`process.priority.${p.prioridade}`) || PROCESS_PRIORITY_LABELS[p.prioridade] || p.prioridade}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {fmtDate(p.created_at)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {fmtDate(p.updated_at)}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to="/processos/$id" params={{ id: p.id }}>
                                  <Eye className="h-3.5 w-3.5 mr-2" /> {t("processes.openProcess")}
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(p)}>
                                <Pencil className="h-3.5 w-3.5 mr-2" /> {t("processes.edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(p)}>
                                <Copy className="h-3.5 w-3.5 mr-2" /> {t("processes.duplicate")}
                              </DropdownMenuItem>
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <span className="flex items-center gap-2">{t("processes.changeStatus")}</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  {PROCESS_STATUSES.map((s) => (
                                    <DropdownMenuItem
                                      key={s}
                                      disabled={p.status === s}
                                      onClick={() =>
                                        updateMutation.mutateAsync({ id: p.id, updates: { status: s } })
                                      }
                                    >
                                      {t(`process.status.${s}`) || PROCESS_STATUS_LABELS[s] || s}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                              <DropdownMenuItem
                                disabled={p.status === "arquivado" || !canDelete(p)}
                                onClick={() => setConfirmArchive(p.id)}
                              >
                                <Archive className="h-3.5 w-3.5 mr-2" /> {t("processes.archive")}
                              </DropdownMenuItem>
                              {!isCreator(p) && (
                                <DropdownMenuItem
                                  onClick={() => hideProcess.mutate(p.id)}
                                >
                                  <EyeOff className="h-3.5 w-3.5 mr-2" /> {t("processes.hide")}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                disabled={!canDelete(p)}
                                onClick={() => setConfirmDelete(p.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> {t("processes.delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    {t("processes.itemsCount", { count: filtered.length, page: safePage + 1, total: pageCount })}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={safePage === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={safePage >= pageCount - 1}
                      onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            )}
           </div>
         </div>
       </main>

      <ProcessoFormDialog
        open={open}
        onOpenChange={setOpen}
        processo={activeProcesso}
        onSaved={() => {}}
      />

      <AlertDialog open={!!confirmArchive} onOpenChange={(o) => !o && setConfirmArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("process.confirmArchive")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("process.confirmArchive")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmArchive(null)}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("archive")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("process.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("process.confirmDelete")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDelete(null)}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
