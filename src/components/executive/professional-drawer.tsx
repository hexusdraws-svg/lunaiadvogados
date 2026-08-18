import { useMemo } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useExecI18n, initials, ProcessStatusBadge, formatRelativeTime, formatDateTime } from "./executive-utils";
import type { ProfessionalMonitor, Processo, ClienteRow, HearingRow } from "@/hooks/use-executive-dashboard";

function PerformanceGrid({ p }: { p: ProfessionalMonitor }) {
  const { tx } = useExecI18n();
  const items = [
    { label: tx("prof.clientesCadastrados"), value: p.clientesCadastrados },
    { label: tx("prof.processosCriados"), value: p.processosCriados },
    { label: tx("prof.processosConcluidos"), value: p.processosConcluidos },
    { label: tx("prof.audiencias"), value: p.audienciasCriadas },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((it) => (
        <div key={it.label} className="rounded-lg bg-secondary/40 px-3 py-2">
          <p className="text-sm font-semibold text-foreground tabular-nums">{it.value}</p>
          <p className="text-[11px] text-muted-foreground">{it.label}</p>
        </div>
      ))}
    </div>
  );
}

function MiniList({
  title,
  items,
  empty,
  renderItem,
}: {
  title: string;
  items: any[];
  empty: string;
  renderItem: (item: any) => React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-1.5">
          {items.slice(0, 10).map(renderItem)}
        </div>
      )}
    </div>
  );
}

export function ProfessionalDrawer({
  professional,
  processos,
  clientes,
  hearings,
  open,
  onOpenChange,
}: {
  professional: ProfessionalMonitor | null;
  processos: Processo[];
  clientes: ClienteRow[];
  hearings: HearingRow[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { tx, language, dateFormat } = useExecI18n();

  if (!professional) return null;

  const meusProcessos = useMemo(
    () => processos.filter((pr) => pr.responsavel_id === professional.id),
    [processos, professional.id],
  );
  const meusClientes = useMemo(
    () => clientes.filter((c) => c.created_by === professional.id),
    [clientes, professional.id],
  );
  const minhasAudiencias = useMemo(
    () => hearings.filter((h) => h.responsible_professional_id === professional.id),
    [hearings, professional.id],
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="gap-4 p-5 text-left">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              {professional.avatar_url && <AvatarImage src={professional.avatar_url} alt={professional.nome} />}
              <AvatarFallback className="text-lg">{initials(professional.nome)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <DrawerTitle className="text-base font-semibold text-foreground">{professional.nome}</DrawerTitle>
              <DrawerDescription className="text-sm capitalize text-muted-foreground">
                {professional.cargo ?? "—"}
              </DrawerDescription>
              <p className="mt-1 text-xs text-muted-foreground">
                {tx("prof.ultimaAtividade")}: {formatRelativeTime(professional.ultimaAtividade, language)}
              </p>
            </div>
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                professional.status === "online" ? "bg-success" : "bg-muted-foreground/40"
              }`}
            />
          </div>

        </DrawerHeader>

        <div className="space-y-5 overflow-y-auto px-5 pb-5">
          <PerformanceGrid p={professional} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <MiniList
                title={tx("dash.profProcessos")}
                items={meusProcessos}
                empty={tx("search.empty")}
                renderItem={(pr) => (
                  <div key={pr.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{pr.numero}</p>
                      <p className="truncate text-xs text-muted-foreground">{pr.cliente_nome ?? "—"}</p>
                    </div>
                    <ProcessStatusBadge status={pr.status} />
                  </div>
                )}
              />
            </div>

            <div>
              <MiniList
                title={tx("dash.profClientes")}
                items={meusClientes}
                empty={tx("search.empty")}
                renderItem={(c) => (
                  <div key={c.id} className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
                    <p className="truncate text-sm font-medium text-foreground">{c.nome}</p>
                    {c.email && <p className="truncate text-xs text-muted-foreground">{c.email}</p>}
                  </div>
                )}
              />
            </div>
          </div>

          <MiniList
            title={tx("dash.profAudiencias")}
            items={minhasAudiencias}
            empty={tx("search.empty")}
            renderItem={(h) => (
              <div key={h.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{h.court_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDateTime(h.hearing_date, dateFormat)} {h.hearing_time}
                  </p>
                </div>
              </div>
            )}
          />
        </div>

        <div className="p-5 pt-0">
          <DrawerClose className="w-full rounded-xl border border-border bg-secondary/40 py-2.5 text-sm font-medium hover:bg-secondary">
            {tx("close", { defaultValue: "Fechar" })}
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
