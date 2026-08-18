import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { formatCurrency } from "@/lib/currency";

export type Processo = Database["public"]["Tables"]["processos"]["Row"];
export type ProcessoInsert = Database["public"]["Tables"]["processos"]["Insert"];
export type ProcessoUpdate = Database["public"]["Tables"]["processos"]["Update"];
export type Tarefa = Database["public"]["Tables"]["tarefas"]["Row"];
export type TarefaInsert = Database["public"]["Tables"]["tarefas"]["Insert"];
export type TarefaUpdate = Database["public"]["Tables"]["tarefas"]["Update"];
export type TaskStatus = Tarefa["status"];

export type ProcessoEtapa = Database["public"]["Tables"]["processo_etapas"]["Row"];
export type ProcessoEtapaInsert = Database["public"]["Tables"]["processo_etapas"]["Insert"];
export type ProcessoEtapaUpdate = Database["public"]["Tables"]["processo_etapas"]["Update"];

export type ProcessoDocumento = Database["public"]["Tables"]["processo_documentos"]["Row"];
export type ProcessoDocumentoInsert = Database["public"]["Tables"]["processo_documentos"]["Insert"];

export type ProcessoHistorico = Database["public"]["Tables"]["processo_historico"]["Row"];
export type ProcessoHistoricoInsert = Database["public"]["Tables"]["processo_historico"]["Insert"];

export type Audiencia = Database["public"]["Tables"]["hearings"]["Row"];

// Tipos jurídicos completos conforme especificação do módulo Processos.
export const LEGAL_PROCESS_TYPES = [
  "Civil",
  "Criminal",
  "Família",
  "Laboral",
  "Comercial",
  "Fiscal",
  "Administrativo",
  "Constitucional",
  "Executivo",
  "Inventário",
  "Sucessões",
  "Cobrança",
  "Indemnização",
  "Divórcio",
  "Guarda",
  "Violência Doméstica",
  "Contrato",
  "Consumidor",
  "Outro",
] as const;

// Estados do processo (apenas os definidos pela especificação).
export const PROCESS_STATUSES = [
  "novo",
  "em_andamento",
  "suspenso",
  "concluido",
  "arquivado",
] as const;

export const PROCESS_STATUS_LABELS: Record<string, string> = {
  novo: "Novo",
  em_andamento: "Em Andamento",
  aguardando_audiencia: "Aguardando Audiência",
  em_recurso: "Em Recurso",
  suspenso: "Suspenso",
  concluido: "Concluído",
  arquivado: "Arquivado",
  cancelado: "Cancelado",
};

export const PROCESS_STATUS_STYLES: Record<string, string> = {
  novo: "bg-primary/15 text-primary border-primary/30",
  em_andamento: "bg-info/15 text-info border-info/30",
  aguardando_audiencia: "bg-warning/15 text-warning border-warning/30",
  em_recurso: "bg-primary/15 text-primary border-primary/30",
  suspenso: "bg-muted text-muted-foreground border-border",
  concluido: "bg-success/15 text-success border-success/30",
  arquivado: "bg-muted text-muted-foreground border-muted/30",
  cancelado: "bg-destructive/15 text-destructive border-destructive/30",
};

// Prioridades conforme especificação: Baixa, Média, Alta, Urgente.
export const PROCESS_PRIORITIES = ["baixa", "media", "alta", "urgente"] as const;

export const PROCESS_PRIORITY_LABELS: Record<string, string> = {
  baixa: "Baixa",
  normal: "Normal",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

export const PROCESS_PRIORITY_STYLES: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground border-border",
  normal: "bg-info/15 text-info border-info/30",
  media: "bg-info/15 text-info border-info/30",
  alta: "bg-warning/15 text-warning border-warning/30",
  urgente: "bg-destructive/15 text-destructive border-destructive/30",
};

export const TASK_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;

export const ETAPA_STATUSES = ["pendente", "em_andamento", "concluido", "cancelado"] as const;

export const ETAPA_STATUS_LABELS: Record<string, string> = {
  pendente: "Nova",
  em_andamento: "Em andamento",
  concluido: "Concluída",
  cancelado: "Suspensa",
};

export const ETAPA_STATUS_STYLES: Record<string, string> = {
  pendente: "bg-muted text-muted-foreground",
  em_andamento: "bg-info/20 text-info",
  concluido: "bg-success/20 text-success",
  cancelado: "bg-destructive/20 text-destructive",
};

export const TAREFA_STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
};

export function buildNextProcessoNumero(fallback: string): string {
  const y = new Date().getFullYear();
  return `PROC-${y}-${fallback}`;
}

export async function fetchProcessoWithClientPhone(
  processoId: string,
): Promise<{ clientPhone: string | null }> {
  const { data, error } = await supabase
    .from("processos")
    .select("cliente_id")
    .eq("id", processoId)
    .maybeSingle();

  if (error || !data?.cliente_id) {
    return { clientPhone: null };
  }

  const { data: cliente } = await supabase
    .from("clientes")
    .select("contacto")
    .eq("id", data.cliente_id)
    .maybeSingle();

  return { clientPhone: cliente?.contacto ?? null };
}

