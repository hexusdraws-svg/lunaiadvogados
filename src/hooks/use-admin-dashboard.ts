import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { handleSupabaseError } from "@/lib/supabase-error-handler";
import type { Database } from "@/integrations/supabase/types";
import type { Processo, Audiencia } from "@/lib/processos";
import type { Tarefa } from "@/lib/processos";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ClienteRow = Database["public"]["Tables"]["clientes"]["Row"];
type HearingRow = Database["public"]["Tables"]["hearings"]["Row"];
type TarefaRow = Database["public"]["Tables"]["tarefas"]["Row"];
type CollaboratorRow = Database["public"]["Tables"]["process_collaboration_invites"]["Row"];
type HistoricoRow = Database["public"]["Tables"]["processo_historico"]["Row"];
type DocumentoRow = Database["public"]["Tables"]["processo_documentos"]["Row"];

export interface AdminDashboardData {
  processos: Processo[];
  profiles: ProfileRow[];
  clientes: ClienteRow[];
  hearings: HearingRow[];
  tarefas: TarefaRow[];
  invitations: CollaboratorRow[];
  historico: HistoricoRow[];
  documentos: DocumentoRow[];
  collaborators: CollaboratorRow[];
}

export interface SummaryStats {
  totalProcessos: number;
  processosAtivos: number;
  processosConcluidos: number;
  processosSuspensos: number;
  audienciasEstaSemana: number;
  audienciasHoje: number;
  prazosProximos7Dias: number;
  totalClientes: number;
  totalAdvogados: number;
  totalColaboradoresAtivos: number;
  convitesPendentes: number;
  processosSemAtualizacao15Dias: number;
}

export interface LawyerStats {
  id: string;
  nome: string;
  email: string;
  avatar_url: string | null;
  profissional_role: string | null;
  totalProcessos: number;
  audienciasSemana: number;
  prazosPendentes: number;
  ultimaAtividade: string | null;
  totalTarefas: number;
  totalClientes: number;
  status: "online" | "offline";
  ultimoAcesso: string | null;
}

export interface TimelineEvent {
  id: string;
  tipo: string;
  descricao: string;
  created_at: string;
  processo_id: string | null;
  processo_numero: string | null;
  cliente_nome: string | null;
  advogado_nome: string | null;
}

export interface AttentionItem {
  processo_id: string;
  processo_numero: string;
  cliente_nome: string | null;
  tipo: string;
  descricao: string;
  dias_sem_atividade: number;
}

const COMMON_QUERY_OPTS = {
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
};

function useSafeQuery<T>(options: {
  queryKey: unknown[];
  queryFn: () => Promise<T | null | undefined>;
  enabled?: boolean;
  label?: string;
}) {
  return useQuery({
    queryKey: options.queryKey,
    queryFn: async () => {
      try {
        const result = await options.queryFn();
        return result ?? ([] as T);
      } catch (error) {
        console.error(`[useAdminDashboard] ${options.label || "query"} error:`, error);
        handleSupabaseError(error, { operation: "SELECT", table: options.label });
        return [] as T;
      }
    },
    enabled: options.enabled,
    ...COMMON_QUERY_OPTS,
  });
}

