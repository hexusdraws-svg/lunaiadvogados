import type { Lead } from "@/lib/sheets";
import { StatusBadge } from "./status-badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/hooks/use-i18n";

export function ClientesTable({ data, loading }: { data?: Lead[]; loading?: boolean }) {
  const { t } = useI18n();
  const clienteIds = (data ?? []).map((c) => c.id).filter(Boolean);
  const processosCountQ = useQuery({
    queryKey: ["clientes-processos-count", clienteIds],
    queryFn: async () => {
      if (clienteIds.length === 0) return {} as Record<string, number>;
      const { data: rows, error } = await supabase
        .from("processos")
        .select("cliente_id")
        .in("cliente_id", clienteIds);
      if (error) return {} as Record<string, number>;
      const counts: Record<string, number> = {};
      (rows ?? []).forEach((r) => {
        const id = (r as { cliente_id?: string }).cliente_id;
        if (id) counts[id] = (counts[id] || 0) + 1;
      });
      return counts;
    },
    enabled: clienteIds.length > 0,
    staleTime: 60_000,
  });

  const processosCount = processosCountQ.data ?? {};

  return (
    <div className="glass overflow-hidden rounded-2xl border border-border">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Clientes recentes</h3>
          <p className="text-xs text-muted-foreground">Base de dados atualizada</p>
        </div>
        <button className="rounded-lg border border-border bg-secondary/60 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
          Exportar
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-6 py-3 font-medium">Nome</th>
              <th className="px-6 py-3 font-medium">Localidade</th>
              <th className="px-6 py-3 font-medium">Referência</th>
              <th className="px-6 py-3 font-medium">Estado</th>
              <th className="px-6 py-3 font-medium">Origem</th>
              <th className="px-6 py-3 font-medium">Nº Processos</th>
              <th className="px-6 py-3 font-medium">Observações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading &&
              data?.map((lead) => (
                <tr key={lead.id} className="transition-colors hover:bg-accent/40">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--gradient-primary)] text-xs font-semibold text-primary-foreground">
                        {lead.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{t("client")} #{lead.id}</p>
                      </div>
                    </div>
                  </td>
                    <td className="px-6 py-4 text-foreground/90">{lead.neighborhood || t("none")}</td>
                    <td className="px-6 py-4 font-medium text-foreground">{lead.reference || t("none")}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={lead.status} />
                  </td>
                    <td className="px-6 py-4 text-foreground/80">{lead.visit || t("none")}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-medium">{processosCount[lead.id] ?? 0}</span>
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate text-muted-foreground">
                    {lead.notes || t("none")}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
