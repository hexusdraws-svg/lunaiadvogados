import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { handleSupabaseError } from "@/lib/supabase-error-handler";
import type { Database } from "@/integrations/supabase/types";
import type { Processo } from "@/lib/processos";
export type { Processo };
import { useAdminDashboard } from "@/hooks/use-admin-dashboard";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type { ProfileRow };
type ClienteRow = Database["public"]["Tables"]["clientes"]["Row"];
export type { ClienteRow };
type HearingRow = Database["public"]["Tables"]["hearings"]["Row"];
export type { HearingRow };
type ContractRow = Database["public"]["Tables"]["contracts"]["Row"];
type EtapaRow = Database["public"]["Tables"]["processo_etapas"]["Row"];
type HistoricoRow = Database["public"]["Tables"]["processo_historico"]["Row"];
type TemplateRow = Database["public"]["Tables"]["contract_templates"]["Row"];
type ProfissionalRow = Database["public"]["Tables"]["profissionais"]["Row"];
type InvitationRow = Database["public"]["Tables"]["process_collaboration_invites"]["Row"];
type FinancialRow = Database["public"]["Tables"]["financial_transactions"]["Row"];

export interface KpiStats {
  totalClientes: number;
  clientesHoje: number;
  totalProcessos: number;
  processosAtivos: number;
  processosConcluidos: number;
  processosArquivados: number;
  audienciasSemana: number;
  audienciasHoje: number;
  audiencias24h: number;
  audiencias7dias: number;
  contratosCriados: number;
  modelosContrato: number;
  profissionaisAtivos: number;
  convitesPendentes: number;
  receitaTotal: number;
  receitaMensal: number;
  saldoAtual: number;
  despesaTotal: number;
  receitaRecebidaMes: number;
  receitaHoje: number;
}

export interface ProfessionalMonitor {
  id: string;
  nome: string;
  email: string;
  avatar_url: string | null;
  cargo: string | null;
  ultimoAcesso: string | null;
  status: "online" | "offline";
  clientesCadastrados: number;
  processosCriados: number;
  processosConcluidos: number;
  audienciasCriadas: number;
  contratosEmitidos: number;
  ultimaAtividade: string | null;
  produtividade: number;
  desempenhoSemanal: number;
  ranking: number;
}

export interface ProcessBucket {
  key: string;
  label: string;
  items: Processo[];
}

export interface IdleProcess {
  processo: Processo;
  diasParado: number;
  responsavelNome: string | null;
}

export interface HearingMonitorItem {
  hearing: HearingRow;
  processoNumero: string | null;
  clienteNome: string | null;
  responsavelNome: string | null;
  diasRestantes: number;
}

export interface HearingBucket {
  key: string;
  label: string;
  items: HearingMonitorItem[];
}

export interface FeedItem {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  createdAt: string;
  target: { to: string; id?: string } | null;
}

export interface TypeDistribution {
  tipo: string;
  quantidade: number;
}

export interface StageStats {
  total: number;
  concluidas: number;
  andamento: number;
  atrasadas: number;
}

export interface AlertItem {
  key: string;
  label: string;
  processo: Processo;
  detail: string;
}

export interface ContractStats {
  hoje: number;
  semana: number;
  mes: number;
  pendentes: number;
  arquivados: number;
  recentes: ContractRow[];
}

export interface MonthPoint {
  month: string;
  label: string;
  valor: number;
  extra?: number;
}

export interface LawyerTrackingRow {
  id: string;
  nome: string;
  avatar_url: string | null;
  cargo: string | null;
  responsavel: number;
  colaboradores: number;
  etapasConcluidas: number;
  etapasFaltam: number;
  audienciaMarcada: boolean;
  contratoAssociado: boolean;
}

export interface SearchResult {
  id: string;
  type: "client" | "process" | "lawyer" | "contract" | "hearing";
  label: string;
  sublabel: string | null;
  to: string;
}

