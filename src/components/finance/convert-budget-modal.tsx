import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { FeeNote } from "@/lib/finance-types";
import { useConvertBudgetToInvoice } from "@/hooks/use-financials-new";
import { useI18n } from "@/hooks/use-i18n";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function ConvertBudgetModal({
  budget,
  open,
  onOpenChange,
  onConverted,
}: {
  budget: FeeNote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConverted?: (invoice: FeeNote) => void;
}) {
  const { t } = useI18n();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const conversion = useConvertBudgetToInvoice();
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async () => {
    if (!budget || !budget.id || !profile?.company_id || !profile?.id) return;
    setError(null);
    try {
      const invoice = await conversion.mutateAsync({
        budgetId: budget.id,
        companyId: profile.company_id,
        createdBy: profile.id,
      });
      toast.success(t("finance.convert.success", { defaultValue: "Orçamento convertido em fatura." }));
      onOpenChange(false);
      onConverted?.(invoice);
      qc.invalidateQueries({ queryKey: ["fee-notes", profile.company_id] });
    } catch (e) {
      const message = e instanceof Error ? e.message : t("errors.unexpectedError", { defaultValue: "Erro inesperado." });
      setError(message);
      toast.error(message);
    }
  };

  const handleClose = () => {
    if (!conversion.isPending) {
      setError(null);
      onOpenChange(false);
    }
  };

  const subtotal = (budget?.services || []).reduce((acc, it) => acc + (it.total || 0), 0);
  const total = subtotal + (budget?.tax || 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("finance.convert.title", { defaultValue: "Converter em Fatura" })}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-md border border-border p-3 text-xs">
            <p className="text-muted-foreground mb-1">{t("finance.convert.confirm", { defaultValue: "Transformar este orçamento em uma fatura?" })}</p>
          </div>

          {budget && (
            <Card className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("number", { defaultValue: "Número" })}</p>
                  <p className="font-medium">{budget.numero}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("status", { defaultValue: "Status" })}</p>
                  <Badge className={cn("text-[10px] capitalize", budget.status === "aceite" ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground")}>{budget.status}</Badge>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("amount", { defaultValue: "Total" })}</p>
                  <p className="font-medium">{new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(total)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("date", { defaultValue: "Data" })}</p>
                  <p className="font-medium">{budget.issue_date || "—"}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-muted-foreground mb-1">{t("finance.feeNotes.services", { defaultValue: "Serviços" })}</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("description", { defaultValue: "Descrição" })}</TableHead>
                      <TableHead className="w-16">{t("quantity", { defaultValue: "Qtd" })}</TableHead>
                      <TableHead className="w-28">{t("unitValue", { defaultValue: "Valor Unit." })}</TableHead>
                      <TableHead className="w-28">{t("total", { defaultValue: "Total" })}</TableHead>
                    </TableRow>
                  </TableHeader>
                      <TableBody>
                        {(budget.services || []).map((it: any, idx: number) => (
                          <TableRow key={it.id || idx}>
                            <TableCell>{it.description}</TableCell>
                            <TableCell>{it.quantity}</TableCell>
                            <TableCell>{new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(it.unit_value)}</TableCell>
                            <TableCell>{new Intl.NumberFormat("pt-PT", { style: "currency", currency: "MZN" }).format(it.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                </Table>
              </div>

              {budget.observations && (
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("notes", { defaultValue: "Observações" })}</p>
                  <p className="whitespace-pre-wrap text-xs">{budget.observations}</p>
                </div>
              )}
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={conversion.isPending}>
            {t("cancel", { defaultValue: "Cancelar" })}
          </Button>
          <Button onClick={handleConvert} disabled={conversion.isPending || !budget}>
            {conversion.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("finance.invoices.convert", { defaultValue: "Converter em Fatura" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
