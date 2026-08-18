import { useState, useMemo, forwardRef, useImperativeHandle } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Eye, CheckCircle, Trash2, Search } from "lucide-react";
import {
  useFinancialDespesas,
  useDeleteTransaction,
  useMarkAsPaid,
} from "@/hooks/use-financial-transactions";
import { useFinancialPeriod } from "@/hooks/use-financial-period";
import { PeriodSelector } from "@/components/ui/period-selector";
import { format, parseISO } from "date-fns";
import { pt as dateFnsPt, enUS } from "date-fns/locale";
import { formatCurrency } from "@/lib/currency";
import { useI18n } from "@/hooks/use-i18n";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface DespesasExpensesTableHandle {
  exportToPdf: () => void;
}

const STATUS_BADGE: Record<string, string> = {
  aberto: "bg-warning/15 text-warning border-warning/30",
  recebido: "bg-success/15 text-success border-success/30",
  pago: "bg-success/15 text-success border-success/30",
  vencido: "bg-destructive/15 text-destructive border-destructive/30",
};

const PAGE_SIZE = 10;

export const DespesasExpensesTable = forwardRef<DespesasExpensesTableHandle>((_, ref) => {
  const { t, currency, language, dateFormat } = useI18n();
  const { data: despesas = [], isLoading } = useFinancialDespesas();
  const locale = language === "en" ? enUS : dateFnsPt;
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
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewingAttachment, setViewingAttachment] = useState<{
    url: string;
    type: string | null;
  } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const deleteMutation = useDeleteTransaction();
  const markAsPaidMutation = useMarkAsPaid();

  const filtered = useMemo(() => {
    let result = despesas;

    if (fromStr && toStr) {
      result = result.filter((d) => {
        const dateStr = d.payment_date || d.created_at;
        return dateStr && dateStr >= fromStr && dateStr <= toStr;
      });
    }

    if (search) {
      const s = search.toLowerCase();
      result = result.filter((d) => {
        return (
          d.description?.toLowerCase().includes(s) ||
          d.professional_name?.toLowerCase().includes(s) ||
          d.expense_category?.toLowerCase().includes(s)
        );
      });
    }

    return result;
  }, [despesas, fromStr, toStr, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const da = a.payment_date ? parseISO(a.payment_date) : parseISO(a.created_at);
      const db = b.payment_date ? parseISO(b.payment_date) : parseISO(b.created_at);
      return db.getTime() - da.getTime();
    });
  }, [filtered]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, page]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return format(parseISO(dateStr), dateFormat, { locale });
    } catch {
      return dateStr;
    }
  };

  const handleMarkAsPaid = (id: string) => {
    markAsPaidMutation.mutate(id);
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = () => {
    if (confirmDeleteId) {
      deleteMutation.mutate({ id: confirmDeleteId, type: "despesa" });
      setConfirmDeleteId(null);
    }
  };

  const handleExportPDF = () => {
    const getStatusLabel = (status: string | undefined) => {
      if (status === "pago") return t("finance.expenses.statusPaid");
      return t("finance.expenses.statusOpen");
    };

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(t("finance.expenses.pdfTitle"), 14, 20);
    doc.setFontSize(10);
    if (fromStr && toStr) {
      doc.text(
        `${t("finance.expenses.pdfPeriod")}: ${format(parseISO(fromStr), dateFormat, { locale })} - ${format(parseISO(toStr), dateFormat, { locale })}`,
        14,
        28,
      );
    } else {
      doc.text(`${t("finance.expenses.pdfPeriod")}: ${range.label}`, 14, 28);
    }
    doc.setFontSize(9);
    doc.text(`${t("finance.expenses.pdfGeneratedAt")}: ${format(new Date(), dateFormat, { locale })}`, 14, 34);

    const sortedData = [...sorted].sort((a, b) => {
      const da = a.payment_date ? parseISO(a.payment_date).getTime() : parseISO(a.created_at).getTime();
      const db = b.payment_date ? parseISO(b.payment_date).getTime() : parseISO(b.created_at).getTime();
      return da - db;
    });

    const total = sortedData.reduce((acc, d) => acc + Number(d.amount), 0);

    autoTable(doc, {
      head: [[t("finance.expenses.tableCategory"), t("finance.expenses.tableDescription"), t("finance.expenses.tableResponsible"), t("finance.expenses.tableProcess"), t("finance.expenses.tableDate"), t("finance.expenses.tableAmount"), t("finance.expenses.tableStatus")]],
      body: sortedData.map((d) => [
        d.expense_category || "—",
        d.description || "—",
        d.professional_name || "—",
        d.process_id ? t("finance.expenses.associated") : "—",
        formatDate(d.payment_date || d.created_at),
        formatCurrency(Number(d.amount), currency),
        getStatusLabel(d.status),
      ]),
      startY: 40,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [63, 81, 181], textColor: 255, fontSize: 9, fontStyle: "bold" },
      footStyles: { fillColor: [245, 245, 250] },
      didDrawPage: (data) => {
        const pageNumber = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(128);
        doc.text(
          `${t("finance.expenses.pdfTotal")}: ${formatCurrency(total, currency)}`,
          14,
          doc.internal.pageSize.height - 15,
        );
        doc.text(
          `${t("finance.expenses.pdfPage")} ${data.pageNumber} ${t("finance.expenses.pdfOf")} ${pageNumber}`,
          doc.internal.pageSize.width - 30,
          doc.internal.pageSize.height - 10,
        );
      },
    });
    doc.save("expense-report.pdf");
  };

  useImperativeHandle(ref, () => ({
    exportToPdf: handleExportPDF,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <PeriodSelector
            periodKey={periodKey}
            setPeriodKey={setPeriodKey}
            customFrom={customFrom}
            customTo={customTo}
            setCustom={setCustom}
            range={range}
            labels={PERIOD_LABELS}
            compact
          />
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("finance.expenses.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {t("finance.expenses.loading")}
          </div>
        ) : paginated.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {t("finance.expenses.empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-medium">{t("finance.expenses.tableCategory")}</TableHead>
                  <TableHead className="text-xs font-medium">{t("finance.expenses.tableDescription")}</TableHead>
                  <TableHead className="text-xs font-medium">{t("finance.expenses.tableResponsible")}</TableHead>
                  <TableHead className="text-xs font-medium">{t("finance.expenses.tableProcess")}</TableHead>
                  <TableHead className="text-xs font-medium">{t("finance.expenses.tableDate")}</TableHead>
                  <TableHead className="text-xs font-medium text-right">{t("finance.expenses.tableAmount")}</TableHead>
                  <TableHead className="text-xs font-medium">{t("finance.expenses.tableStatus")}</TableHead>
                  <TableHead className="text-xs font-medium text-center">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((d) => {
                  return (
                    <TableRow key={d.id} className="border-border/50">
                      <TableCell className="text-sm">{d.expense_category || "—"}</TableCell>
                      <TableCell className="text-sm font-medium text-foreground">
                        {d.description || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d.professional_name || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d.process_id ? t("finance.expenses.associated") : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(d.payment_date || d.created_at)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium text-foreground">
                        {formatCurrency(Number(d.amount), currency)}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_BADGE[d.status || "aberto"]}>
                          {d.status === "recebido" ? t("finance.expenses.statusReceived") : d.status === "pago" ? t("finance.expenses.statusPaid") : t("finance.expenses.statusOpen")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {d.attachment_url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() =>
                                setViewingAttachment({
                                  url: d.attachment_url!,
                                  type: d.attachment_type,
                                })
                              }
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {d.status === "aberto" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-success hover:text-success"
                              onClick={() => handleMarkAsPaid(d.id)}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(d.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            {sorted.length} {t("finance.expenses.records")} · {t("finance.expenses.page")} {page} {t("finance.expenses.of")} {totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              {t("finance.expenses.previous")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              {t("finance.expenses.next")}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!viewingAttachment} onOpenChange={() => setViewingAttachment(null)}>
        <DialogContent className="max-w-4xl p-0">
          <DialogHeader>
            <DialogTitle>{t("finance.expenses.attachment")}</DialogTitle>
          </DialogHeader>
          {viewingAttachment?.type === "pdf" ? (
            <iframe src={viewingAttachment.url} className="h-[70vh] w-full" title={t("finance.expenses.attachment")} />
          ) : (
            <img
              src={viewingAttachment?.url}
              alt={t("finance.expenses.attachment")}
              className="h-[70vh] w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("finance.expenses.confirmDelete")}</DialogTitle>
            <DialogDescription>
              {t("finance.expenses.confirmDeleteDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});
DespesasExpensesTable.displayName = "DespesasExpensesTable";
