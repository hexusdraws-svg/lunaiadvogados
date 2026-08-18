import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute, SuperAdminRedirect } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BudgetList } from "@/components/finance/budget-list";
import { InvoiceList } from "@/components/finance/invoice-list";
import { ReceiptsTable } from "@/components/finance/receipts-table";
import { useI18n } from "@/hooks/use-i18n";
import { useAuth } from "@/hooks/use-auth";
import { useClientsForSelect } from "@/hooks/use-financial-transactions";
import type { Invoice } from "@/lib/finance-types";

type TabId = "budgets" | "invoices" | "receipts";

export const Route = createFileRoute("/financas/recebimentos")({
  head: () => ({ meta: [{ title: "Recebimentos" }] }),
  component: () => (
    <ProtectedRoute>
      <SuperAdminRedirect>
        <RecebimentosPage />
      </SuperAdminRedirect>
    </ProtectedRoute>
  ),
});

function RecebimentosPage() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? null;
  const { data: clients = [] } = useClientsForSelect();

  const [tab, setTab] = useState<TabId>("budgets");
  const [receiptInvoice, setReceiptInvoice] = useState<Invoice | null>(null);

  const [searchBudget, setSearchBudget] = useState("");
  const [searchInvoice, setSearchInvoice] = useState("");
  const [searchReceipt, setSearchReceipt] = useState("");

  const [budgetStatusFilter, setBudgetStatusFilter] = useState<string>("all");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant={tab === "budgets" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("budgets")}
        >
          {t("finance.budgets.title")}
        </Button>
        <Button
          variant={tab === "invoices" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("invoices")}
        >
          {t("finance.invoices.title")}
        </Button>
        <Button
          variant={tab === "receipts" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("receipts")}
        >
          {t("finance.receipts.title")}
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {tab === "budgets" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("finance.budgets.searchPlaceholder")}</Label>
                <Input
                  className="h-9 text-xs"
                  value={searchBudget}
                  onChange={(e) => setSearchBudget(e.target.value)}
                  placeholder={t("finance.budgets.searchPlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("finance.budgets.status")}</Label>
                <Select
                  value={budgetStatusFilter}
                  onValueChange={(v) => setBudgetStatusFilter(v === "all" ? "" : v)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder={t("finance.filters.all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("finance.filters.all")}</SelectItem>
                    {[
                      { value: "rascunho", labelKey: "finance.budgets.statusDraft", label: "Rascunho" },
                      { value: "enviado", labelKey: "finance.budgets.statusSent", label: "Enviado" },
                      { value: "aceite", labelKey: "finance.budgets.statusAccepted", label: "Aceite" },
                      { value: "recusado", labelKey: "finance.budgets.statusRejected", label: "Rejeitado" },
                      { value: "expirado", labelKey: "finance.budgets.statusExpired", label: "Expirado" },
                    ].map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {t(s.labelKey as any, { defaultValue: s.label })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {tab === "invoices" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("finance.invoices.searchPlaceholder")}</Label>
                <Input
                  className="h-9 text-xs"
                  value={searchInvoice}
                  onChange={(e) => setSearchInvoice(e.target.value)}
                  placeholder={t("finance.invoices.searchPlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("finance.invoices.status")}</Label>
                <Select
                  value={invoiceStatusFilter}
                  onValueChange={(v) => setInvoiceStatusFilter(v === "all" ? "" : v)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder={t("finance.filters.all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("finance.filters.all")}</SelectItem>
                    {[
                      { value: "pendente", labelKey: "finance.invoices.statusPending", label: "Pendente" },
                      { value: "parcial", labelKey: "finance.invoices.statusPartiallyPaid", label: "Parcial" },
                      { value: "pago", labelKey: "finance.invoices.statusPaid", label: "Pago" },
                      { value: "cancelado", labelKey: "finance.invoices.statusCancelled", label: "Cancelado" },
                    ].map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {t(s.labelKey as any, { defaultValue: s.label })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("finance.invoices.client")}</Label>
                <Select
                  value={clientFilter}
                  onValueChange={(v) => setClientFilter(v === "all" ? "" : v)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder={t("finance.filters.all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("finance.filters.all")}</SelectItem>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {tab === "receipts" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("finance.receipts.searchPlaceholder")}</Label>
                <Input
                  className="h-9 text-xs"
                  value={searchReceipt}
                  onChange={(e) => setSearchReceipt(e.target.value)}
                  placeholder={t("finance.receipts.searchPlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("finance.paymentMethods.title")}</Label>
                <Select
                  value={methodFilter}
                  onValueChange={(v) => setMethodFilter(v === "all" ? "" : v)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder={t("finance.filters.all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("finance.filters.all")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
      </Card>

      <Card className="p-4">
        {tab === "budgets" && (
          <BudgetList
            companyId={companyId}
            hideFilters
            searchNumber={searchBudget}
            filterStatus={budgetStatusFilter === "all" ? "" : budgetStatusFilter}
          />
        )}
        {tab === "invoices" && (
          <InvoiceList
            companyId={companyId}
            hideFilters
            statusFilter={invoiceStatusFilter === "all" ? "" : invoiceStatusFilter}
            clientFilter={clientFilter === "all" ? "" : clientFilter}
            onOpenReceipt={(inv) => { setReceiptInvoice(inv); setTab("receipts"); }}
          />
        )}
        {tab === "receipts" && (
          <ReceiptsTable
            companyId={companyId}
            invoiceId={receiptInvoice?.id || null}
            hideFilters
            filterNumber={searchReceipt}
            filterMethod={methodFilter === "all" ? "" : methodFilter}
            autoViewFirstReceipt={!!receiptInvoice}
          />
        )}
      </Card>
    </div>
  );
}
