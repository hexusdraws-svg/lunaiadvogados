import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/hooks/use-i18n";
import { useAuth } from "@/hooks/use-auth";
import { FileText, Receipt, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProcessFinancialSummary({ processoId }: { processoId: string }) {
  const { t } = useI18n();
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? null;

  const { data: invoices = [] } = useQuery({
    queryKey: ["process-invoices", companyId, processoId],
    enabled: !!companyId && !!processoId,
    queryFn: async () => {
      const { data, error } = await supabase.from("fee_notes").select("id, total, status, balance, paid_amount").eq("company_id", companyId).eq("processo_id", processoId).eq("document_type", "invoice");
      if (error) throw error;
      return data;
    },
  });

  const { data: receipts = [] } = useQuery({
    queryKey: ["process-receipts", companyId, processoId],
    enabled: !!companyId && !!processoId,
    queryFn: async () => {
      const { data, error } = await supabase.from("receipts").select("id, amount").eq("company_id", companyId).eq("processo_id", processoId);
      if (error) throw error;
      return data;
    },
  });

  const { data: feeNotes = [] } = useQuery({
    queryKey: ["process-fee-notes", companyId, processoId],
    enabled: !!companyId && !!processoId,
    queryFn: async () => {
      const { data, error } = await supabase.from("fee_notes").select("id").eq("company_id", companyId).eq("processo_id", processoId);
      if (error) throw error;
      return data;
    },
  });

  const qtyInvoices = invoices.length;
  const qtyReceipts = receipts.length;
  const balance = invoices.reduce((acc, inv) => acc + (inv.balance ?? 0), 0);

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3">{t("finance.summary", { defaultValue: "Resumo Financeiro" })}</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-muted-foreground"><FileText className="h-3.5 w-3.5" /><span className="text-[10px] font-medium uppercase">{t("finance.feeNotes.title", { defaultValue: "Orçamentos" })}</span></div>
          <p className="text-sm font-semibold">{feeNotes.length}</p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-muted-foreground"><Receipt className="h-3.5 w-3.5" /><span className="text-[10px] font-medium uppercase">{t("finance.invoices.title", { defaultValue: "Faturas" })}</span></div>
          <p className="text-sm font-semibold">{qtyInvoices}</p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-muted-foreground"><Wallet className="h-3.5 w-3.5" /><span className="text-[10px] font-medium uppercase">{t("finance.receipts.title", { defaultValue: "Recibos" })}</span></div>
          <p className="text-sm font-semibold">{qtyReceipts}</p>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-medium uppercase text-muted-foreground">{t("balance", { defaultValue: "Saldo Pendente" })}</span>
          <Badge className={cn("text-[10px]", balance > 0 ? "bg-destructive text-destructive-foreground" : "bg-success text-success-foreground")}>
            {new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(balance)}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
