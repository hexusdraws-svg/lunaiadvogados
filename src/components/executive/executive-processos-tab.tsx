import { useMemo, useState } from "react";
import { FolderKanban } from "lucide-react";
import { Section, useExecNavigate, useExecI18n, formatDateTime, ProcessStatusBadge } from "./executive-utils";
import type { Processo } from "@/lib/processos";
import type { IdleProcess, ProfileRow } from "@/hooks/use-executive-dashboard";

type Sub = "todos" | "ativos" | "arquivados" | "sem";

export function ProcessosTab({
  processos,
  idleProcesses,
  profiles,
  initialSub = "todos",
}: {
  processos: Processo[];
  idleProcesses: IdleProcess[];
  profiles: ProfileRow[];
  initialSub?: Sub;
}) {
  const { tx, t, dateFormat } = useExecI18n();
  const nav = useExecNavigate();
  const [sub, setSub] = useState<Sub>(initialSub);

  const profileMap = useMemo(
    () => new Map(profiles.map((p) => [p.id, p.full_name ?? p.email])),
    [profiles],
  );
  const idleIds = useMemo(() => new Set(idleProcesses.map((i) => i.processo.id)), [idleProcesses]);

  const filtered = useMemo(() => {
    if (sub === "ativos") return processos.filter((p) => p.status === "em_andamento");
    if (sub === "arquivados") return processos.filter((p) => p.status === "arquivado");
    if (sub === "sem") return processos.filter((p) => idleIds.has(p.id));
    return processos;
  }, [processos, sub, idleIds]);

  const subtabs: { key: Sub; label: string; count: number }[] = [
    { key: "todos", label: tx("dash.tabsAll"), count: processos.length },
    { key: "ativos", label: tx("dash.tabsActive"), count: processos.filter((p) => p.status === "em_andamento").length },
    { key: "arquivados", label: tx("dash.tabsArchived"), count: processos.filter((p) => p.status === "arquivado").length },
    { key: "sem", label: tx("proc.semMovimentacao"), count: idleIds.size },
  ];

  const renderCollaborators = (colaboradores: string[] | string | null | undefined) => {
    if (!colaboradores) return "—";
    let ids: string[] = [];
    if (Array.isArray(colaboradores)) {
      ids = colaboradores;
    } else if (typeof colaboradores === "string") {
      try {
        const parsed = JSON.parse(colaboradores);
        ids = Array.isArray(parsed) ? parsed : [];
      } catch {
        ids = [];
      }
    }
    if (ids.length === 0) return "—";
    const names = ids.map((id) => profileMap.get(id) ?? "?").filter(Boolean);
    if (names.length === 0) return "—";
    if (names.length <= 2) return names.join(", ");
    return `${names[0]}, ${names[1]} +${names.length - 2}`;
  };

  return (
    <Section
      title={t("nav.processos")}
      icon={FolderKanban}
      accent="primary"
      action={
        <div className="flex flex-wrap gap-1">
          {subtabs.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSub(s.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                sub === s.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              }`}
            >
              {s.label}
              <span className="ml-1.5 opacity-70">{s.count}</span>
            </button>
          ))}
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">{t("table.processNumber")}</th>
              <th className="px-3 py-2 font-medium">{t("table.client")}</th>
              <th className="px-3 py-2 font-medium">{t("table.type")}</th>
              <th className="px-3 py-2 font-medium">{t("status")}</th>
              <th className="px-3 py-2 font-medium">{t("table.responsibleLawyer")}</th>
              <th className="px-3 py-2 font-medium">{tx("dash.tblCollaborators")}</th>
              <th className="px-3 py-2 font-medium">{tx("dash.tblData")}</th>
              <th className="px-3 py-2 font-medium">{tx("dash.tblLastUpdate")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.id}
                onClick={() => nav({ to: "/processos/$id", id: p.id })}
                className="cursor-pointer border-b border-border/50 transition-colors hover:bg-accent/50"
              >
                <td className="px-3 py-2 font-medium text-foreground">{p.numero}</td>
                <td className="px-3 py-2 text-muted-foreground">{p.cliente_nome ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{p.tipo}</td>
                <td className="px-3 py-2">
                  <ProcessStatusBadge status={p.status} />
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {p.responsavel_id ? profileMap.get(p.responsavel_id) ?? "—" : "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {renderCollaborators(p.colaboradores)}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {formatDateTime(p.created_at, dateFormat)}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {formatDateTime(p.updated_at, dateFormat)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {tx("search.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
