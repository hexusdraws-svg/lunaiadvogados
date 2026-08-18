import { useState, useMemo, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  useUpdateProcesso,
  useDeleteProcesso,
  useLawyersForProcessSelection,
} from "@/hooks/use-tarefas";
import {
  useEtapasPorProcesso,
  useCreateEtapa,
  useUpdateEtapa,
  useDeleteEtapa,
  useDocumentosPorProcesso,
  useUploadDocumento,
  useDeleteDocumento,
  useHistoricoPorProcesso,
  useAdicionarHistorico,
} from "@/hooks/use-processo-stages";
import {
  useNotasPorProcesso,
  useCreateNota,
  useUpdateNota,
  useDeleteNota,
} from "@/hooks/use-processo-notes";
import { useContractsByProcesso, useDeleteContract } from "@/hooks/use-contracts";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { ProtectedRoute, SuperAdminRedirect } from "@/components/protected-route";
import { useCreateCollaborationInvites, useProcessAcceptedCollaborators, useCanInviteCollaborators } from "@/hooks/use-process-collaboration";
import { supabase } from "@/integrations/supabase/client";
import {
  PROCESS_STATUSES,
  PROCESS_STATUS_LABELS,
  PROCESS_STATUS_STYLES,
  PROCESS_PRIORITIES,
  PROCESS_PRIORITY_LABELS,
  PROCESS_PRIORITY_STYLES,
  ETAPA_STATUS_LABELS,
  ETAPA_STATUS_STYLES,
  type Processo,
  type ProcessoEtapa,
  type ProcessoDocumento,
  type ProcessoHistorico,
  type Audiencia,
} from "@/lib/processos";
import { AppSidebar } from "@/components/app-sidebar";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ArchiveRestore,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Archive,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  X,
  Calendar,
  Clock,
  FileText,
  DollarSign,
  StickyNote,
  ChevronsUpDown,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Users,
  User,
  Eye,
  Download,
  Briefcase,
  History,
  Circle,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { pt as dateFnsPt, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  ContractEditorPanel,
  type ContractDraft,
} from "@/components/contract-editor-panel";
import { htmlToChips } from "@/lib/contracts";

const TABS = [
  { id: "etapas", label: "Etapas" },
  { id: "audiencias", label: "Audiências" },
  { id: "documentos", label: "Documentos" },
  { id: "contratos", label: "Contratos" },
  { id: "financeiro", label: "Financeiro" },
  { id: "anotacoes", label: "Anotações" },
  { id: "timeline", label: "Timeline" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export const Route = createFileRoute("/processos/$id")({
  head: () => ({ meta: [{ title: "Processo" }] }),
  component: () => (
    <ProtectedRoute>
      <SuperAdminRedirect>
        <ErrorBoundary
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-background p-6">
              <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-foreground">Algo correu mal</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Esta página encontrou um erro inesperado. Pode tentar novamente ou regressar à lista.
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Tentar novamente
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = "/processos";
                    }}
                    className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            </div>
          }
        >
          <ProcessoDetailPage />
        </ErrorBoundary>
      </SuperAdminRedirect>
    </ProtectedRoute>
  ),
});

type ProcessoDetailHeaderProps = {
  processo: Processo | null | undefined;
  lawyers: any[];
  profile: any;
  responsibleLawyer: any;
  existingCollabs: string[];
  collabProfiles: { id: string; name: string; professional_role?: string; role?: string }[];
  onStatusChange: (newStatus: string) => void;
  onAddCollab: () => void;
  onConclude: () => void;
  onDelete: () => void;
  isPendingConclude: boolean;
  statusStyles: Record<string, string>;
  statusLabels: Record<string, string>;
  fmtCurrency: (v?: number | null) => string;
  t: (key: string, options?: { defaultValue?: string }) => string;
  canInvite: boolean;
};

