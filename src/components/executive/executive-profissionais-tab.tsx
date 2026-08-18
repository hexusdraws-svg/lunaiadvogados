import { useState, useMemo } from "react";
import { UserCog } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Section, useExecNavigate, useExecI18n, initials } from "./executive-utils";
import { ProfessionalDrawer } from "./professional-drawer";
import type {
  ProfessionalMonitor,
  Processo,
  ClienteRow,
  HearingRow,
} from "@/hooks/use-executive-dashboard";

function ProCard({
  p,
  processos,
  clientes,
  hearings,
  onOpen,
}: {
  p: ProfessionalMonitor;
  processos: Processo[];
  clientes: ClienteRow[];
  hearings: HearingRow[];
  onOpen: () => void;
}) {
  const { tx, language } = useExecI18n();

  const locale = language === "en" ? "en-US" : "pt-PT";

  return (
    <div className="rounded-2xl border border-border bg-card p-3.5">
      <div className="flex items-center gap-2.5">
        <Avatar className="h-11 w-11">
          {p.avatar_url && <AvatarImage src={p.avatar_url} alt={p.nome} />}
          <AvatarFallback className="text-sm">{initials(p.nome)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{p.nome}</p>
          <p className="truncate text-xs capitalize text-muted-foreground">{p.cargo ?? "—"}</p>
        </div>
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            p.status === "online" ? "bg-success" : "bg-muted-foreground/40"
          }`}
        />
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-sm">
        <Metric label={tx("prof.clientesCadastrados")} value={p.clientesCadastrados} />
        <Metric label={tx("prof.processosCriados")} value={p.processosCriados} />
        <Metric label={tx("prof.processosConcluidos")} value={p.processosConcluidos} />
         <Metric label={tx("prof.audiencias")} value={p.audienciasCriadas} />
      </div>

      <p className="mt-2.5 text-xs text-muted-foreground">
        {tx("prof.ultimaAtividade")}: {p.ultimaAtividade ? new Date(p.ultimaAtividade).toLocaleDateString(locale) : "—"}
      </p>

      <button
        type="button"
        onClick={onOpen}
        className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        {tx("dash.viewDetails")}
      </button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-secondary/40 px-2 py-1.5">
      <p className="text-sm font-semibold text-foreground tabular-nums">{value}</p>
      <p className="text-[10px] leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}

export function ProfissionaisTab({
  professionals,
  processos,
  clientes,
  hearings,
}: {
  professionals: ProfessionalMonitor[];
  processos: Processo[];
  clientes: ClienteRow[];
  hearings: HearingRow[];
}) {
  const { tx } = useExecI18n();
  const [openId, setOpenId] = useState<string | null>(null);

  const openProfessional = professionals.find((p) => p.id === openId) ?? null;

  return (
    <Section title={tx("area.professionals")} icon={UserCog} accent="primary">
      {professionals.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{tx("search.empty")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {professionals.map((p) => (
            <ProCard
              key={p.id}
              p={p}
              processos={processos}
              clientes={clientes}
              hearings={hearings}
              onOpen={() => setOpenId(p.id)}
            />
          ))}
        </div>
      )}

      <ProfessionalDrawer
        professional={openProfessional}
        processos={processos}
        clientes={clientes}
        hearings={hearings}
        open={!!openId && !!openProfessional}
        onOpenChange={(v) => setOpenId(v ? openId : null)}
      />
    </Section>
  );
}
