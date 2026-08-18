import { useMemo } from "react";
import { useProcessos } from "@/hooks/use-tarefas";
import type { Processo } from "@/lib/processos";

export interface ProcessoStats {
  total: number;
  active: number;
  completed: number;
  archived: number;
  urgent: number;
  upcomingHearing: number;
  noMovement30Days: number;
  createdThisMonth: number;
}

export function useProcessoStats() {
  const { data: processos = [], isLoading } = useProcessos();

  const stats = useMemo<ProcessoStats>(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const result: ProcessoStats = {
      total: processos.length,
      active: 0,
      completed: 0,
      archived: 0,
      urgent: 0,
      upcomingHearing: 0,
      noMovement30Days: 0,
      createdThisMonth: 0,
    };

    for (const p of processos) {
      if (p.status === "em_andamento" || p.status === "aguardando_audiencia" || p.status === "em_recurso") {
        result.active++;
      }
      if (p.status === "concluido") result.completed++;
      if (p.status === "arquivado") result.archived++;
      if (p.prioridade === "urgente" || p.prioridade === "alta") result.urgent++;

      const created = p.created_at ? new Date(p.created_at) : null;
      if (created && created >= startOfMonth) result.createdThisMonth++;

      const ultimaMov = p.ultima_movimentacao ? new Date(p.ultima_movimentacao) : created;
      if (ultimaMov && ultimaMov < thirtyDaysAgo) result.noMovement30Days++;

      const nextHearing = p.proxima_audiencia ? new Date(p.proxima_audiencia) : null;
      if (nextHearing && nextHearing >= now) result.upcomingHearing++;
    }

    return result;
  }, [processos]);

  return { stats, processos, isLoading };
}