export interface ExecutiveDashboardData {
  kpis: KpiStats;
  professionals: ProfessionalMonitor[];
  processBuckets: ProcessBucket[];
  idleProcesses: IdleProcess[];
  hearingBuckets: HearingBucket[];
  feed: FeedItem[];
  typeDistribution: TypeDistribution[];
  stageStats: StageStats;
  alerts: AlertItem[];
  contractStats: ContractStats;
  charts: {
    processosPorMes: MonthPoint[];
    clientesPorMes: MonthPoint[];
    audienciasPorMes: MonthPoint[];
    contratosPorMes: MonthPoint[];
    receitasPorMes: MonthPoint[];
  };
  lawyerTracking: LawyerTrackingRow[];
  searchIndex: SearchResult[];
  processos: Processo[];
  hearings: HearingRow[];
  hearingsFuturas: HearingRow[];
  clientes: ClienteRow[];
  profiles: ProfileRow[];
  isLoading: boolean;
  refetchAll: () => void;
}

const IDLE_DAYS = 7;

function daysBetween(a: string, b = new Date()): number {
  const da = new Date(a).getTime();
  if (Number.isNaN(da)) return 0;
  return Math.floor((b.getTime() - da) / (1000 * 60 * 60 * 24));
}

function hearingDateTime(h: HearingRow): number {
  const [y, m, d] = h.hearing_date.split("-").map(Number);
  const [hh, mm] = (h.hearing_time || "00:00").split(":").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0).getTime();
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString("pt-PT", { month: "short", year: "2-digit" });
}

function lastMonths(count: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function useCompanyQuery<T>(
  queryKey: unknown[],
  label: string,
  companyId: string | null,
  queryFn: (cid: string) => Promise<T>,
): T[] {
  const q = useQuery({
    queryKey,
    enabled: !!companyId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      if (!companyId) return [] as T;
      try {
        return await queryFn(companyId);
      } catch (error) {
        console.error(`[useExecutiveDashboard] ${label} error:`, error);
        handleSupabaseError(error, { operation: "SELECT", table: label });
        return [] as T;
      }
    },
  });
  return (q.data ?? []) as T[];
}

