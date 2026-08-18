import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/hooks/use-i18n";

export function IncomeHistory({ companyId, feeNoteId }: { companyId?: string | null; feeNoteId?: string | null }) {
  const { t } = useI18n();
  const qc = useQueryClient();

  const getPaymentMethodLabel = (method: string) =>
    t(`finance.paymentMethods.${method}`, { defaultValue: method });

  const { data: incomes = [], isLoading } = useQuery({
    queryKey: ["income-history", companyId, feeNoteId],
    enabled: !!companyId && !!feeNoteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("company_id", companyId)
        .eq("fee_note_id", feeNoteId)
        .eq("transaction_type", "income")
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  const totalReceived = useMemo(() => incomes.reduce((acc, item) => acc + (item.amount || 0), 0), [incomes]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 text-xs text-muted-foreground">
        A carregar recebimentos...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{t("finance.incomeHistory.totalReceived", { defaultValue: "Total Recebido" })}:</span>
        <span className="text-xs font-semibold">
          {new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(totalReceived)}
        </span>
      </div>
      {incomes.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("finance.incomeHistory.empty", { defaultValue: "Nenhum recebimento registado." })}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("date", { defaultValue: "Data" })}</TableHead>
              <TableHead>{t("amount", { defaultValue: "Valor" })}</TableHead>
              <TableHead>{t("finance.paymentMethods.method", { defaultValue: "Forma de pagamento" })}</TableHead>
              <TableHead>{t("reference", { defaultValue: "Referência" })}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incomes.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-xs">{item.transaction_date || "—"}</TableCell>
                <TableCell className="text-xs font-medium">
                  {new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(item.amount || 0)}
                </TableCell>
                <TableCell className="text-xs">{item.payment_method ? getPaymentMethodLabel(item.payment_method) : "—"}</TableCell>
                <TableCell className="text-xs">{item.reference_number || item.reference || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