function ProcessoDetailHeader({
  processo,
  lawyers,
  profile,
  responsibleLawyer,
  existingCollabs,
  collabProfiles,
  onStatusChange,
  onAddCollab,
  onConclude,
  onDelete,
  isPendingConclude,
  statusStyles,
  statusLabels,
  fmtCurrency,
  t,
  canInvite,
}: ProcessoDetailHeaderProps) {
  const getInitials = (name: string | null | undefined) =>
    (name || "??")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

   const responsible = responsibleLawyer ?? lawyers.find((l) => l.id === processo?.responsavel_id);

  return (
    <div className="rounded-xl border border-border bg-background/60 p-4 space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div>
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Número do Processo</p>
          <p className="text-sm font-medium mt-0.5">{processo?.numero || "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Tipo de Processo</p>
          <p className="text-sm font-medium mt-0.5">{processo?.tipo || "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Status</p>
          <div className="mt-0.5">
            <Select value={processo?.status} onValueChange={onStatusChange}>
              <SelectTrigger className="h-7 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROCESS_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{statusLabels[s] || s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Prioridade</p>
          <div className="mt-0.5">
            {processo?.prioridade ? (
              <Badge className={cn("text-[10px]", PROCESS_PRIORITY_STYLES[processo.prioridade])}>
                {PROCESS_PRIORITY_LABELS[processo.prioridade] || processo.prioridade}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Advogado Responsável</p>
          {responsible ? (
            <div className="flex items-center gap-2 mt-1">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px]">{getInitials(responsible.name)}</AvatarFallback>
              </Avatar>
              <p className="text-sm font-medium">{responsible.name}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">Sem responsável atribuído</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Advogados Colaboradores</p>
          {collabProfiles.length === 0 ? (
            <p className="text-xs text-muted-foreground mt-0.5">Sem colaboradores</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {collabProfiles.map((c) => (
                <div key={c.id} className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[9px]">{getInitials(c.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-[11px] font-medium">{c.name}</p>
                    <p className="text-[9px] text-muted-foreground">{c.professional_role || c.role || "Profissional"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {canInvite && (
          <Button size="sm" variant="outline" className="h-9 gap-1.5 border-primary text-primary hover:bg-primary/5" onClick={onAddCollab}>
            <Users className="h-4 w-4" /> Convidar Colaborador
          </Button>
        )}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={onConclude} disabled={isPendingConclude}>
            {isPendingConclude && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Concluir Processo
          </Button>
          <Button size="sm" variant="destructive" className="h-9 gap-1.5" onClick={onDelete}>
            <Trash2 className="h-4 w-4" /> Eliminar Processo
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProcessoDetailPage() {
  const { t, language, dateFormat } = useI18n();
  const { profile, isSuperAdmin } = useAuth();
  const companyId = isSuperAdmin ? null : (profile?.company_id ?? null);
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const locale = language === "en" ? enUS : dateFnsPt;

  const [tab, setTab] = useState<TabId>("etapas");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<string | null>(null);
  const [section, setSection] = useState<string>("documentos");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteType, setNoteType] = useState<"nota" | "alerta" | "lembrete">("nota");
  const [openNewEtapa, setOpenNewEtapa] = useState(false);
  const [expandedEtapa, setExpandedEtapa] = useState<string | null>(null);
  const [selectedEtapa, setSelectedEtapa] = useState<ProcessoEtapa | null>(null);
  const [openEtapaDetail, setOpenEtapaDetail] = useState(false);
  const [newEtapaTitulo, setNewEtapaTitulo] = useState("");
  const [newEtapaDescricao, setNewEtapaDescricao] = useState("");
  const [newEtapaPrazo, setNewEtapaPrazo] = useState<string | null>(null);
  const [newEtapaStatus, setNewEtapaStatus] = useState<"pendente" | "em_andamento" | "concluido" | "cancelado">("pendente");
  const [newEtapaFile, setNewEtapaFile] = useState<File | null>(null);
  const [newEtapaTarefas, setNewEtapaTarefas] = useState("");
  const [newEtapaResponsavel, setNewEtapaResponsavel] = useState("");
  const [filterResponsavel, setFilterResponsavel] = useState("all");

  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  const { data: processo, isLoading: loadingProcesso } = useQuery({
    queryKey: ["processo-detail", id, companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processos")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Processo | null;
    },
    enabled: !!id,
  });

  const updateMutation = useUpdateProcesso();
  const deleteMutation = useDeleteProcesso();

  const etapasQuery = useEtapasPorProcesso(id);
  const documentosQuery = useDocumentosPorProcesso(id);
  const historicoQuery = useHistoricoPorProcesso(id);
  const notasQuery = useNotasPorProcesso(id);
  const contratosQuery = useContractsByProcesso(id);
  const deleteContract = useDeleteContract();
  const createEtapa = useCreateEtapa(id);
  const updateEtapa = useUpdateEtapa(id);
  const deleteEtapa = useDeleteEtapa(id);
  const addHistorico = useAdicionarHistorico(id);
  const uploadDoc = useUploadDocumento(id);
  const deleteDoc = useDeleteDocumento(id);
  const createNota = useCreateNota(id);
  const updateNota = useUpdateNota(id);
  const deleteNota = useDeleteNota(id);

  const [audiencias, setAudiencias] = useState<Audiencia[]>([]);
  const [loadingAudiencias, setLoadingAudiencias] = useState(false);
  const [financeiro, setFinanceiro] = useState<any[]>([]);
  const [loadingFinanceiro, setLoadingFinanceiro] = useState(false);

  const [openAddCollab, setOpenAddCollab] = useState(false);
  const [selectedCollabs, setSelectedCollabs] = useState<string[]>([]);
  const [collabSearch, setCollabSearch] = useState("");
  const [confirmConclude, setConfirmConclude] = useState(false);

   const lawyersQuery = useLawyersForProcessSelection();
   const lawyers = lawyersQuery.data ?? [];

   // Fetch the responsible lawyer directly from profiles (independent of company scope)
    const { data: responsibleLawyer } = useQuery({
      queryKey: ["responsible-lawyer", processo?.responsavel_id],
      queryFn: async () => {
        if (!processo?.responsavel_id) return null;
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("id", processo.responsavel_id)
          .maybeSingle();
        if (error) return null;
        return data ? { id: data.id, name: data.full_name ?? data.email } : null;
      },
      enabled: !!processo?.responsavel_id,
      staleTime: 30_000,
    });

   const responsible = responsibleLawyer ?? lawyers.find((l) => l.id === processo?.responsavel_id);

   const createInvites = useCreateCollaborationInvites();

  const { data: acceptedInvites = [] } = useProcessAcceptedCollaborators(id);
  const canInvite = useCanInviteCollaborators(id);

  const existingCollabs = acceptedInvites.map((inv) => inv.invited_professional);

  const collabProfilesQuery = useQuery({
    queryKey: ["collab-profiles", existingCollabs],
    queryFn: async () => {
      if (!existingCollabs.length) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, professional_role, role")
        .in("id", existingCollabs);
      if (error) {
        console.error("[ProcessoDetailPage] collab profiles query error:", error);
        return [];
      }
      return (data ?? []).map((p) => ({
        id: p.id,
        name: p.full_name ?? p.email ?? "Profissional",
        professional_role: p.professional_role,
        role: p.role,
      }));
    },
    enabled: existingCollabs.length > 0,
  });

  const collabProfiles = (collabProfilesQuery.data ?? []).filter(
    (c) => c.id !== processo?.responsavel_id,
  );

  const etapas = etapasQuery.data ?? [];
  const documentos = documentosQuery.data ?? [];
  const historico = historicoQuery.data ?? [];
  const notas = notasQuery.data ?? [];
  const contratos = contratosQuery.data ?? [];
  const isCreator = processo?.created_by === profile?.id;

  const fmtDate = (v?: string | null) => {
    if (!v) return "—";
    try {
      return format(parseISO(v), dateFormat, { locale });
    } catch (err) {
      console.error("[ProcessoDetailPage] fmtDate error:", err, v);
      return v;
    }
  };
  const fmtCurrency = (v?: number | null) => {
    if (v == null) return "—";
    try {
      return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(v);
    } catch (err) {
      console.error("[ProcessoDetailPage] fmtCurrency error:", err, v);
      return String(v);
    }
  };

   const resolveLawyerName = (id?: string | null) => {
     if (!id) return "Sem responsável atribuído";
     if (id === profile?.id) return profile?.full_name ?? "Sem responsável atribuído";
     const localLawyer = lawyers.find((l) => l.id === id);
     if (localLawyer) return localLawyer.name;
      if (responsibleLawyer && responsibleLawyer.id === id) {
        return responsibleLawyer.name ?? "Sem responsável atribuído";
      }
     return "Sem responsável atribuído";
   };

  const timeline = useMemo(() => {
    const items: { id: string; date: string; text: string; type: string }[] = [];
    if (processo?.created_at) {
      items.push({ id: "created", date: processo.created_at, text: "Processo criado", type: "processo" });
    }
    for (const e of etapas) {
      items.push({ id: e.id, date: e.created_at, text: `Etapa: ${e.titulo}`, type: "etapa" });
    }
    for (const a of audiencias) {
      items.push({ id: a.id, date: a.hearing_date, text: `Audiência: ${a.court_name}`, type: "audiencia" });
    }
    for (const h of historico) {
      items.push({ id: h.id, date: h.created_at, text: h.descricao, type: "historico" });
    }
    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [processo, etapas, audiencias, historico]);

  const etapaDocumentos = (etapaId: string) => documentos.filter((d) => d.etapa_id === etapaId);

  const loadAudiencias = async () => {
    setLoadingAudiencias(true);
    try {
      const { data } = await supabase.from("hearings").select("*").eq("case_id", id).order("hearing_date", { ascending: true });
      setAudiencias(data ?? []);
    } catch (err) {
      console.error("[ProcessoDetailPage] loadAudiencias error:", err);
      setAudiencias([]);
    } finally {
      setLoadingAudiencias(false);
    }
  };

  const loadFinanceiro = async () => {
    setLoadingFinanceiro(true);
    try {
      const { data } = await supabase.from("financial_transactions").select("*").eq("process_id", id).order("created_at", { ascending: false });
      setFinanceiro(data ?? []);
    } catch (err) {
      console.error("[ProcessoDetailPage] loadFinanceiro error:", err);
      setFinanceiro([]);
    } finally {
      setLoadingFinanceiro(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!processo) return;
    await updateMutation.mutateAsync({ id: processo.id, updates: { status: newStatus } });
    toast.success("Estado atualizado");
  };

  const handleDelete = async () => {
    if (!processo) return;
    await deleteMutation.mutateAsync(processo.id);
    toast.success("Processo eliminado");
    navigate({ to: "/processos" });
  };

  const handleConcludeProcess = async () => {
    if (!processo) return;
    const concludedAt = new Date().toISOString();

    await updateMutation.mutateAsync({
      id: processo.id,
      updates: {
        status: "concluido",
        concluded_at: concludedAt,
      },
    });

    await addHistorico.mutateAsync({
      tipo: "conclusao",
      descricao: `Processo concluído em ${format(new Date(concludedAt), "dd/MM/yyyy HH:mm", { locale })}.`,
    });

    setConfirmConclude(false);
  };

  const handleCreateNota = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) return;
    await createNota.mutateAsync({ titulo: noteTitle, conteudo: noteContent, tipo: noteType });
    setNoteTitle("");
    setNoteContent("");
  };

   const handleAddCollaborators = async () => {
     if (!processo || !selectedCollabs.length) return;
     const newCollabs = selectedCollabs.filter((id) => !(processo.colaboradores ?? []).includes(id));
     if (!newCollabs.length) return;

     try {
       if (companyId) {
         await createInvites.mutateAsync({
           processId: processo.id,
           companyId,
           collaborators: newCollabs,
           processoNumero: processo.numero || "Processo",
         });
       }

       setSelectedCollabs([]);
       setCollabSearch("");
       setOpenAddCollab(false);
       toast.success("Convite(s) enviado(s) com sucesso.");
     } catch {
       // handled by mutation toasts
     }
   };

  const handleDeleteContract = async () => {
    if (!contractToDelete) return;
    try {
      await deleteContract.mutateAsync(contractToDelete);
      setContractToDelete(null);
    } catch {
      // handled by mutation toast
    }
  };

  const openContractEditor = (c: Contract) => {
    setEditingContract(c);
  };

  useEffect(() => {
    if (tab === "audiencias") loadAudiencias();
    if (tab === "financeiro") loadFinanceiro();
  }, [tab]);

  if (loadingProcesso) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!processo) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Processo não encontrado.</p>
      </div>
    );
  }

  if (!isSuperAdmin && processo.company_id !== companyId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Não tem permissão para aceder a este processo.</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <ProcessoDetailHeader
          processo={processo}
          lawyers={lawyers}
          profile={profile}
          responsibleLawyer={responsibleLawyer}
          existingCollabs={existingCollabs}
          collabProfiles={collabProfiles}
          onStatusChange={handleStatusChange}
          onAddCollab={() => setOpenAddCollab(true)}
          onConclude={() => setConfirmConclude(true)}
          onDelete={() => setConfirmDelete(true)}
          isPendingConclude={updateMutation.isPending}
          statusStyles={PROCESS_STATUS_STYLES}
          statusLabels={PROCESS_STATUS_LABELS}
          fmtCurrency={fmtCurrency}
          t={t}
          canInvite={canInvite}
        />

        <div className="p-6 lg:p-8">
          <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {tab === "etapas" && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Etapas</h3>
                  <div className="flex items-center gap-2">
                    <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
                      <SelectTrigger className="h-9 w-48 text-xs">
                        <SelectValue placeholder="Filtrar responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os responsáveis</SelectItem>
                        {lawyers.map((l) => (
                          <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" className="h-9 gap-1.5 bg-amber-500 text-white hover:bg-amber-600" onClick={() => setOpenNewEtapa(true)}>
                      <Plus className="h-3.5 w-3.5" /> Nova Etapa
                    </Button>
                  </div>
                </div>
                {etapas.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem etapas.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Etapa</TableHead>
                        <TableHead>Prazo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Tarefas</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead className="w-24">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {etapas
                        .filter((etapa) => filterResponsavel === "all" || etapa.responsavel_id === filterResponsavel)
                        .map((etapa, idx) => {
                          return (
                            <TableRow key={etapa.id}>
                              <TableCell className="text-xs font-medium">{etapa.titulo}</TableCell>
                              <TableCell className="text-xs">{etapa.data_prevista ? fmtDate(etapa.data_prevista) : "—"}</TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{etapa.descricao || "—"}</TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[250px] whitespace-pre-wrap">{etapa.tarefas || "—"}</TableCell>
                              <TableCell className="text-xs">{resolveLawyerName(etapa.responsavel_id)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setSelectedEtapa(etapa); setOpenEtapaDetail(true); }} title="Ver detalhes">
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setConfirmDelete(etapa.id)} title="Eliminar">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                )}
              </Card>
            )}

            {tab === "timeline" && (
              <Card className="p-4">
                {timeline.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem eventos.</p>
                ) : (
                  <div className="flex items-center gap-4 overflow-x-auto pb-2">
                    {timeline.map((ev, idx) => {
                      const cfg = {
                        processo: { label: "Processo", color: "bg-blue-500 text-white" },
                        etapa: { label: "Etapa", color: "bg-green-500 text-white" },
                        tarefa: { label: "Tarefa", color: "bg-yellow-500 text-white" },
                        audiencia: { label: "Audiência", color: "bg-purple-500 text-white" },
                        historico: { label: "Histórico", color: "bg-gray-500 text-white" },
                      }[ev.type] || { label: ev.type, color: "bg-gray-500 text-white" };

                      const next = timeline[idx + 1];
                      const days = next
                        ? Math.max(0, Math.round((new Date(next.date).getTime() - new Date(ev.date).getTime()) / (1000 * 60 * 60 * 24)))
                        : 0;

                      return (
                        <div key={ev.id} className="flex items-center gap-2 shrink-0">
                          <div className={cn("rounded-md px-2 py-1 text-xs font-medium", cfg.color)}>
                            {cfg.label}
                          </div>
                          {idx < timeline.length - 1 && (
                            <span className="text-[10px] text-muted-foreground">
                              {days === 0 ? "—" : `${days} dia(s)`}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}

            {tab === "audiencias" && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Audiências</h3>
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={loadAudiencias} disabled={loadingAudiencias}>
                    {loadingAudiencias && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Atualizar
                  </Button>
                </div>
                {audiencias.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem audiências.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {audiencias.map((a) => (
                      <div key={a.id} className="rounded-md border border-border p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium">{fmtDate(a.hearing_date)}</p>
                          <Badge variant="outline" className="text-[10px]">{a.status}</Badge>
                        </div>
                        <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                          <p>Hora: {a.hearing_time}</p>
                          <p>Tribunal: {a.court_name}</p>
                          <p>Cidade: {a.city}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {tab === "documentos" && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Documentos</h3>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                    <Plus className="h-3.5 w-3.5" /> Anexar
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          uploadDoc.mutate({ file, etapaId: null, categoria: "Outro" });
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>
                </div>
                <div className="space-y-2">
                  {documentos.length === 0 && <p className="text-xs text-muted-foreground">Sem documentos.</p>}
                  {documentos.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-md border border-border p-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs font-medium">{doc.nome_ficheiro}</p>
                          <p className="text-[10px] text-muted-foreground">{doc.categoria || "Outro"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                          <a href={doc.arquivo_url} target="_blank" rel="noreferrer">
                            <Eye className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                          <a href={doc.arquivo_url} download>
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {tab === "contratos" && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3">Contratos</h3>
                {contratos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem contratos associados.</p>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead className="w-32">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contratos.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="text-xs font-medium cursor-pointer hover:underline" onClick={() => openContractEditor(c)}>
                              {c.nome || c.template_nome || "—"}
                            </TableCell>
                            <TableCell className="text-xs">{fmtDate(c.created_at)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewing(c)} title="Visualizar">
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openContractEditor(c)} title="Abrir">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setContractToDelete(c.id)} title="Eliminar">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <AlertDialog open={!!contractToDelete} onOpenChange={(o) => !o && setContractToDelete(null)}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir este contrato? Esta ação não poderá ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setContractToDelete(null)}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteContract} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {deleteContract.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </Card>
            )}

            {/* Contract Editor Panel */}
            {editingContract && (
              <ContractEditorPanel
                initial={{
                  id: editingContract.id,
                  nome: editingContract.nome || editingContract.template_nome || "Contrato",
                  status: editingContract.status || "draft",
                  tipo: editingContract.tipo,
                  html: htmlToChips(editingContract.html_final || ""),
                  templateId: editingContract.template_id,
                  templateNome: editingContract.template_nome,
                  clienteId: editingContract.cliente_id,
                  clienteNome: editingContract.cliente_nome,
                  clienteData: editingContract.cliente_data,
                  processoId: editingContract.processo_id,
                }}
                onClose={() => setEditingContract(null)}
              />
            )}

            {tab === "financeiro" && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Financeiro</h3>
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={loadFinanceiro} disabled={loadingFinanceiro}>
                    {loadingFinanceiro && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Atualizar
                  </Button>
                </div>
                {financeiro.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem transações financeiras.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {financeiro.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="text-xs">{f.description}</TableCell>
                          <TableCell className="text-xs">{fmtCurrency(f.amount)}</TableCell>
                          <TableCell className="text-xs">{fmtDate(f.due_date || f.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            )}

            {tab === "anotacoes" && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Anotações</h3>
                </div>
                <div className="mb-3 flex flex-col gap-2 lg:flex-row">
                  <Input
                    className="h-9 text-xs"
                    placeholder="Título"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                  />
                  <Select value={noteType} onValueChange={(v) => setNoteType(v as any)}>
                    <SelectTrigger className="h-9 w-40 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nota">Nota</SelectItem>
                      <SelectItem value="alerta">Alerta</SelectItem>
                      <SelectItem value="lembrete">Lembrete</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-9" onClick={handleCreateNota} disabled={createNota.isPending}>
                    {createNota.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar
                  </Button>
                </div>
                <Textarea
                  className="min-h-[80px] text-xs mb-3"
                  placeholder="Conteúdo da anotação..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                />
                <div className="space-y-2">
                  {notas.length === 0 && <p className="text-xs text-muted-foreground">Sem anotações.</p>}
                  {notas.map((n) => (
                    <div key={n.id} className="rounded-md border border-border p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{n.titulo}</p>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateNota.mutate({ id: n.id, titulo: n.titulo, conteudo: n.conteudo, tipo: n.tipo })}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteNota.mutate(n.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{n.conteudo}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">{fmtDate(n.created_at)}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Dialog open={openNewEtapa} onOpenChange={setOpenNewEtapa}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Etapa</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="new-etapa-title">Título</Label>
              <Input id="new-etapa-title" value={newEtapaTitulo} onChange={(e) => setNewEtapaTitulo(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-etapa-desc">Descrição</Label>
              <Textarea id="new-etapa-desc" value={newEtapaDescricao} onChange={(e) => setNewEtapaDescricao(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-etapa-prazo">Prazo</Label>
              <DateInput
                id="new-etapa-prazo"
                value={newEtapaPrazo}
                onChange={(v) => setNewEtapaPrazo(v)}
                placeholder="DD/MM/AAAA"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-etapa-status">Status</Label>
              <Select value={newEtapaStatus} onValueChange={(v) => setNewEtapaStatus(v as any)}>
                <SelectTrigger id="new-etapa-status" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Suspensa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-etapa-responsavel">Profissional Responsável</Label>
              <Select value={newEtapaResponsavel} onValueChange={setNewEtapaResponsavel}>
                <SelectTrigger id="new-etapa-responsavel" className="h-9 text-xs">
                  <SelectValue placeholder="Selecionar profissional" />
                </SelectTrigger>
                <SelectContent>
                  {lawyers.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-etapa-tarefas">Tarefas</Label>
              <Textarea id="new-etapa-tarefas" value={newEtapaTarefas} onChange={(e) => setNewEtapaTarefas(e.target.value)} placeholder="Descreva as tarefas desta etapa..." className="min-h-[80px]" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-etapa-file">Anexar Documento</Label>
              <Input id="new-etapa-file" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(e) => setNewEtapaFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setOpenNewEtapa(false);
              setNewEtapaTitulo("");
              setNewEtapaDescricao("");
              setNewEtapaPrazo(null);
              setNewEtapaStatus("pendente");
              setNewEtapaFile(null);
              setNewEtapaTarefas("");
              setNewEtapaResponsavel("");
            }}>Cancelar</Button>
            <Button onClick={async () => {
              if (!newEtapaTitulo.trim()) return;
              await createEtapa.mutateAsync({
                titulo: newEtapaTitulo,
                descricao: newEtapaDescricao || null,
                data_prevista: newEtapaPrazo || null,
                status: newEtapaStatus,
                processo_id: id,
                responsavel_id: newEtapaResponsavel || null,
                tarefas: newEtapaTarefas || null,
              });
              if (newEtapaFile) {
                uploadDoc.mutate({ file: newEtapaFile, etapaId: null, categoria: "Outro" });
              }
              setOpenNewEtapa(false);
              setNewEtapaTitulo("");
              setNewEtapaDescricao("");
              setNewEtapaPrazo(null);
              setNewEtapaStatus("pendente");
              setNewEtapaFile(null);
              setNewEtapaTarefas("");
              setNewEtapaResponsavel("");
            }} disabled={createEtapa.isPending} className="bg-amber-500 text-white hover:bg-amber-600">
              {createEtapa.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmConclude} onOpenChange={setConfirmConclude}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("process.detail.actions.conclude", { defaultValue: "Concluir processo" })}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("process.detail.conclude.confirm", { defaultValue: "Tem certeza que deseja concluir este processo? Esta ação irá alterar o estado para Concluído e registar a data de conclusão." })}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmConclude(false)}>
              {t("cancel", { defaultValue: "Cancelar" })}
            </Button>
            <Button onClick={handleConcludeProcess} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("process.detail.actions.conclude", { defaultValue: "Concluir" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openAddCollab} onOpenChange={setOpenAddCollab}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Convidar Colaborador</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Pesquisar profissional..."
              value={collabSearch}
              onChange={(e) => setCollabSearch(e.target.value)}
              className="h-9 text-xs"
            />
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border p-1">
              {lawyers
                .filter((l) => {
                  if (l.id === profile?.id) return false;
                  if (existingCollabs.includes(l.id)) return false;
                  if (!collabSearch.trim()) return true;
                  const q = collabSearch.toLowerCase();
                  return l.name.toLowerCase().includes(q) || (l.professional_role || l.role || "").toLowerCase().includes(q);
                })
                .map((l) => {
                  const initials = (l.name || "??")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const roleLabel = l.professional_role || l.role || "Profissional";
                  const isSelected = selectedCollabs.includes(l.id);
                  return (
                    <label
                      key={l.id}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors",
                        isSelected ? "bg-primary/5" : "hover:bg-muted/50",
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          setSelectedCollabs((prev) =>
                            checked
                                      ? [...prev, l.id]
                                      : prev.filter((id) => id !== l.id),
                          );
                        }}
                      />
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{l.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{roleLabel}</p>
                      </div>
                    </label>
                  );
                })}
              {lawyers.filter((l) => {
                if (l.id === profile?.id) return false;
                if (existingCollabs.includes(l.id)) return false;
                if (!collabSearch.trim()) return true;
                const q = collabSearch.toLowerCase();
                return l.name.toLowerCase().includes(q) || (l.professional_role || l.role || "").toLowerCase().includes(q);
              }).length === 0 && (
                <p className="px-2 py-3 text-xs text-muted-foreground text-center">Nenhum profissional encontrado.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenAddCollab(false); setSelectedCollabs([]); setCollabSearch(""); }}>
              Cancelar
            </Button>
            <Button onClick={handleAddCollaborators} disabled={!selectedCollabs.length || createInvites.isPending}>
              {createInvites.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Convidar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openEtapaDetail} onOpenChange={setOpenEtapaDetail}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedEtapa?.titulo}</DialogTitle>
          </DialogHeader>
          {selectedEtapa && (
            <div className="grid gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Descrição</p>
                <p className="text-sm">{selectedEtapa.descricao || "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Prazo</p>
                  <p className="text-sm">{selectedEtapa.data_prevista ? fmtDate(selectedEtapa.data_prevista) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Responsável</p>
                  <p className="text-sm">{resolveLawyerName(selectedEtapa.responsavel_id)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Documentos</p>
                {documentos.filter((d) => d.etapa_id === selectedEtapa.id).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem documentos.</p>
                ) : (
                  <div className="space-y-1">
                    {documentos.filter((d) => d.etapa_id === selectedEtapa.id).map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between rounded-md border border-border px-2 py-1">
                        <span className="text-[11px] truncate">{doc.nome_ficheiro}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                          <a href={doc.arquivo_url} target="_blank" rel="noreferrer">
                            <Eye className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Tarefas</p>
                {(selectedEtapa.tarefas || "").trim() === "" ? (
                  <p className="text-xs text-muted-foreground">Sem tarefas registadas.</p>
                ) : (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{selectedEtapa.tarefas}</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setOpenEtapaDetail(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("process.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("process.confirmDelete")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDelete(false)}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
