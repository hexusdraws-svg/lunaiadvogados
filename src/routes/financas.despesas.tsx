import { useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute, SuperAdminRedirect } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";
import { ExpenseFormDialog } from "@/components/expense-form-dialog";
import { DespesasExpensesTable } from "@/components/despesas-expenses-table";
import { useI18n } from "@/hooks/use-i18n";

export const Route = createFileRoute("/financas/despesas")({
  head: () => ({ meta: [{ title: "Despesas" }] }),
  component: () => (
    <ProtectedRoute>
      <SuperAdminRedirect>
        <DespesasPage />
      </SuperAdminRedirect>
    </ProtectedRoute>
  ),
});

function DespesasPage() {
  const { t } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const tableRef = useRef<{ exportToPdf: () => void } | null>(null);

  const handleExport = () => {
    tableRef.current?.exportToPdf();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            {t("finance.expenses.newExpense")}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="h-4 w-4" />
            {t("finance.expenses.exportReport")}
          </Button>
        </div>
      </div>

      <DespesasExpensesTable ref={tableRef} />

      <ExpenseFormDialog open={showForm} onOpenChange={setShowForm} />
    </div>
  );
}
