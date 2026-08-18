import { useMemo, useState } from "react";
import { Gavel, CalendarClock } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Section, useExecNavigate, useExecI18n, formatDateTime } from "./executive-utils";
import { PERIOD_LABELS, type PeriodKey } from "@/hooks/use-financial-period";
import type { Processo, HearingRow, ProfileRow, KpiStats } from "@/hooks/use-executive-dashboard";

type HearingGroup = {
  key: "today" | "tomorrow" | "week" | "later";
  label: string;
  items: HearingRow[];
};

export function AudienciasTab({
  hearings,
  kpis,
  profiles,
  processos,
}: {
  hearings: HearingRow[];
  kpis: KpiStats;
  profiles: ProfileRow[];
  processos: Processo[];
}) {
  const { tx, t, dateFormat } = useExecI18n();
  const nav = useExecNavigate();

  const [periodKey, setPeriodKey] = useState<PeriodKey>("week");
  const [customFrom, setCustomFrom] = useState<Date | null>(null);
  const [customTo, setCustomTo] = useState<Date | null>(null);

  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);
  const diaHoje = today0.getTime();
  const amanha0 = new Date(diaHoje + 24 * 60 * 60 * 1000);
  amanha0.setHours(0, 0, 0, 0);
  const diaAmanha = amanha0.getTime();
  const semana0 = new Date(diaHoje + 7 * 24 * 60 * 60 * 1000);
  semana0.setHours(0, 0, 0, 0);
  const diaSemana = semana0.getTime();

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  const periodRange = useMemo(() => {
    const d = new Date();
    switch (periodKey) {
      case "today":
        return { from: startOfDay(d), to: endOfDay(d) };
      case "week": {
        const from = new Date(d);
        from.setDate(from.getDate() - 7);
        return { from: startOfDay(from), to: endOfDay(d) };
      }
      case "month":
        return { from: startOfDay(new Date(d.getFullYear(), d.getMonth(), 1)), to: endOfDay(d) };
      case "last_month": {
        const lastDay = new Date(d.getFullYear(), d.getMonth(), 0);
        return { from: startOfDay(new Date(lastDay.getFullYear(), lastDay.getMonth(), 1)), to: endOfDay(lastDay) };
      }
      case "custom":
        return { from: customFrom ? startOfDay(customFrom) : null, to: customTo ? endOfDay(customTo) : null };
      default:
        return { from: startOfDay(new Date(d.setDate(d.getDate() - 7))), to: endOfDay(d) };
    }
  }, [periodKey, customFrom, customTo]);

  const filteredHearings = useMemo(() => {
    if (!periodRange.from || !periodRange.to) return hearings;
    return hearings.filter((h) => {
      try {
        const d = new Date(h.hearing_date);
        const time = h.hearing_time || "00:00";
        const [hh, mm] = time.split(":").map(Number);
        d.setHours(hh || 0, mm || 0, 0, 0);
        return d >= periodRange.from! && d <= periodRange.to!;
      } catch {
        return false;
      }
    });
  }, [hearings, periodRange]);

  const profileMap = useMemo(
    () => new Map(profiles.map((p) => [p.id, p.full_name ?? p.email])),
    [profiles],
  );
  const processoMap = useMemo(() => new Map(processos.map((p) => [p.id, p])), [processos]);

  const futureHearings = useMemo(() => {
    return filteredHearings
      .filter((h) => {
        const d = new Date(h.hearing_date).getTime();
        return !Number.isNaN(d) && d >= diaHoje;
      })
      .sort((a, b) => a.hearing_date.localeCompare(b.hearing_date) || a.hearing_time.localeCompare(b.hearing_time));
  }, [filteredHearings, diaHoje]);

  const groups = useMemo<HearingGroup[]>(() => {
    const today: HearingRow[] = [];
    const tomorrow: HearingRow[] = [];
    const week: HearingRow[] = [];
    const later: HearingRow[] = [];

    for (const h of futureHearings) {
      const d = new Date(h.hearing_date).getTime();
      if (d < diaAmanha) today.push(h);
      else if (d < diaAmanha + 24 * 60 * 60 * 1000) tomorrow.push(h);
      else if (d < diaSemana) week.push(h);
      else later.push(h);
    }

    const raw: HearingGroup[] = [
      { key: "today", label: tx("dash.hearToday"), items: today },
      { key: "tomorrow", label: tx("dash.hearTomorrow"), items: tomorrow },
      { key: "week", label: tx("dash.hearWeek"), items: week },
      { key: "later", label: tx("dash.hearLater"), items: later },
    ];
    return raw.filter((g) => g.items.length > 0);
  }, [futureHearings, diaAmanha, diaSemana, tx]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label={tx("dash.hearTotal")} value={filteredHearings.length} icon={Gavel} accent="info" />
          <StatCard
            label={tx("dash.hear7Resumo")}
            value={kpis.audiencias7dias}
            icon={CalendarClock}
            accent="warning"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodKey} onValueChange={(v) => setPeriodKey(v as PeriodKey)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">{PERIOD_LABELS.today}</SelectItem>
              <SelectItem value="week">{PERIOD_LABELS.week}</SelectItem>
              <SelectItem value="month">{PERIOD_LABELS.month}</SelectItem>
              <SelectItem value="last_month">{PERIOD_LABELS.last_month}</SelectItem>
              <SelectItem value="custom">{PERIOD_LABELS.custom}</SelectItem>
            </SelectContent>
          </Select>
          {periodKey === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  {customFrom && customTo
                    ? `${format(customFrom, "dd/MM")}${format(customTo, " - dd/MM")}`
                    : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-3">
                <Calendar
                  mode="range"
                  selected={{ from: customFrom ?? undefined, to: customTo ?? undefined }}
                  onSelect={(range) => {
                    setCustomFrom(range?.from ?? null);
                    setCustomTo(range?.to ?? null);
                  }}
                  numberOfMonths={1}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <Section       title={t("nav.audiencias")} icon={Gavel} accent="info">
          <p className="py-6 text-center text-sm text-muted-foreground">{tx("dash.emptyAudiencias")}</p>
        </Section>
      ) : (
        groups.map((group) => (
          <Section key={group.key} title={group.label} icon={Gavel} accent="info">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">{tx("hear.cliente")}</th>
                    <th className="px-3 py-2 font-medium">{tx("hear.processo")}</th>
                    <th className="px-3 py-2 font-medium">{tx("hear.tribunal")}</th>
                    <th className="px-3 py-2 font-medium">{tx("hear.juiz")}</th>
                    <th className="px-3 py-2 font-medium">{tx("hear.responsavel")}</th>
                    <th className="px-3 py-2 font-medium">{tx("dash.hearData")}</th>
                    <th className="px-3 py-2 font-medium">{tx("dash.hearHora")}</th>
                    <th className="px-3 py-2 text-center font-medium">{tx("hear.diasRestantes")}</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((h) => {
                    const proc = processoMap.get(h.case_id);
                    const dias = Math.ceil((new Date(h.hearing_date).getTime() - diaHoje) / (1000 * 60 * 60 * 24));
                    return (
                      <tr
                        key={h.id}
                        onClick={() => nav({ to: "/audiencias" })}
                        className="cursor-pointer border-b border-border/50 transition-colors hover:bg-accent/50"
                      >
                        <td className="px-3 py-2 text-muted-foreground">{proc?.cliente_nome ?? "—"}</td>
                        <td className="px-3 py-2 font-medium text-foreground">{proc?.numero ?? "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{h.court_name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{h.judge_name ?? "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {h.responsible_professional_id ? profileMap.get(h.responsible_professional_id) ?? "—" : "—"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatDateTime(h.hearing_date, dateFormat)}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{h.hearing_time}</td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                              dias <= 1 ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {dias}d
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        ))
      )}
    </div>
  );
}
