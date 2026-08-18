import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Wallet, ReceiptText, IndianRupee, Clock, CheckCircle, XCircle, AlertTriangle, BarChart3 } from "lucide-react";
import { BudgetList } from "@/components/finance/budget-list";
import { InvoiceList } from "@/components/finance/invoice-list";
import { ReceiptsTable } from "@/components/finance/receipts-table";
import { useExecutiveDashboard } from "@/hooks/use-executive-dashboard";
import { useExecI18n } from "./executive-utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useFinancialPermissions } from "@/hooks/use-financial-permissions";
import { formatCurrency } from "@/lib/currency";

type FinanceSub = "orcamentos" | "faturas" | "recibos";

function MiniCard({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon?: React.ComponentType<{ className?: string }>; accent?: string }) {
  const accentMap: Record<string, string> = {
    primary: "text-primary border-primary/20 bg-primary/5",
    success: "text-success border-success/20 bg-success/5",
    warning: "text-warning border-warning/20 bg-warning/5",
    destructive: "text-destructive border-destructive/20 bg-destructive/5",
    info: "text-info border-info/20 bg-info/5",
    muted: "text-muted-foreground border-muted bg-muted/30",
  };
  return (
    <div className={`rounded-lg border p-3 ${accentMap[accent || "muted"]}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wider truncate">{label}</p>
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />}
      </div>
        <p className="mt-1 text-xs font-semibold tracking-tight text-ellipsis overflow-hidden break-all">{value}</p>
    </div>
  );
}

export function FinanceiroTab({ companyId }: { companyId?: string | null }) {
  const { t, tx } = useExecI18n();
  const { profile } = useAuth();
  const { filterByCreatedBy } = useFinancialPermissions();
  const [sub, setSub] = useState<FinanceSub>("orcamentos");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const dash = useExecutiveDashboard();

  const { data: budgets = [], isLoading: budgetsLoading } = useQuery({
    queryKey: ["exec-budgets", companyId, profile?.id],
    enabled: !!companyId && sub === "orcamentos",
    queryFn: async () => {
      let query = supabase
        .from("fee_notes")
        .select("*")
        .eq("company_id", companyId)
        .eq("document_type", "budget")
        .order("issue_date", { ascending: false });
      query = filterByCreatedBy(query, profile?.id);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["exec-invoices", companyId, profile?.id],
    enabled: !!companyId && sub === "faturas",
    queryFn: async () => {
      let query = supabase
        .from("fee_notes")
        .select("*")
        .eq("company_id", companyId)
        .eq("document_type", "invoice")
        .order("issue_date", { ascending: false });
      query = filterByCreatedBy(query, profile?.id);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: receipts = [], isLoading: receiptsLoading } = useQuery({
    queryKey: ["exec-receipts", companyId],
    enabled: !!companyId && sub === "recibos",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: companyProfiles = [] } = useQuery({
    queryKey: ["finance-profiles", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.from("profiles").select("id, full_name").eq("company_id", companyId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const profileMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of companyProfiles) {
      if (p.id) map.set(p.id, p.full_name || "");
    }
    return map;
  }, [companyProfiles]);

  const budgetKpis = useMemo(() => {
    const ativos = budgets.filter((b) => b.status === "aceite").length;
    const pendentes = budgets.filter((b) => b.status === "enviado" || b.status === "pendente").length;
    const rejeitados = budgets.filter((b) => b.status === "recusado").length;
    const expirados = budgets.filter((b) => b.status === "expirado" || b.status === "rascunho").length;
    const totalValue = budgets.reduce((acc, b) => acc + Number(b.total || 0), 0);
    return { ativos, pendentes, rejeitados, expirados, totalValue, total: budgets.length };
  }, [budgets]);

  const invoiceKpis = useMemo(() => {
    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce((acc, inv) => acc + Number(inv.total || 0), 0);
    const totalPaid = invoices.reduce((acc, inv) => acc + Number(inv.paid_amount ?? 0), 0);
    const remainingBalance = Math.max(totalAmount - totalPaid, 0);
    const pendentes = invoices.filter((i) => i.status === "pendente").length;
    const parcial = invoices.filter((i) => i.status === "parcial").length;
    const pagas = invoices.filter((i) => i.status === "pago").length;
    const canceladas = invoices.filter((i) => i.status === "cancelado").length;
    return { totalInvoices, totalAmount, totalPaid, remainingBalance, pendentes, parcial, pagas, canceladas };
  }, [invoices]);

  const receiptKpis = useMemo(() => {
    const total = receipts.length;
    const totalAmount = receipts.reduce((acc, r) => acc + Number(r.amount || 0), 0);
    const methods = new Set(receipts.map((r) => r.payment_method).filter(Boolean));
    const topMethod = methods.size > 0 ? Array.from(methods)[0] : "—";
    return { total, totalAmount, topMethod };
  }, [receipts]);

  const isLoading = budgetsLoading || invoicesLoading || receiptsLoading;

  if (isLoading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("finance.title", { defaultValue: "Finanças" })}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t("finance.receivablesTitle", { defaultValue: "Notas de honorários, faturas e recibos." })}</p>
        </div>
      </div>

      <Tabs value={sub} onValueChange={(v) => setSub(v as FinanceSub)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 gap-1">
          <TabsTrigger value="orcamentos" className="gap-2">
            <IndianRupee className="h-4 w-4" />
            <span className="text-sm">{t("finance.budgets.title", { defaultValue: "Orçamentos" })}</span>
          </TabsTrigger>
          <TabsTrigger value="faturas" className="gap-2">
            <ReceiptText className="h-4 w-4" />
            <span className="text-sm">{t("finance.invoices.title", { defaultValue: "Faturas" })}</span>
          </TabsTrigger>
          <TabsTrigger value="recibos" className="gap-2">
            <Wallet className="h-4 w-4" />
            <span className="text-sm">{t("finance.receipts.title", { defaultValue: "Recibos" })}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orcamentos" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <MiniCard label="Ativos" value={budgetKpis.ativos} icon={CheckCircle} accent="success" />
            <MiniCard label="Pendentes" value={budgetKpis.pendentes} icon={Clock} accent="warning" />
            <MiniCard label="Rejeitados" value={budgetKpis.rejeitados} icon={XCircle} accent="destructive" />
            <MiniCard label="Expirados" value={budgetKpis.expirados} icon={AlertTriangle} accent="muted" />
          </div>
          <BudgetList companyId={companyId} adminViewAll />
        </TabsContent>

        <TabsContent value="faturas" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <MiniCard label={tx("finance.totalInvoices")} value={invoiceKpis.totalInvoices} icon={ReceiptText} accent="primary" />
            <MiniCard label={tx("finance.totalAmount")} value={formatCurrency(invoiceKpis.totalAmount)} icon={IndianRupee} accent="info" />
            <MiniCard label={tx("finance.received", { defaultValue: "Recebido" })} value={formatCurrency(invoiceKpis.totalPaid)} icon={Wallet} accent="success" />
            <MiniCard label={tx("finance.inDebit")} value={formatCurrency(invoiceKpis.remainingBalance)} icon={AlertTriangle} accent="destructive" />
          </div>
          <InvoiceList companyId={companyId} adminViewAll onOpenReceipt={(inv) => { setSelectedInvoiceId(inv.id); setSub("recibos"); }} />
        </TabsContent>

        <TabsContent value="recibos" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <MiniCard label={tx("finance.totalReceipts")} value={receiptKpis.total} icon={Wallet} accent="primary" />
            <MiniCard label={tx("finance.totalAmount")} value={formatCurrency(receiptKpis.totalAmount)} icon={IndianRupee} accent="success" />
            <MiniCard label={tx("finance.mainMethod")} value={receiptKpis.topMethod} icon={ReceiptText} accent="info" />
          </div>
          <ReceiptsTable companyId={companyId} invoiceId={selectedInvoiceId} autoViewFirstReceipt={!!selectedInvoiceId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