export function useAdminDashboard() {
  const { profile, isSuperAdmin, isAdmin } = useAuth();
  const companyId = isSuperAdmin ? null : (profile?.company_id ?? null);

  const processosQ = useSafeQuery<Processo[]>({
    queryKey: ["admin-processos", companyId],
    label: "processos",
    queryFn: async () => {
      if (!companyId) return [] as Processo[];
      const { data, error } = await supabase
        .from("processos")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Processo[];
    },
    enabled: !!companyId,
  });

  const profilesQ = useSafeQuery<ProfileRow[]>({
    queryKey: ["admin-profiles", companyId],
    label: "profiles",
    queryFn: async () => {
      if (!companyId) return [] as ProfileRow[];
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("company_id", companyId)
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
    enabled: !!companyId,
  });

  const clientesQ = useSafeQuery<ClienteRow[]>({
    queryKey: ["admin-clientes", companyId],
    label: "clientes",
    queryFn: async () => {
      if (!companyId) return [] as ClienteRow[];
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("company_id", companyId)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as ClienteRow[];
    },
    enabled: !!companyId,
  });

  const hearingsQ = useSafeQuery<HearingRow[]>({
    queryKey: ["admin-hearings", companyId],
    label: "hearings",
    queryFn: async () => {
      if (!companyId) return [] as HearingRow[];
      const { data, error } = await supabase
        .from("hearings")
        .select("*")
        .eq("company_id", companyId)
        .order("hearing_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as HearingRow[];
    },
    enabled: !!companyId,
  });

  const tarefasQ = useSafeQuery<TarefaRow[]>({
    queryKey: ["admin-tarefas", companyId],
    label: "tarefas",
    queryFn: async () => {
      if (!companyId) return [] as TarefaRow[];
      const { data, error } = await supabase
        .from("tarefas")
        .select("*")
        .eq("company_id", companyId)
        .order("reminder_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TarefaRow[];
    },
    enabled: !!companyId,
  });

  const invitationsQ = useSafeQuery<CollaboratorRow[]>({
    queryKey: ["admin-invitations", companyId],
    label: "invitations",
    queryFn: async () => {
      if (!companyId) return [] as CollaboratorRow[];
      const { data, error } = await supabase
        .from("process_collaboration_invites")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CollaboratorRow[];
    },
    enabled: !!companyId,
  });

  const historicoQ = useSafeQuery<HistoricoRow[]>({
    queryKey: ["admin-historico", companyId],
    label: "historico",
    queryFn: async () => {
      if (!companyId) return [] as HistoricoRow[];
      const { data, error } = await supabase
        .from("processo_historico")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as HistoricoRow[];
    },
    enabled: !!companyId,
  });

  const documentosQ = useSafeQuery<DocumentoRow[]>({
    queryKey: ["admin-documentos", companyId],
    label: "documentos",
    queryFn: async () => {
      if (!companyId) return [] as DocumentoRow[];
      const { data, error } = await supabase
        .from("processo_documentos")
        .select("*")
        .eq("company_id", companyId);
      if (error) throw error;
      return (data ?? []) as DocumentoRow[];
    },
    enabled: !!companyId,
  });

  const collaboratorsQ = useSafeQuery<CollaboratorRow[]>({
    queryKey: ["admin-collaborators", companyId],
    label: "collaborators",
    queryFn: async () => {
      if (!companyId) return [] as CollaboratorRow[];
      const { data, error } = await supabase
        .from("process_collaboration_invites")
        .select("*")
        .eq("company_id", companyId)
        .eq("status", "accepted");
      if (error) throw error;
      return (data ?? []) as CollaboratorRow[];
    },
    enabled: !!companyId,
  });

  const data: AdminDashboardData = {
    processos: processosQ.data ?? [],
    profiles: profilesQ.data ?? [],
    clientes: clientesQ.data ?? [],
    hearings: hearingsQ.data ?? [],
    tarefas: tarefasQ.data ?? [],
    invitations: invitationsQ.data ?? [],
    historico: historicoQ.data ?? [],
    documentos: documentosQ.data ?? [],
    collaborators: collaboratorsQ.data ?? [],
  };

  const summaryStats: SummaryStats = (() => {
    const today = new Date().toISOString().slice(0, 10);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);

    const processos = data.processos;
    const audiencias = data.hearings;
    const tarefas = data.tarefas;
    const clientes = data.clientes;
    const profiles = data.profiles;
    const invitations = data.invitations;

    const lawyerProfiles = profiles.filter(
      (p) =>
        p.professional_role === "lawyer" || p.role === "admin",
    );
    const activeProfiles = profiles.filter((p) => p.status === "active");

    const audienciasHoje = audiencias.filter((a) => a.hearing_date === today).length;
    const audienciasSemana = audiencias.filter(
      (a) => a.hearing_date >= today && a.hearing_date <= weekEndStr,
    ).length;

    const prazosProximos = tarefas.filter(
      (t) => t.reminder_date >= today && t.reminder_date <= weekEndStr,
    ).length;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 15);
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);
    const processosSemAtualizacao = processos.filter((p) => p.updated_at < cutoffStr).length;

    const processosAtivos = processos.filter((p) => p.status === "em_andamento").length;
    const processosConcluidos = processos.filter((p) => p.status === "concluido").length;
    const processosSuspensos = processos.filter(
      (p) => p.status === "arquivado" || p.status === "cancelado",
    ).length;

    return {
      totalProcessos: processos.length,
      processosAtivos,
      processosConcluidos,
      processosSuspensos,
      audienciasEstaSemana: audienciasSemana,
      audienciasHoje,
      prazosProximos7Dias: prazosProximos,
      totalClientes: clientes.length,
      totalAdvogados: lawyerProfiles.length,
      totalColaboradoresAtivos: activeProfiles.length,
      convitesPendentes: invitations.filter((i) => i.status === "pending").length,
      processosSemAtualizacao15Dias: processosSemAtualizacao,
    };
  })();

  const lawyerStats: LawyerStats[] = (() => {
    const today = new Date().toISOString().slice(0, 10);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);

    const processos = data.processos;
    const audiencias = data.hearings;
    const tarefas = data.tarefas;
    const profiles = data.profiles;
    const historico = data.historico;

    const lawyerProfiles = profiles.filter(
      (p) =>
        p.professional_role === "lawyer" || p.role === "admin",
    );

    return lawyerProfiles.map((p) => {
      const lawyerProcessos = processos.filter((pr) => pr.responsavel_id === p.id);
      const lawyerAudiencias = audiencias.filter(
        (a) =>
          a.responsible_professional_id === p.id &&
          a.hearing_date >= today &&
          a.hearing_date <= weekEndStr,
      ).length;
      const lawyerTarefas = tarefas.filter((t) => {
        const proc = processos.find((pr) => pr.id === t.processo_id);
        return proc?.responsavel_id === p.id;
      }).length;
      const lawyerClientes = new Set(lawyerProcessos.map((pr) => pr.cliente_id).filter(Boolean))
        .size;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 15);
      const cutoffStr = cutoffDate.toISOString().slice(0, 10);
      const lastActivity =
        historico
          .filter((h) => {
            const proc = processos.find((pr) => pr.id === h.processo_id);
            return proc?.responsavel_id === p.id;
          })
          .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.created_at ?? null;

      const isOnline = p.updated_at && new Date(p.updated_at) > new Date(Date.now() - 30 * 60_1000);

      return {
        id: p.id,
        nome: p.full_name ?? p.email,
        email: p.email,
        avatar_url: p.avatar_url,
        profissional_role: p.professional_role,
        totalProcessos: lawyerProcessos.length,
        audienciasSemana: lawyerAudiencias,
        prazosPendentes: lawyerTarefas,
        ultimaAtividade: lastActivity,
        totalTarefas: lawyerTarefas,
        totalClientes: lawyerClientes,
        status: isOnline ? "online" : "offline",
        ultimoAcesso: p.updated_at,
      };
    });
  })();

  const timelineEvents: TimelineEvent[] = (() => {
    const processos = data.processos;
    const historico = data.historico;
    const profiles = data.profiles;

    const profileMap = new Map(profiles.map((p) => [p.id, p.full_name ?? p.email]));

    const eventos = historico.slice(0, 50).map((h) => {
      const proc = processos.find((p) => p.id === h.processo_id);
      return {
        id: h.id,
        tipo: h.tipo,
        descricao: h.descricao,
        created_at: h.created_at,
        processo_id: h.processo_id,
        processo_numero: proc?.numero ?? null,
        cliente_nome: proc?.cliente_nome ?? null,
        advogado_nome: proc?.responsavel_id ? (profileMap.get(proc.responsavel_id) ?? null) : null,
      };
    });

    return eventos;
  })();

  const attentionItems: AttentionItem[] = (() => {
    const processos = data.processos;
    const audiencias = data.hearings;
    const documentos = data.documentos;
    const collaborators = data.collaborators;
    const tarefas = data.tarefas;
    const today = new Date().toISOString().slice(0, 10);

    const isAdminView = isAdmin || isSuperAdmin;
    const myProcessIds = isAdminView
      ? null
      : new Set(
          processos
            .filter((p) => p.responsavel_id === profile?.id)
            .map((p) => p.id)
            .concat(
              collaborators
                .filter((c) => c.invited_professional === profile?.id)
                .map((c) => c.process_id),
            ),
        );

    const items: AttentionItem[] = [];

    processos.forEach((p) => {
      if (!isAdminView && myProcessIds && !myProcessIds.has(p.id)) {
        return;
      }

      const diasSemAtividade = Math.floor(
        (Date.now() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24),
      );
      const procAudiencias = audiencias.filter((a) => a.case_id === p.id);
      const procDocumentos = documentos.filter((d) => d.processo_id === p.id);
      const procColaboradores = collaborators.filter((c) => c.process_id === p.id);
      const procTarefas = tarefas.filter((t) => t.processo_id === p.id);
      const temPrazoVencido = procTarefas.some(
        (t) => t.reminder_date < today && t.status !== "completed",
      );

      if (diasSemAtividade > 15) {
        items.push({
          processo_id: p.id,
          processo_numero: p.numero,
          cliente_nome: p.cliente_nome,
          tipo: "sem_atividade",
          descricao: `Sem movimentação há ${diasSemAtividade} dias`,
          dias_sem_atividade: diasSemAtividade,
        });
      }
      if (temPrazoVencido) {
        items.push({
          processo_id: p.id,
          processo_numero: p.numero,
          cliente_nome: p.cliente_nome,
          tipo: "prazo_vencido",
          descricao: "Possui prazo vencido",
          dias_sem_atividade: diasSemAtividade,
        });
      }
      if (procAudiencias.length === 0 && p.status !== "concluido" && p.status !== "cancelado") {
        items.push({
          processo_id: p.id,
          processo_numero: p.numero,
          cliente_nome: p.cliente_nome,
          tipo: "sem_audiencia",
          descricao: "Sem audiência marcada",
          dias_sem_atividade: diasSemAtividade,
        });
      }
      if (procColaboradores.length === 0 && p.status !== "concluido" && p.status !== "cancelado") {
        items.push({
          processo_id: p.id,
          processo_numero: p.numero,
          cliente_nome: p.cliente_nome,
          tipo: "sem_colaborador",
          descricao: "Sem colaboradores",
          dias_sem_atividade: diasSemAtividade,
        });
      }
      if (procDocumentos.length === 0 && p.status !== "concluido" && p.status !== "cancelado") {
        items.push({
          processo_id: p.id,
          processo_numero: p.numero,
          cliente_nome: p.cliente_nome,
          tipo: "sem_documentos",
          descricao: "Sem documentos",
          dias_sem_atividade: diasSemAtividade,
        });
      }
    });

    return items;
  })();

  const chartData = (() => {
    const processos = data.processos;
    const profiles = data.profiles;
    const clientes = data.clientes;
    const audiencias = data.hearings;

    const processosPorAdvogado = profiles
      .filter(
        (p) =>
          p.professional_role === "lawyer" || p.role === "admin",
      )
      .map((p) => ({
        nome: p.full_name ?? "Sem nome",
        processos: processos.filter((pr) => pr.responsavel_id === p.id).length,
      }))
      .filter((d) => d.processos > 0);

    const processosPorEstado = [
      {
        estado: "Em Andamento",
        quantidade: processos.filter((p) => p.status === "em_andamento").length,
      },
      { estado: "Concluído", quantidade: processos.filter((p) => p.status === "concluido").length },
      { estado: "Arquivado", quantidade: processos.filter((p) => p.status === "arquivado").length },
      { estado: "Cancelado", quantidade: processos.filter((p) => p.status === "cancelado").length },
    ];

    const audienciasPorMes = audiencias.reduce<Record<string, number>>((acc, a) => {
      if (!a.hearing_date) return acc;
      const mes = a.hearing_date.slice(0, 7);
      acc[mes] = (acc[mes] || 0) + 1;
      return acc;
    }, {});

    const clientesPorMes = clientes.reduce<Record<string, number>>((acc, c) => {
      if (!c.created_at) return acc;
      const mes = c.created_at.slice(0, 7);
      acc[mes] = (acc[mes] || 0) + 1;
      return acc;
    }, {});

    const processosConcluidosPorMes = processos
      .filter((p) => p.status === "concluido")
      .reduce<Record<string, number>>((acc, p) => {
        if (!p.updated_at) return acc;
        const mes = p.updated_at.slice(0, 7);
        acc[mes] = (acc[mes] || 0) + 1;
        return acc;
      }, {});

    const processosAtivosPorMes = processos
      .filter((p) => p.status === "em_andamento")
      .reduce<Record<string, number>>((acc, p) => {
        if (!p.created_at) return acc;
        const mes = p.created_at.slice(0, 7);
        acc[mes] = (acc[mes] || 0) + 1;
        return acc;
      }, {});

    return {
      processosPorAdvogado,
      processosPorEstado,
      audienciasPorMes: Object.entries(audienciasPorMes).map(([mes, quantidade]) => ({
        mes,
        quantidade,
      })),
      clientesPorMes: Object.entries(clientesPorMes).map(([mes, quantidade]) => ({
        mes,
        quantidade,
      })),
      processosConcluidosPorMes: Object.entries(processosConcluidosPorMes).map(
        ([mes, quantidade]) => ({ mes, quantidade }),
      ),
      processosAtivosPorMes: Object.entries(processosAtivosPorMes).map(([mes, quantidade]) => ({
        mes,
        quantidade,
      })),
    };
  })();

  const qc = useQueryClient();

  const refetchAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-processos"] });
    qc.invalidateQueries({ queryKey: ["admin-profiles"] });
    qc.invalidateQueries({ queryKey: ["admin-clientes"] });
    qc.invalidateQueries({ queryKey: ["admin-hearings"] });
    qc.invalidateQueries({ queryKey: ["admin-tarefas"] });
    qc.invalidateQueries({ queryKey: ["admin-invitations"] });
    qc.invalidateQueries({ queryKey: ["admin-historico"] });
    qc.invalidateQueries({ queryKey: ["admin-documentos"] });
    qc.invalidateQueries({ queryKey: ["admin-collaborators"] });
  };

  return {
    data,
    summaryStats,
    lawyerStats,
    timelineEvents,
    attentionItems,
    chartData,
    isLoading: !!companyId && (processosQ.isLoading || profilesQ.isLoading || clientesQ.isLoading),
    refetchAll,
  };
}
