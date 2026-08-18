import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/hooks/use-i18n";
import { useAuth } from "@/hooks/use-auth";
import { useFinancialReceitas, useFinancialDespesas } from "@/hooks/use-financial-transactions";
import { TrendingUp, TrendingDown, Wallet, CreditCard, PiggyBank, ArrowDownUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

function fmt(v?: number, language = "pt") {
  return new Intl.NumberFormat(language === "en" ? "en-US" : "pt-PT", { style: "currency", currency: "MZN" }).format(v || 0);
}

export function FinancialDashboard({ companyId }: { companyId?: string | null }) {
  const { t, language } = useI18n();
  const { profile } = useAuth();
  const effectiveCompanyId = companyId ?? profile?.company_id ?? null;

  const { data: receitas = [], isLoading: receitasLoading } = useFinancialReceitas(effectiveCompanyId);
  const { data: despesas = [], isLoading: despesasLoading } = useFinancialDespesas(effectiveCompanyId);

  const isLoading = receitasLoading || despesasLoading;

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

  const totalFaturado = receitas.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const totalRecebido = receitas.filter((r) => r.status === "recebido" || r.status === "paid").reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const saldoAReceber = receitas.filter((r) => r.status === "aberto" || r.status === "pending").reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const totalDespesas = despesas.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
  const lucroLiquido = totalRecebido - totalDespesas;

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const recebimentosMes = receitas
    .filter((r) => r.payment_date && r.payment_date >= monthStart)
    .reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

  const despesasMes = despesas
    .filter((d) => d.due_date && d.due_date >= monthStart)
    .reduce((acc, d) => acc + (Number(d.amount) || 0), 0);

  const monthlyFlow = [];
  for (let i = 5; i >= 0; i--) {
    const ms = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const me = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthStr = `${ms.getFullYear()}-${String(ms.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = format(ms, "MMM yyyy");

    const monthIncome = receitas
      .filter((r) => r.payment_date && r.payment_date >= monthStr && r.payment_date <= format(me, "yyyy-MM-dd"))
      .reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

    const monthExpense = despesas
      .filter((d) => d.due_date && d.due_date >= monthStr && d.due_date <= format(me, "yyyy-MM-dd"))
      .reduce((acc, d) => acc + (Number(d.amount) || 0), 0);

    monthlyFlow.push({
      month: monthLabel,
      receita: monthIncome,
      despesa: monthExpense,
      lucro: monthIncome - monthExpense,
    });
  }

  const expensesByCategory = despesas.reduce((acc, d) => {
    const cat = d.expense_category || "outros";
    acc[cat] = (acc[cat] || 0) + (Number(d.amount) || 0);
    return acc;
  }, {} as Record<string, number>);

  const revenueByProfessional = receitas.reduce((acc, r) => {
    const creator = r.created_by || "unknown";
    acc[creator] = (acc[creator] || 0) + (Number(r.amount) || 0);
    return acc;
  }, {} as Record<string, number>);

  const profitByProcess = receitas.reduce((acc, r) => {
    if (!r.process_id) return acc;
    const pid = r.process_id;
    if (!acc[pid]) acc[pid] = { receita: 0, despesa: 0 };
    acc[pid].receita += Number(r.amount) || 0;
    return acc;
  }, {} as Record<string, { receita: number; despesa: number }>);

  despesas.forEach((d) => {
    if (d.process_id && profitByProcess[d.process_id]) {
      profitByProcess[d.process_id].despesa += Number(d.amount) || 0;
    }
  });

  const pieData = Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }));
  const lineData = monthlyFlow;

  const cards = [
    { label: t("finance.dashboard.totalInvoiced", { defaultValue: "Total Faturado" }), value: totalFaturado, accent: "bg-primary/10 text-primary", icon: CreditCard },
    { label: t("finance.dashboard.totalReceived", { defaultValue: "Total Recebido" }), value: totalRecebido, accent: "bg-success/10 text-success", icon: TrendingUp },
    { label: t("finance.dashboard.totalExpenses", { defaultValue: "Total Despesas" }), value: totalDespesas, accent: "bg-destructive/10 text-destructive", icon: TrendingDown },
    { label: t("finance.dashboard.profit", { defaultValue: "Lucro Líquido" }), value: lucroLiquido, accent: lucroLiquido >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive", icon: PiggyBank },
    { label: t("finance.dashboard.balanceToReceive", { defaultValue: "Saldo a Receber" }), value: saldoAReceber, accent: "bg-info/10 text-info", icon: Wallet },
    { label: t("finance.dashboard.monthlyReceipts", { defaultValue: "Recebimentos do Mês" }), value: recebimentosMes, accent: "bg-warning/10 text-warning", icon: ArrowDownUp },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <div className={cn("flex items-center justify-between gap-2", c.accent)}>
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{c.label}</span>
              <div className={cn("flex h-7 w-7 items-center justify-center rounded-md", c.accent)}>
                <c.icon className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">{fmt(c.value, language)}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">{t("finance.dashboard.monthlyFlow", { defaultValue: "Fluxo Mensal" })}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={10} />
                <YAxis fontSize={10} tickFormatter={(v) => fmt(v, language)} />
                <Tooltip formatter={(v: number) => fmt(v, language)} />
                <Legend />
                <Line type="monotone" dataKey="receita" stroke="#2563eb" name={t("finance.dashboard.revenue", { defaultValue: "Receita" })} strokeWidth={2} />
                <Line type="monotone" dataKey="despesa" stroke="#ef4444" name={t("finance.dashboard.expense", { defaultValue: "Despesa" })} strokeWidth={2} />
                <Line type="monotone" dataKey="lucro" stroke="#10b981" name={t("finance.dashboard.profit", { defaultValue: "Lucro" })} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">{t("finance.dashboard.expensesByCategory", { defaultValue: "Despesas por Categoria" })}</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v, language)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-xs text-muted-foreground py-10">{t("finance.dashboard.noData", { defaultValue: "Sem dados de despesas." })}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">{t("finance.dashboard.revenueByProfessional", { defaultValue: "Receita por Profissional" })}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={Object.entries(revenueByProfessional).map(([name, value]) => ({ name, value }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis fontSize={10} tickFormatter={(v) => fmt(v, language)} />
                <Tooltip formatter={(v: number) => fmt(v, language)} />
                <Bar dataKey="value" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">{t("finance.dashboard.profitByProcess", { defaultValue: "Lucro por Processo" })}</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(profitByProcess).length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.entries(profitByProcess).map(([id, d]) => ({ id, ...d }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="id" fontSize={10} />
                  <YAxis fontSize={10} tickFormatter={(v) => fmt(v, language)} />
                  <Tooltip formatter={(v: number) => fmt(v, language)} />
                  <Legend />
                  <Bar dataKey="receita" fill="#10b981" name={t("finance.dashboard.revenue", { defaultValue: "Receita" })} />
                  <Bar dataKey="despesa" fill="#ef4444" name={t("finance.dashboard.expense", { defaultValue: "Despesa" })} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-xs text-muted-foreground py-10">{t("finance.dashboard.noProcessData", { defaultValue: "Sem dados de processos." })}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}