export function useExecutiveDashboard() {
  const { profile, isSuperAdmin } = useAuth();
  const companyId = isSuperAdmin ? null : (profile?.company_id ?? null);
  const base = useAdminDashboard();

  const contracts = useCompanyQuery<ContractRow>(
    ["exec-contracts", companyId],
    "contracts",
    companyId,
    async (cid) =>
      (
        await supabase
          .from("contracts")
          .select("*")
          .eq("company_id", cid)
          .order("created_at", { ascending: false })
      ).data ?? [],
  );

  const templates = useCompanyQuery<TemplateRow>(
    ["exec-templates", companyId],
    "contract_templates",
    companyId,
    async (cid) =>
      (
        await supabase
          .from("contract_templates")
          .select("*")
          .eq("company_id", cid)
      ).data ?? [],
  );

  const etapas = useCompanyQuery<EtapaRow>(
    ["exec-etapas", companyId],
    "processo_etapas",
    companyId,
    async (cid) =>
      (
        await supabase
          .from("processo_etapas")
          .select("*")
          .eq("company_id", cid)
      ).data ?? [],
  );

  const profissionais = useCompanyQuery<ProfissionalRow>(
    ["exec-profissionais", companyId],
    "profissionais",
    companyId,
    async (cid) =>
      (
        await supabase
          .from("profissionais")
          .select("*")
          .eq("company_id", cid)
      ).data ?? [],
  );

  const financial = useCompanyQuery<FinancialRow>(
    ["exec-financial", companyId],
    "financial_transactions",
    companyId,
    async (cid) =>
      (
        await supabase
          .from("financial_transactions")
          .select("*")
          .eq("company_id", cid)
      ).data ?? [],
  );

  const invitations = useCompanyQuery<InvitationRow>(
    ["exec-invitations", companyId],
    "process_collaboration_invites",
    companyId,
    async (cid) =>
      (
        await supabase
          .from("process_collaboration_invites")
          .select("*")
          .eq("company_id", cid)
          .order("created_at", { ascending: false })
          .limit(50)
      ).data ?? [],
  );

  // Auto-refresh (polling) so the activity feed and indicators update live
  // without relying on Supabase Realtime (which is not enabled in this project).
  const qc = useQueryClient();
  useEffect(() => {
    if (!companyId) return;
    const id = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["exec-invitations", companyId] });
      qc.invalidateQueries({ queryKey: ["exec-financial", companyId] });
      qc.invalidateQueries({ queryKey: ["exec-etapas", companyId] });
      qc.invalidateQueries({ queryKey: ["exec-contracts", companyId] });
      qc.invalidateQueries({ queryKey: ["admin-historico", companyId] });
      qc.invalidateQueries({ queryKey: ["admin-processos", companyId] });
      qc.invalidateQueries({ queryKey: ["admin-hearings", companyId] });
      qc.invalidateQueries({ queryKey: ["admin-clientes", companyId] });
      qc.invalidateQueries({ queryKey: ["admin-profiles", companyId] });
    }, 30_000);
    return () => clearInterval(id);
  }, [companyId, qc]);

  const data = {
    processos: base.data.processos,
    profiles: base.data.profiles,
    clientes: base.data.clientes,
    hearings: base.data.hearings,
    invitations: base.data.invitations,
    historico: base.data.historico,
    documentos: base.data.documentos,
    collaborators: base.data.collaborators,
    contracts,
    templates,
    etapas,
    profissionais,
    financial,
  };

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const inDays = (n: number) => {
    const d = new Date(today0);
    d.setDate(d.getDate() + n);
    return d;
  };
  const weekEndStr = inDays(7).toISOString().slice(0, 10);
  const tomorrowEndStr = inDays(1).toISOString().slice(0, 10);
  const monthEndStr = inDays(30).toISOString().slice(0, 10);
  const nowPlus24h = now.getTime() + 24 * 60 * 60 * 1000;
  const monthKeyNow = todayStr.slice(0, 7);

  const {
    processos,
    profiles,
    clientes,
    hearings,
    historico,
    contracts: contratosData,
    templates: templatesData,
    etapas: etapasData,
    financial: financialData,
    invitations: invitationsData,
  } = data;

  const profileMap = new Map(profiles.map((p) => [p.id, p.full_name ?? p.email]));
  const clientMap = new Map(clientes.map((c) => [c.id, c.nome]));
  const processoMap = new Map(processos.map((p) => [p.id, p]));

  // ---------- KPIs (Area 1) ----------
  const incomePaid = financialData.filter(
    (f) => f.transaction_type === "income" && f.status === "paid",
  );
  const expensePaid = financialData.filter(
    (f) => f.transaction_type === "expense" && f.status === "paid",
  );
  const receitaTotal = incomePaid.reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const despesaTotal = expensePaid.reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const receitaRecebidaMes = incomePaid
    .filter((f) => (f.payment_date || f.updated_at || "").slice(0, 7) === monthKeyNow)
    .reduce((s, f) => s + (Number(f.amount) || 0), 0);

  const receitaHoje = incomePaid
    .filter((f) => (f.payment_date || f.updated_at || "").slice(0, 10) === todayStr)
    .reduce((s, f) => s + (Number(f.amount) || 0), 0);

  const clientesHoje = clientes.filter(
    (c) => (c.created_at || "").slice(0, 10) === todayStr,
  ).length;

  const kpis: KpiStats = {
    totalClientes: clientes.length,
    clientesHoje,
    totalProcessos: processos.length,
    processosAtivos: processos.filter((p) => p.status === "em_andamento").length,
    processosConcluidos: processos.filter((p) => p.status === "concluido").length,
    processosArquivados: processos.filter((p) => p.status === "arquivado").length,
    audienciasSemana: hearings.filter(
      (h) => h.hearing_date >= todayStr && h.hearing_date <= weekEndStr,
    ).length,
    audienciasHoje: hearings.filter((h) => h.hearing_date === todayStr).length,
    audiencias24h: hearings.filter(
      (h) => hearingDateTime(h) > now.getTime() && hearingDateTime(h) <= nowPlus24h,
    ).length,
    audiencias7dias: hearings.filter(
      (h) => h.hearing_date >= todayStr && h.hearing_date <= weekEndStr,
    ).length,
    contratosCriados: contratosData.length,
    modelosContrato: templatesData.length,
    profissionaisAtivos: profiles.filter((p) => p.status === "active").length,
    convitesPendentes: invitations.filter((i) => i.status === "pending").length,
    receitaTotal,
    receitaMensal: receitaRecebidaMes,
    saldoAtual: receitaTotal - despesaTotal,
    despesaTotal,
    receitaRecebidaMes,
    receitaHoje,
  };

  // ---------- Professionals (Area 2 + 14) ----------
   const lawyerProfiles = profiles.filter(
    (p) =>
      p.professional_role === "lawyer" ||
      p.role === "admin",
   );

  const professionalRaw = lawyerProfiles.map((p) => {
    const meusProcessos = processos.filter((pr) => pr.responsavel_id === p.id);
    const meusClientes = clientes.filter((c) => c.created_by === p.id).length;
    const minhasAudiencias = hearings.filter((a) => a.responsible_professional_id === p.id).length;
    const meusContratos = contratosData.filter((c) => {
      const proc = c.processo_id ? processoMap.get(c.processo_id) : undefined;
      return proc?.responsavel_id === p.id;
    }).length;
    const concluidos = meusProcessos.filter((pr) => pr.status === "concluido").length;
    const atividades = historico.filter((h) => {
      const proc = processoMap.get(h.processo_id ?? "");
      return proc?.responsavel_id === p.id;
    });
    const ultimaAtividade = atividades
      .concat(
        invitationsData
          .filter((n) => n.created_by === p.id)
          .map((n) => ({ created_at: n.created_at }) as HistoricoRow),
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.created_at ?? null;

    const semanaInicio = inDays(-7).toISOString().slice(0, 10);
    const desempenhoSemanal =
      meusProcessos.filter((pr) => pr.created_at >= semanaInicio).length +
      atividades.filter((h) => h.created_at >= semanaInicio).length;

    const produtividade = Math.min(
      100,
      Math.round((concluidos / Math.max(meusProcessos.length, 1)) * 100),
    );

    const isOnline =
      !!p.updated_at && new Date(p.updated_at).getTime() > Date.now() - 30 * 60 * 1000;

    return {
      id: p.id,
      nome: p.full_name ?? p.email,
      email: p.email,
      avatar_url: p.avatar_url,
      cargo: p.professional_role ?? p.role,
      ultimoAcesso: p.updated_at,
      status: isOnline ? ("online" as const) : ("offline" as const),
      clientesCadastrados: meusClientes,
      processosCriados: meusProcessos.length,
      processosConcluidos: concluidos,
      audienciasCriadas: minhasAudiencias,
      contratosEmitidos: meusContratos,
      ultimaAtividade,
      produtividade,
      desempenhoSemanal,
    };
  });

  const professionals: ProfessionalMonitor[] = professionalRaw
    .slice()
    .sort((a, b) => b.produtividade - a.produtividade)
    .map((p, i) => ({ ...p, ranking: i + 1 }));

  // ---------- Process buckets (Area 3) ----------
  const idleProcesses: IdleProcess[] = processos
    .map((p) => ({
      processo: p,
      diasParado: daysBetween(p.updated_at),
      responsavelNome: p.responsavel_id ? profileMap.get(p.responsavel_id) ?? null : null,
    }))
    .filter((x) => x.diasParado >= IDLE_DAYS)
    .sort((a, b) => b.diasParado - a.diasParado);

  const hearingByProcess = new Map<string, HearingRow[]>();
  hearings.forEach((h) => {
    const arr = hearingByProcess.get(h.case_id) ?? [];
    arr.push(h);
    hearingByProcess.set(h.case_id, arr);
  });

  const processBuckets: ProcessBucket[] = [
    {
      key: "hoje",
      label: "criadosHoje",
      items: processos.filter((p) => p.created_at.slice(0, 10) === todayStr),
    },
    {
      key: "semana",
      label: "criadosSemana",
      items: processos.filter((p) => {
        const c = p.created_at.slice(0, 10);
        return c >= inDays(-7).toISOString().slice(0, 10) && c <= todayStr;
      }),
    },
    {
      key: "mes",
      label: "criadosMes",
      items: processos.filter((p) => p.created_at.slice(0, 7) === monthKeyNow),
    },
    {
      key: "semMovimentacao",
      label: "semMovimentacao",
      items: idleProcesses.filter((x) => x.diasParado < 30).map((x) => x.processo),
    },
    {
      key: "parados7d",
      label: "parados7d",
      items: idleProcesses.filter((x) => x.diasParado < 30).map((x) => x.processo),
    },
    {
      key: "parados30d",
      label: "parados30d",
      items: idleProcesses.filter((x) => x.diasParado >= 30).map((x) => x.processo),
    },
    {
      key: "urgentes",
      label: "urgentes",
      items: processos.filter(
        (p) => p.prioridade === "urgente" && p.status !== "concluido" && p.status !== "arquivado",
      ),
    },
    {
      key: "proximosAudiencia",
      label: "proximosAudiencia",
      items: processos.filter((p) => {
        const hs = hearingByProcess.get(p.id) ?? [];
        return hs.some((h) => h.hearing_date >= todayStr && h.hearing_date <= weekEndStr);
      }),
    },
    {
      key: "proximosPrazo",
      label: "proximosPrazo",
      items: processos.filter(
        (p) =>
          p.deadline_date &&
          p.deadline_date >= todayStr &&
          p.deadline_date <= weekEndStr &&
          p.status !== "concluido" &&
          p.status !== "arquivado",
      ),
    },
  ];

  // ---------- Hearing buckets (Area 5) ----------
  const toHearingItem = (h: HearingRow): HearingMonitorItem => {
    const proc = processoMap.get(h.case_id);
    return {
      hearing: h,
      processoNumero: proc?.numero ?? null,
      clienteNome: proc?.cliente_nome ?? null,
      responsavelNome: h.responsible_professional_id
        ? profileMap.get(h.responsible_professional_id) ?? null
        : null,
      diasRestantes: Math.ceil((new Date(h.hearing_date).getTime() - today0) / (1000 * 60 * 60 * 24)),
    };
  };

  const hearingBuckets: HearingBucket[] = [
    {
      key: "hoje",
      label: "hoje",
      items: hearings
        .filter((h) => h.hearing_date === todayStr)
        .map(toHearingItem)
        .sort((a, b) => a.hearing.hearing_time.localeCompare(b.hearing.hearing_time)),
    },
    {
      key: "amanha",
      label: "amanha",
      items: hearings
        .filter((h) => h.hearing_date > todayStr && h.hearing_date <= tomorrowEndStr)
        .map(toHearingItem),
    },
    {
      key: "proximos7",
      label: "proximos7",
      items: hearings
        .filter((h) => h.hearing_date > tomorrowEndStr && h.hearing_date <= weekEndStr)
        .map(toHearingItem),
    },
    {
      key: "proximos30",
      label: "proximos30",
      items: hearings
        .filter((h) => h.hearing_date > weekEndStr && h.hearing_date <= monthEndStr)
        .map(toHearingItem),
    },
  ];

  // ---------- Activity feed (Area 6) ----------
  const feedFromNotifs: FeedItem[] = invitationsData.map((n) => ({
    id: `n-${n.id}`,
    kind: n.role === "admin" ? "admin" : "professional",
    title: `Convite: ${n.email}`,
    description: `Estado: ${n.status}`,
    createdAt: n.created_at,
    target:
      n.role === "admin"
        ? { to: "/cadastros/profissionais" }
        : { to: "/cadastros/profissionais" },
  }));
  const feedFromHistorico: FeedItem[] = historico
    .slice(0, 40)
    .map((h) => ({
      id: `h-${h.id}`,
      kind: h.tipo,
      title: h.descricao,
      description: processoMap.get(h.processo_id ?? "")?.numero ?? null,
      createdAt: h.created_at,
      target: h.processo_id ? { to: "/processos/$id", id: h.processo_id } : null,
    }));
  const feed: FeedItem[] = [...feedFromNotifs, ...feedFromHistorico]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 30);

  // ---------- Process map (Area 7) ----------
  const typeDistribution: TypeDistribution[] = (() => {
    const counts = new Map<string, number>();
    processos.forEach((p) => {
      const t = p.tipo || "Outro";
      counts.set(t, (counts.get(t) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([tipo, quantidade]) => ({ tipo, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);
  })();

  // ---------- Stages (Area 9) ----------
  const stageStats: StageStats = {
    total: etapasData.length,
    concluidas: etapasData.filter((e) => e.status === "concluido").length,
    andamento: etapasData.filter((e) => e.status !== "concluido").length,
    atrasadas: etapasData.filter(
      (e) => e.status !== "concluido" && e.data_prevista && e.data_prevista < todayStr,
    ).length,
  };
  const etapasByProcess = new Map<string, EtapaRow[]>();
  etapasData.forEach((e) => {
    const arr = etapasByProcess.get(e.processo_id) ?? [];
    arr.push(e);
    etapasByProcess.set(e.processo_id, arr);
  });

  // ---------- Alerts (Area 8) ----------
  const alertItems: AlertItem[] = [];
  processos.forEach((p) => {
    if (
      p.deadline_date &&
      p.deadline_date < todayStr &&
      p.status !== "concluido" &&
      p.status !== "arquivado"
    ) {
      alertItems.push({
        key: `atrasado-${p.id}`,
        label: "atrasados",
        processo: p,
        detail: `Prazo ${p.deadline_date}`,
      });
    }
    if (!p.responsavel_id && p.status !== "concluido" && p.status !== "arquivado") {
      alertItems.push({
        key: `semadv-${p.id}`,
        label: "semAdvogado",
        processo: p,
        detail: "Sem advogado responsável",
      });
    }
    if (!p.cliente_id) {
      alertItems.push({
        key: `semcli-${p.id}`,
        label: "semCliente",
        processo: p,
        detail: "Sem cliente associado",
      });
    }
    const procEtapas = etapasByProcess.get(p.id) ?? [];
    if (
      procEtapas.length === 0 &&
      p.status !== "concluido" &&
      p.status !== "arquivado" &&
      p.status !== "cancelado"
    ) {
      alertItems.push({
        key: `semetapa-${p.id}`,
        label: "semEtapa",
        processo: p,
        detail: "Sem etapas criadas",
      });
    }
    const idle = daysBetween(p.updated_at);
    if (idle >= IDLE_DAYS && p.status !== "concluido" && p.status !== "arquivado") {
      alertItems.push({
        key: `semmov-${p.id}`,
        label: "semMovimentacao",
        processo: p,
        detail: `Parado há ${idle} dias`,
      });
    }
  });
  hearings
    .filter((h) => h.hearing_date > todayStr && h.hearing_date <= tomorrowEndStr)
    .forEach((h) => {
      const proc = processoMap.get(h.case_id);
      alertItems.push({
        key: `amanha-${h.id}`,
        label: "amanha",
        processo: proc ?? ({} as Processo),
        detail: `${h.court_name} ${h.hearing_time}`,
      });
    });
  const alerts = alertItems;

  // ---------- Contracts (Area 10) ----------
  const contractStats: ContractStats = {
    hoje: contratosData.filter((c) => (c.created_at || "").slice(0, 10) === todayStr).length,
    semana: contratosData.filter((c) => {
      const d = (c.created_at || "").slice(0, 10);
      return d >= inDays(-7).toISOString().slice(0, 10) && d <= todayStr;
    }).length,
    mes: contratosData.filter((c) => (c.created_at || "").slice(0, 7) === monthKeyNow).length,
    pendentes: contratosData.filter((c) => c.status === "draft" || c.status === "sent").length,
    arquivados: contratosData.filter((c) => c.status === "cancelled").length,
    recentes: contratosData.slice(0, 8),
  };

  // ---------- Charts (Area 11) ----------
  const buildMonthSeries = (
    items: { created_at?: string; payment_date?: string | null; updated_at?: string }[],
    valueOf?: (it: any) => number,
    dateField: "created_at" | "payment_date" = "created_at",
  ): MonthPoint[] => {
    const months = lastMonths(12);
    const map = new Map<string, number>();
    months.forEach((m) => map.set(m, 0));
    items.forEach((it) => {
      const raw = dateField === "payment_date" ? it.payment_date : it.created_at;
      const mk = (raw || "").slice(0, 7);
      if (map.has(mk)) {
        map.set(mk, map.get(mk)! + (valueOf ? valueOf(it) : 1));
      }
    });
    return months.map((m) => ({ month: m, label: monthLabel(m), valor: map.get(m) ?? 0 }));
  };

  const receitasPorMes = (() => {
    const months = lastMonths(12);
    const map = new Map<string, { receita: number; despesa: number }>();
    months.forEach((m) => map.set(m, { receita: 0, despesa: 0 }));
    financialData.forEach((f) => {
      const mk = (f.payment_date || f.updated_at || "").slice(0, 7);
      const entry = map.get(mk);
      if (entry) {
        const v = Number(f.amount) || 0;
        if (f.transaction_type === "income" && f.status === "paid") entry.receita += v;
        if (f.transaction_type === "expense" && f.status === "paid") entry.despesa += v;
      }
    });
    return months.map((m) => {
      const e = map.get(m)!;
      return { month: m, label: monthLabel(m), valor: e.receita, extra: e.despesa };
    });
  })();

  const charts = {
    processosPorMes: buildMonthSeries(processos),
    clientesPorMes: buildMonthSeries(clientes),
    audienciasPorMes: buildMonthSeries(hearings),
    contratosPorMes: buildMonthSeries(contratosData),
    receitasPorMes,
  };

  // ---------- Lawyer tracking (Area 14) ----------
  const lawyerTracking: LawyerTrackingRow[] = lawyerProfiles.map((p) => {
    const meusProcessos = processos.filter((pr) => pr.responsavel_id === p.id);
    const meusProcessoIds = new Set(meusProcessos.map((pr) => pr.id));
    const minhasEtapas = etapasData.filter((e) => meusProcessoIds.has(e.processo_id));
    const audienciaMarcada = hearings.some(
      (h) => h.responsible_professional_id === p.id || meusProcessoIds.has(h.case_id),
    );
    const contratoAssociado = contratosData.some((c) => meusProcessoIds.has(c.processo_id ?? ""));
    const colaboradores = meusProcessos.reduce(
      (s, pr) => s + (pr.colaboradores?.length ?? 0),
      0,
    );
    return {
      id: p.id,
      nome: p.full_name ?? p.email,
      avatar_url: p.avatar_url,
      cargo: p.professional_role ?? p.role,
      responsavel: meusProcessos.length,
      colaboradores,
      etapasConcluidas: minhasEtapas.filter((e) => e.status === "concluido").length,
      etapasFaltam: minhasEtapas.filter((e) => e.status !== "concluido").length,
      audienciaMarcada,
      contratoAssociado,
    };
  });

  // ---------- Global search (Area 12) ----------
  const searchIndex: SearchResult[] = [
    ...clientes.map((c) => ({
      id: c.id,
      type: "client" as const,
      label: c.nome,
      sublabel: c.documento ?? c.email ?? null,
      to: "/cadastros/clientes",
    })),
    ...processos.map((p) => ({
      id: p.id,
      type: "process" as const,
      label: p.numero,
      sublabel: p.cliente_nome ?? p.tipo,
      to: "/processos/$id",
    })),
    ...lawyerProfiles.map((p) => ({
      id: p.id,
      type: "lawyer" as const,
      label: p.full_name ?? p.email,
      sublabel: p.professional_role ?? p.role,
      to: "/cadastros/profissionais",
    })),
    ...contratosData.map((c) => ({
      id: c.id,
      type: "contract" as const,
      label: c.nome ?? c.numero ?? "Contrato",
      sublabel: c.cliente_nome ?? null,
      to: "/contratos",
    })),
    ...hearings.map((h) => ({
      id: h.id,
      type: "hearing" as const,
      label: `${h.court_name} ${h.hearing_date}`,
      sublabel: processoMap.get(h.case_id)?.numero ?? null,
      to: "/audiencias",
    })),
  ];

  const refetchAll = () => {
    qc.invalidateQueries({ queryKey: ["exec-contracts", companyId] });
    qc.invalidateQueries({ queryKey: ["exec-templates", companyId] });
    qc.invalidateQueries({ queryKey: ["exec-etapas", companyId] });
    qc.invalidateQueries({ queryKey: ["exec-profissionais", companyId] });
    qc.invalidateQueries({ queryKey: ["exec-financial", companyId] });
    qc.invalidateQueries({ queryKey: ["exec-invitations", companyId] });
    base.refetchAll();
  };

  return {
    kpis,
    professionals,
    processBuckets,
    idleProcesses,
    hearingBuckets,
    feed,
    typeDistribution,
    stageStats,
    alerts,
    contractStats,
    charts,
    lawyerTracking,
    searchIndex,
    processos: data.processos,
    hearings: data.hearings,
    hearingsFuturas: data.hearings.filter((h) => {
      const d = new Date(h.hearing_date).getTime();
      return !Number.isNaN(d) && d >= new Date().setHours(0, 0, 0, 0);
    }),
    clientes: data.clientes,
    profiles: data.profiles,
    isLoading: base.isLoading,
    refetchAll,
  } as ExecutiveDashboardData;
}
