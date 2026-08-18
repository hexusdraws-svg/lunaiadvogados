import { useMemo } from "react";
import {
  Users,
  FolderKanban,
  Gavel,
  AlertTriangle,
  Clock3,
  CalendarClock,
  Banknote,
  Wallet,
  TrendingUp,
  PiggyBank,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { Section, useExecI18n } from "./executive-utils";
import { FinanceDashboardSection } from "./finance-dashboard-section";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { KpiStats, IdleProcess } from "@/hooks/use-executive-dashboard";

function StatCardCompact({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent: "primary" | "success" | "warning" | "info" | "destructive";
}) {
  const accentClasses = {
    primary: "text-primary bg-primary/10 border-primary/25",
    success: "text-success bg-success/10 border-success/25",
    warning: "text-warning bg-warning/10 border-warning/25",
    info: "text-info bg-info/10 border-info/25",
    destructive: "text-destructive bg-destructive/10 border-destructive/25",
  };
  return (
    <div className="glass rounded-xl border border-border p-2.5">
      <div className="flex items-center gap-2.5">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${accentClasses[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-sm font-semibold tracking-tight text-foreground tabular-nums whitespace-nowrap">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function DashboardTab({
  kpis,
  idleProcesses,
  onGoProcessos,
  onGoAudiencias,
}: {
  kpis: KpiStats;
  idleProcesses: IdleProcess[];
  onGoProcessos: (subtab?: string) => void;
  onGoAudiencias: () => void;
}) {
  const { tx, t, currency } = useExecI18n();

  const kpiCards = [
    { label: t("kpi.clientesHoje", { defaultValue: "Clientes cadastrados hoje" }), value: kpis.clientesHoje, icon: Users, accent: "primary" as const },
    { label: t("kpi.clientesTotal", { defaultValue: "Clientes no total" }), value: kpis.totalClientes, icon: Users, accent: "primary" as const },
    { label: tx("kpi.receitaHoje"), value: formatCurrency(kpis.receitaHoje), icon: Wallet, accent: "success" as const },
  ];

  const idle30 = idleProcesses.filter((i) => i.diasParado >= 30).length;

  return (
    <div className="space-y-6">
      {/* SEÇÃO 1 — Indicadores Gerais */}
      <Section title={tx("area.overview")} icon={Users} accent="primary">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3">
          {kpiCards.map((c) => (
            <StatCardCompact
              key={c.label}
              label={c.label}
              value={c.value}
              icon={c.icon}
              accent={c.accent}
            />
          ))}
        </div>
      </Section>

      {/* Separador visual elegante */}
      <div className="relative py-1">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="flex justify-center">
          <div className="bg-background px-4 text-xs uppercase tracking-wider text-muted-foreground">
            {t("finance.dashboardSection.title")}
          </div>
        </div>
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* SEÇÃO 2 — FINANÇAS */}
      <Section title={t("finance.dashboardSection.title")} icon={Wallet} accent="success">
        <FinanceDashboardSection />
      </Section>
    </div>
  );
}
