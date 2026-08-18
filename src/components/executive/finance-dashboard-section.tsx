import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { useI18n } from "@/hooks/use-i18n";
import { useFinancialPeriod } from "@/hooks/use-financial-period";
import { PeriodSelector } from "@/components/ui/period-selector";
import { useFinancialReceitas, useFinancialDespesas } from "@/hooks/use-financial-transactions";
import { formatCurrency } from "@/lib/currency";
import { format, parseISO } from "date-fns";
import { pt as dateFnsPt } from "date-fns/locale";
import { cn } from "@/lib/utils";

function FinanceMiniCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: "primary" | "success" | "warning" | "destructive" | "info";
}) {
  const accentClasses = {
    primary: "text-primary bg-primary/10 border-primary/25",
    success: "text-success bg-success/10 border-success/25",
    warning: "text-warning bg-warning/10 border-warning/25",
    destructive: "text-destructive bg-destructive/10 border-destructive/25",
    info: "text-info bg-info/10 border-info/25",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md",
            accentClasses[accent],
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="mt-1.5 text-sm font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
    </div>
  );
}

export function FinanceDashboardSection() {
  const { t, currency } = useI18n();
  const {
    periodKey,
    setPeriodKey,
    customFrom,
    customTo,
    setCustom,
    range,
    fromStr,
    toStr,
    PERIOD_LABELS,
  } = useFinancialPeriod("month");

  const { data: receitas = [], isLoading: receitasLoading } = useFinancialReceitas();
  const { data: despesas = [], isLoading: despesasLoading } = useFinancialDespesas();
  const isLoading = receitasLoading || despesasLoading;

  const [subTab, setSubTab] = useState("geral");

  const receitasFiltered = useMemo(() => {
    if (fromStr && toStr) {
      return receitas.filter((r) => {
        const dateStr = r.payment_date || r.due_date || r.created_at;
        return dateStr && dateStr >= fromStr && dateStr <= toStr;
      });
    }
    return receitas;
  }, [receitas, fromStr, toStr]);

  const despesasFiltered = useMemo(() => {
    if (fromStr && toStr) {
      return despesas.filter((d) => {
        const dateStr = d.payment_date || d.due_date || d.created_at;
        return dateStr && dateStr >= fromStr && dateStr <= toStr;
      });
    }
    return despesas;
  }, [despesas, fromStr, toStr]);

  const totalReceita = receitasFiltered.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const totalDespesa = despesasFiltered.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
  const lucroLiquido = totalReceita - totalDespesa;
  const saldo = totalReceita - totalDespesa;

  const today = new Date().toISOString().slice(0, 7);
  const receitaMensal = receitasFiltered
    .filter((r) => (r.payment_date || r.created_at || "").slice(0, 7) === today)
    .reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const despesaMensal = despesasFiltered
    .filter((d) => (d.payment_date || d.due_date || d.created_at || "").slice(0, 7) === today)
    .reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
  const lucroPeriodo = totalReceita - totalDespesa;

  const periodRange = useMemo(() => {
    const now = new Date();
    const months = 6;
    const result = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const monthLabel = format(d, "MMM/yy", { locale: dateFnsPt });

      const r = receitasFiltered
        .filter((r) => {
          const ds = r.payment_date || r.due_date || r.created_at || "";
          return ds >= monthStr && ds <= format(monthEnd, "yyyy-MM-dd");
        })
        .reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

      const d2 = despesasFiltered
        .filter((d2) => {
          const ds = d2.payment_date || d2.due_date || d2.created_at || "";
          return ds >= monthStr && ds <= format(monthEnd, "yyyy-MM-dd");
        })
        .reduce((acc, d2) => acc + (Number(d2.amount) || 0), 0);

      result.push({
        month: monthLabel,
        receita: r,
        despesa: d2,
        lucro: r - d2,
      });
    }
    return result;
  }, [receitasFiltered, despesasFiltered]);

  const expensesByCategory = useMemo(() => {
    const acc = despesasFiltered.reduce(
      (map, d) => {
        const cat = d.expense_category || "outros";
        map[cat] = (map[cat] || 0) + (Number(d.amount) || 0);
        return map;
      },
      {} as Record<string, number>,
    );
    return Object.entries(acc).map(([name, value]) => ({
      name: t(`finance.expenseForm.category.${name}`) || name,
      value,
    }));
  }, [despesasFiltered, t]);

  const revenueByProfessional = useMemo(() => {
    const acc = receitasFiltered.reduce(
      (map, r) => {
        const creator = r.created_by || "unknown";
        map[creator] = (map[creator] || 0) + (Number(r.amount) || 0);
        return map;
      },
      {} as Record<string, number>,
    );
    return Object.entries(acc).map(([name, value]) => ({ name, value }));
  }, [receitasFiltered]);

  const profitByProcess = useMemo(() => {
    const map = new Map<string, { receita: number; despesa: number }>();
    receitasFiltered.forEach((r) => {
      if (!r.process_id) return;
      const existing = map.get(r.process_id) || { receita: 0, despesa: 0 };
      existing.receita += Number(r.amount) || 0;
      map.set(r.process_id, existing);
    });
    despesasFiltered.forEach((d) => {
      if (!d.process_id) return;
      const existing = map.get(d.process_id) || { receita: 0, despesa: 0 };
      existing.despesa += Number(d.amount) || 0;
      map.set(d.process_id, existing);
    });
    return Array.from(map.entries()).map(([id, vals]) => ({
      id: id.slice(0, 8),
      receita: vals.receita,
      despesa: vals.despesa,
      lucro: vals.receita - vals.despesa,
    }));
  }, [receitasFiltered, despesasFiltered]);

  const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-8 w-36 animate-pulse rounded bg-muted" />
          </Card>
        ))}
      </div>
    );
  }

  const kpiCards = [
    {
      label: t("finance.dashboardSection.kpi.totalRevenue"),
      value: formatCurrency(totalReceita, currency),
      icon: TrendingUp,
      accent: "success" as const,
    },
    {
      label: t("finance.dashboardSection.kpi.totalExpenses"),
      value: formatCurrency(totalDespesa, currency),
      icon: TrendingDown,
      accent: "destructive" as const,
    },
    {
      label: t("finance.dashboardSection.kpi.netProfit"),
      value: formatCurrency(lucroLiquido, currency),
      icon: PiggyBank,
      accent: lucroLiquido >= 0 ? ("success" as const) : ("destructive" as const),
    },
    {
      label: t("finance.dashboardSection.kpi.balance"),
      value: formatCurrency(saldo, currency),
      icon: Wallet,
      accent: "info" as const,
    },
    {
      label: t("finance.dashboardSection.kpi.monthlyRevenue"),
      value: formatCurrency(receitaMensal, currency),
      icon: TrendingUp,
      accent: "success" as const,
    },
    {
      label: t("finance.dashboardSection.kpi.monthlyExpenses"),
      value: formatCurrency(despesaMensal, currency),
      icon: TrendingDown,
      accent: "destructive" as const,
    },
    {
      label: t("finance.dashboardSection.kpi.periodProfit"),
      value: formatCurrency(lucroPeriodo, currency),
      icon: BarChart3,
      accent: lucroPeriodo >= 0 ? ("success" as const) : ("destructive" as const),
    },
  ];

  const monthsData = periodRange;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t("finance.dashboardSection.title")}
          </h2>
          <p className="text-xs text-muted-foreground">{t("finance.dashboardSection.subtitle")}</p>
        </div>
        <PeriodSelector
          periodKey={periodKey}
          setPeriodKey={setPeriodKey}
          customFrom={customFrom}
          customTo={customTo}
          setCustom={setCustom}
          range={range}
          labels={PERIOD_LABELS}
        />
      </div>

      <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 gap-1 bg-secondary/30 h-10">
          <TabsTrigger value="geral" className="text-sm">
            {t("finance.dashboardSection.subTabGeneral")}
          </TabsTrigger>
          <TabsTrigger value="fluxo" className="text-sm" disabled>
            {t("finance.dashboardSection.subTabCashFlow")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {kpiCards.map((c) => (
              <FinanceMiniCard
                key={c.label}
                label={c.label}
                value={c.value}
                icon={c.icon}
                accent={c.accent}
              />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm">
                  {t("finance.dashboardSection.charts.monthlyFlow")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={monthsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={10} />
                    <YAxis fontSize={10} tickFormatter={(v) => formatCurrency(v, currency)} />
                    <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="receita"
                      stroke="#2563eb"
                      name="Receita"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="despesa"
                      stroke="#ef4444"
                      name="Despesa"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="lucro"
                      stroke="#10b981"
                      name="Lucro"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm">
                  {t("finance.dashboardSection.charts.revenueVsExpenses")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={10} />
                    <YAxis fontSize={10} tickFormatter={(v) => formatCurrency(v, currency)} />
                    <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
                    <Legend />
                    <Bar dataKey="receita" fill="#2563eb" name="Receita" />
                    <Bar dataKey="despesa" fill="#ef4444" name="Despesa" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm">
                  {t("finance.dashboardSection.charts.revenueByProfessional")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {revenueByProfessional.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={revenueByProfessional}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={10} />
                      <YAxis fontSize={10} tickFormatter={(v) => formatCurrency(v, currency)} />
                      <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
                      <Bar dataKey="value" fill="#2563eb" name="Receita" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-10 text-center text-xs text-muted-foreground">
                    {t("finance.dashboardSection.charts.noData")}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm">
                  {t("finance.dashboardSection.charts.profitByProcess")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profitByProcess.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={profitByProcess}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="id" fontSize={10} />
                      <YAxis fontSize={10} tickFormatter={(v) => formatCurrency(v, currency)} />
                      <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
                      <Legend />
                      <Bar dataKey="receita" fill="#10b981" name="Receita" />
                      <Bar dataKey="despesa" fill="#ef4444" name="Despesa" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-10 text-center text-xs text-muted-foreground">
                    {t("noData")}
                  </p>
                )}
              </CardContent>
            </Card>

            {expensesByCategory.length > 0 && (
              <Card className="border-border lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm">
                    {t("finance.dashboardSection.charts.expensesByCategory")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={expensesByCategory} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        fontSize={10}
                        tickFormatter={(v) => formatCurrency(v, currency)}
                      />
                      <YAxis dataKey="name" type="category" fontSize={10} />
                      <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
                      <Bar dataKey="value" fill="#ef4444" name="Despesa" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="fluxo" className="mt-4">
          <p className="text-sm text-muted-foreground">{t("noData")}</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
