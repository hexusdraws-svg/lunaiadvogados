import { useState, useMemo, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useActiveCompany } from "@/hooks/use-company";
import { useProfileCompany } from "@/hooks/use-profile-company";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, usePaymentMethods } from "@/hooks/use-i18n";
import { useSupabaseErrorHandler } from "@/lib/supabase-error-handler";
import type {
  Transaction,
  TransactionFrequency,
  PaymentMethod,
} from "@/hooks/use-financial-transactions";
import {
  useFinancialTransactions,
  useClientsForSelect,
  useProfessionalsForSelect,
  useCreateTransaction,
  useDeleteTransaction,
  useMarkAsReceived,
  useMarkAsPaid,
  useProcessesForClient,
  useTransactionFeeSplit,
  useDeleteTransactionFeeSplit,
  uploadAttachment,
} from "@/hooks/use-financial-transactions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Plus,
  Search,
  Eye,
  Download,
  Check,
  Calendar as CalendarIcon,
  Trash2,
  Upload,
  FileText,
  Users,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, addDays } from "date-fns";
import { pt as dateFnsPt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toLocalDateString } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const STATUS_BADGE: Record<string, string> = {
  aberto: "bg-warning/15 text-warning border-warning/30",
  recebido: "bg-success/15 text-success border-success/30",
  pago: "bg-success/15 text-success border-success/30",
  vencido: "bg-destructive/15 text-destructive border-destructive/30",
};

const STATUS_OPTIONS: TransactionFrequency[] = [
  "nenhum",
  "semanal",
  "quinzenal",
  "mensal",
  "trimestral",
  "semestral",
  "anual",
];

const FALLBACK_PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "transferencia", label: "Transferência Bancária" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "emola", label: "E-Mola" },
  { value: "cartao", label: "Cartão" },
  { value: "cheque", label: "Cheque" },
  { value: "outro", label: "Outro" },
];

const EXPENSE_CATEGORIES = [
  "Aluguel",
  "Água",
  "Energia",
  "Internet",
  "Transporte",
  "Impostos",
  "Material de Escritório",
  "Equipamentos",
  "Outros Custos Operacionais",
  "Salário",
  "Comissão",
  "Marketing",
  "Prestador de Serviço",
  "Freelancer",
  "Outro",
];

// Categories that do NOT require professional association
const NON_PROFESSIONAL_CATEGORIES = [
  "Aluguel",
  "Água",
  "Energia",
  "Internet",
  "Transporte",
  "Impostos",
  "Material de Escritório",
  "Equipamentos",
  "Outros Custos Operacionais",
];

// Categories that MAY use professional (optional)
const PROFESSIONAL_OPTIONAL_CATEGORIES = [
  "Salário",
  "Comissão",
  "Marketing",
  "Prestador de Serviço",
  "Freelancer",
];

// Helper to check if category requires professional field
const requiresProfessional = (category: string): boolean => {
  if (category === "Outro") return false; // Custom category doesn't require professional
  return PROFESSIONAL_OPTIONAL_CATEGORIES.includes(category);
};

interface TransactionsTableProps {
  type: "receita" | "despesa";
  title: string;
  subtitle: string;
}

interface TransactionsTableProps {
  type: "receita" | "despesa";
  title: string;
  subtitle: string;
}

export function TransactionsTable({ type, title, subtitle }: TransactionsTableProps) {
  const qc = useQueryClient();
  const { data: company } = useActiveCompany();
  const { data: profileCompany } = useProfileCompany();
  const { t } = useI18n();
  const { data: companyPaymentMethods } = usePaymentMethods();
  const handleError = useSupabaseErrorHandler();
  const today = new Date();

  // PARTE 7/8 — A divisão de honorários só existe para freelancers.
  // Escritórios (office): toda a receita pertence ao escritório, sem divisão.
  // A lógica consulta SEMPRE company.company_type (nunca roles/professional_role).
  const isFreelancer = profileCompany?.company_type === "freelancer";
  const showFeeSplit = type === "receita" && isFreelancer;

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(today);
  const [dateTo, setDateTo] = useState<Date | undefined>(addDays(today, 30));
  const [openDialog, setOpenDialog] = useState(false);
  const [viewingAttachment, setViewingAttachment] = useState<{
    url: string;
    type: string | null;
  } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [editingFeeSplit, setEditingFeeSplit] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    description: "",
    amount: "",
    client_id: "",
    process_id: "",
    professional_id: "",
    due_date: "",
    payment_date: "",
    frequency: "nenhum" as TransactionFrequency,
    attachment_file: null as File | null,
    status: "aberto" as const,
    payment_method: "" as PaymentMethod,
    expense_category: "",
    custom_description: "",
    fee_split_enabled: false,
    fee_split: [] as Array<{ professional_id: string; percentage: number }>,
  });

  const { data: transactions, isLoading } = useFinancialTransactions(type);
  const { data: clientes } = useClientsForSelect();
  const { data: profissionais } = useProfessionalsForSelect();
  const { data: processosForClient } = useProcessesForClient(form.client_id || null);
  const { data: feeSplitsForEdit } = useTransactionFeeSplit(editingFeeSplit);
  const deleteFeeSplitMutation = useDeleteTransactionFeeSplit();
  const createMutation = useCreateTransaction();
  const deleteMutation = useDeleteTransaction();
  const markAsReceivedMutation = useMarkAsReceived();
  const markAsPaidMutation = useMarkAsPaid();

  // Helper to get today's date as string (for expired check) - must be before stats
  const getTodayString = () => new Date().toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const today = getTodayString();

    // Apply date filter to transactions
    const filteredByDate = (transactions ?? []).filter((t) => {
      if (!t.due_date) return false;
      const due = parseISO(t.due_date);
      if (dateFrom && due < dateFrom) return false;
      if (dateTo && due > dateTo) return false;
      return true;
    });

    if (type === "receita") {
      const recebidos = filteredByDate
        .filter((t) => t.status === "recebido")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const vencidos = filteredByDate
        .filter((t) => t.status === "aberto" && t.due_date < today)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const abertos = filteredByDate
        .filter((t) => t.status === "aberto" && t.due_date >= today)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        recebidos,
        despesas: 0,
        vencidos,
        abertos,
        total: recebidos + abertos,
      };
    } else {
      const pagos = filteredByDate
        .filter((t) => t.status === "pago")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const vencidos = filteredByDate
        .filter((t) => t.status === "aberto" && t.due_date < today)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const abertos = filteredByDate
        .filter((t) => t.status === "aberto" && t.due_date >= today)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        recebidos: 0,
        despesas: pagos,
        vencidos,
        abertos,
        total: pagos + abertos,
      };
    }
  }, [transactions, type, dateFrom, dateTo]);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    return transactions.filter((t) => {
      if (search) {
        const s = search.toLowerCase();
        if (
          ![t.description, t.professional_name, t.attachment_url].some((v) =>
            v?.toLowerCase().includes(s),
          )
        ) {
          // For receitas, also check client_name
          if (type === "receita" && "client_name" in t) {
            const receita = t as Extract<typeof t, { client_name: string | null }>;
            if (receita.client_name?.toLowerCase().includes(s)) return true;
          }
          return false;
        }
      }

      if (dateFrom && t.due_date) {
        const due = parseISO(t.due_date);
        if (due < dateFrom) return false;
      }

      if (dateTo && t.due_date) {
        const due = parseISO(t.due_date);
        if (due > dateTo) return false;
      }

      return true;
    });
  }, [transactions, search, dateFrom, dateTo]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy", { locale: dateFnsPt });
    } catch {
      return dateStr;
    }
  };

  const feeSplitSummary = useMemo(() => {
    const amount = parseFloat(form.amount || "0");
    const totalPercentage = form.fee_split.reduce((sum, item) => sum + item.percentage, 0);
    const distributed = (amount * totalPercentage) / 100;
    const remaining = amount - distributed;
    return {
      totalPercentage,
      distributed,
      remaining,
      isValid: totalPercentage <= 100 && form.fee_split.every((item) => item.percentage > 0),
    };
  }, [form.amount, form.fee_split]);

  const paymentMethodOptions = useMemo(() => {
    if (companyPaymentMethods && companyPaymentMethods.length > 0) {
      return companyPaymentMethods
        .filter((m) => m.is_active)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map((m) => ({ value: m.method_key as PaymentMethod, label: m.method_label }));
    }
    return FALLBACK_PAYMENT_METHODS;
  }, [companyPaymentMethods]);

  const getPaymentMethodName = (method: string | null) => {
    if (!method) return "—";
    const found = paymentMethodOptions.find((m) => m.value === method);
    return found?.label || method;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
      if (validTypes.includes(file.type)) {
        setForm({ ...form, attachment_file: file });
      } else {
        toast.error("Tipo de arquivo inválido. Apenas PDF, JPG e PNG são permitidos.");
      }
    }
  };

  const handleSubmit = async () => {
    let finalDescription = form.description;

    // Para despesas, usar categoria ou descrição personalizada
    if (type === "despesa" && form.expense_category === "Outro") {
      finalDescription = form.custom_description;
    } else if (type === "despesa" && form.expense_category && !form.description) {
      finalDescription = form.expense_category;
    }

    // VALIDATION - Part 3
    if (!finalDescription.trim()) {
      toast.error("Preencha a descrição da transação");
      return;
    }
    if (!form.amount) {
      toast.error("Preencha o valor da transação");
      return;
    }
    if (!form.due_date) {
      toast.error("Preencha a data de vencimento");
      return;
    }
    if (type === "receita" && showFeeSplit && form.fee_split_enabled && !feeSplitSummary.isValid) {
      toast.error("A soma das percentagens não pode ultrapassar 100%.");
      return;
    }

    let attachmentUrl = "";
    let attachmentType: "pdf" | "image" | null = null;

    if (form.attachment_file) {
      try {
        const result = await uploadAttachment(form.attachment_file);
        attachmentUrl = result.url;
        attachmentType = result.type;
      } catch (e) {
        console.error("Upload error:", e);
        handleError(e, { operation: "UPLOAD", table: "attachments" });
        return;
      }
    }

    let client_name: string | null = null;
    let professional_name: string | null = null;

    if (form.client_id) {
      client_name = clientes?.find((c) => c.id === form.client_id)?.name || null;
    }

    // PARTE 1 - Professional conditional for despesas
    // Only include professional fields if category requires it
    const shouldIncludeProfessional =
      type === "despesa" && requiresProfessional(form.expense_category);

    if (shouldIncludeProfessional && form.professional_id) {
      professional_name = profissionais?.find((p) => p.id === form.professional_id)?.name || null;
    }

    createMutation.mutate({
      values: {
        description: finalDescription,
        amount: form.amount,
        client_id: form.client_id || null,
        client_name: client_name,
        process_id: form.process_id || null,
        professional_id: shouldIncludeProfessional ? form.professional_id || null : null,
        professional_name: shouldIncludeProfessional ? professional_name : null,
        due_date: form.due_date,
        payment_date: form.payment_date || null,
        frequency: form.frequency,
        attachment_url: attachmentUrl || null,
        attachment_type: attachmentType,
        status: form.status,
        payment_method: form.payment_method || null,
        fee_split_enabled: showFeeSplit ? form.fee_split_enabled : false,
        fee_split: showFeeSplit && form.fee_split_enabled ? form.fee_split : [],
      },
      type,
      expense_category: type === "despesa" ? form.expense_category : undefined,
    });

    setOpenDialog(false);
    resetForm();
  };

  const resetForm = () => {
    setForm({
      description: "",
      amount: "",
      client_id: "",
      process_id: "",
      professional_id: "",
      due_date: "",
      payment_date: "",
      frequency: "nenhum",
      attachment_file: null,
      status: "aberto",
      payment_method: "" as PaymentMethod,
      expense_category: "",
      custom_description: "",
      fee_split_enabled: false,
      fee_split: [],
    });
  };

  const handleMarkAsReceived = (id: string) => {
    markAsReceivedMutation.mutate(id);
  };

  const handleMarkAsPaid = (id: string) => {
    markAsPaidMutation.mutate(id);
  };

  const handleDelete = async (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleExport = () => {
    setIsExporting(true);

    try {
      // Get company data from the hook
      const companyData = company;

      // Sort transactions by due_date ASC
      const sortedTransactions = [...(filteredTransactions ?? [])].sort((a, b) => {
        const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
        return dateA - dateB;
      });

      // Get current date/time for report
      const now = new Date();
      const generationDate = format(now, "dd/MM/yyyy", { locale: dateFnsPt });
      const generationTime = format(now, "HH:mm", { locale: dateFnsPt });

      // Report title and type
      const reportTitle = "RELATÓRIO FINANCEIRO";
      const reportSubtitle = type === "receita" ? "Recebimentos" : "Despesas";

      // Calculate summary values
      const totalRecords = sortedTransactions.length;
      const totalPaid = type === "receita" ? stats.recebidos : stats.despesas;
      const totalPending = stats.abertos - stats.vencidos;
      const totalExpired = stats.vencidos;

      // Create PDF
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Add company header
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      if (companyData?.nome) {
        doc.text(companyData.nome, 14, 20);
      }

      doc.setFontSize(14);
      doc.text(reportTitle, 14, 30);

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(reportSubtitle, 14, 38);

      // Date and time
      doc.setFontSize(9);
      doc.text(`Data de geração: ${generationDate}`, 14, 45);
      doc.text(`Hora de geração: ${generationTime}`, 14, 50);

      // Period filter
      const periodText = `Período: ${dateFrom ? format(dateFrom, "dd/MM/yyyy") : "—"} a ${dateTo ? format(dateTo, "dd/MM/yyyy") : "—"}`;
      doc.text(periodText, 14, 55);

      // Summary section
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("RESUMO EXECUTIVO", 14, 65);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const summaryY = 72;
      const lineHeight = 5;

      if (type === "receita") {
        doc.text(`Total Recebido: ${formatCurrency(totalPaid)}`, 14, summaryY);
        doc.text(`Total Pendente: ${formatCurrency(totalPending)}`, 14, summaryY + lineHeight);
        doc.text(`Total Vencido: ${formatCurrency(totalExpired)}`, 14, summaryY + lineHeight * 2);
      } else {
        doc.text(`Total Pago: ${formatCurrency(totalPaid)}`, 14, summaryY);
        doc.text(`Total a Pagar: ${formatCurrency(totalPending)}`, 14, summaryY + lineHeight);
        doc.text(`Total Vencido: ${formatCurrency(totalExpired)}`, 14, summaryY + lineHeight * 2);
      }
      doc.text(`Quantidade de Registros: ${totalRecords}`, 14, summaryY + lineHeight * 3);

      // Table headers and data
      const tableColumn = [
        "Descrição",
        "Valor",
        type === "receita" ? "Cliente" : "Profissional",
        "Vencimento",
        "Pagamento",
        "Status",
        "Forma Pagamento",
      ];

      const tableRows = sortedTransactions.map((t) => {
        const todayStr = getTodayString();
        let statusText = t.status.charAt(0).toUpperCase() + t.status.slice(1);
        if (t.status === "aberto" && t.due_date < todayStr) {
          statusText = "Vencido";
        }
        return [
          t.description,
          formatCurrency(Number(t.amount)),
          type === "receita" && "client_name" in t
            ? (t as Extract<typeof t, { client_name: string | null }>).client_name || "—"
            : t.professional_name || "—",
          formatDate(t.due_date),
          formatDate(t.payment_date),
          statusText,
          getPaymentMethodName(t.payment_method),
        ];
      });

      // Add table
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 85,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [63, 81, 181],
          textColor: 255,
          fontSize: 9,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [245, 245, 250],
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 20, halign: "right" },
          2: { cellWidth: 25 },
          3: { cellWidth: 20, halign: "center" },
          4: { cellWidth: 20, halign: "center" },
          5: { cellWidth: 22, halign: "center" },
          6: { cellWidth: 28 },
        },
        didDrawPage: (data) => {
          // Footer with page number
          const pageNumber = doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(128);
          doc.text(
            "Documento gerado automaticamente pelo sistema Lunar Real Estate",
            14,
            doc.internal.pageSize.height - 10,
          );
          doc.text(
            `Página ${data.pageNumber} de ${pageNumber}`,
            doc.internal.pageSize.width - 30,
            doc.internal.pageSize.height - 10,
          );
        },
      });

      // Save PDF
      const todayForFilename = format(now, "yyyy-MM-dd");
      const filename =
        type === "receita"
          ? `relatorio-recebimentos-${todayForFilename}.pdf`
          : `relatorio-despesas-${todayForFilename}.pdf`;

      doc.save(filename);
    } catch (error) {
      console.error("Erro ao gerar relatório PDF:", error);
      toast.error("Erro ao gerar relatório PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* TÍTULO */}
      <header>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Adicionar Conta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nova Conta</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4 lg:grid-cols-2">
                  {/* DESPESAS - CATEGORIA */}
                  {type === "despesa" && (
                    <div className="space-y-1.5">
                      <Label>Categoria da Despesa</Label>
                      <Select
                        value={form.expense_category}
                        onValueChange={(v) => setForm({ ...form, expense_category: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {type === "despesa" && form.expense_category === "Outro" && (
                    <div className="space-y-1.5">
                      <Label>Descrição Personalizada</Label>
                      <Input
                        value={form.custom_description}
                        onChange={(e) => setForm({ ...form, custom_description: e.target.value })}
                        placeholder="Digite a descrição da despesa"
                      />
                    </div>
                  )}

                  {/* RECEITAS - DESCRICAO LIVRE */}
                  {type === "receita" && (
                    <div className="space-y-1.5">
                      <Label>{t("description")}</Label>
                      <Input
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Ex: Aluguel - Apartamento A"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label>{t("amount")}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>

                   {/* PROFISSIONAL - CONDICIONAL PARA DESPESAS */}
                   {type === "despesa" && (
                     <div className="space-y-1.5">
                       <Label>Profissional (Opcional)</Label>
                       <Select
                         value={form.professional_id}
                         onValueChange={(v) => setForm({ ...form, professional_id: v })}
                       >
                         <SelectTrigger>
                           <SelectValue placeholder="Selecione um profissional" />
                         </SelectTrigger>
                         <SelectContent>
                           {(profissionais ?? []).map((item) => (
                             <SelectItem key={item.id} value={item.id}>
                               {item.name}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
                   )}

                   <div className="space-y-1.5">
                     <Label>{t("client")}</Label>
                     <Select
                       value={form.client_id}
                       onValueChange={(v) => setForm({ ...form, client_id: v, process_id: "" })}
                     >
                       <SelectTrigger>
                         <SelectValue placeholder="Selecione um cliente" />
                       </SelectTrigger>
                       <SelectContent>
                         {(clientes ?? []).map((item) => (
                           <SelectItem key={item.id} value={item.id}>
                             {item.name}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>

                   {form.client_id && (
                     <div className="space-y-1.5">
                       <Label>{t("process")}</Label>
                       <Select
                         value={form.process_id}
                         onValueChange={(v) => setForm({ ...form, process_id: v })}
                       >
                         <SelectTrigger>
                           <SelectValue placeholder="Selecione um processo" />
                         </SelectTrigger>
                         <SelectContent>
                           {(processosForClient ?? []).map((item) => (
                             <SelectItem key={item.id} value={item.id}>
                               {item.numero} - {item.tipo}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
                   )}

                  {type === "receita" && showFeeSplit && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label>Divisão de Honorários</Label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={form.fee_split_enabled}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                fee_split_enabled: e.target.checked,
                                fee_split: e.target.checked
                                  ? form.fee_split.length > 0
                                    ? form.fee_split
                                    : [{ professional_id: "", percentage: 0 }]
                                  : [],
                              })
                            }
                            className="rounded border-input"
                          />
                          {form.fee_split_enabled ? "ON" : "OFF"}
                        </label>
                      </div>
                      {form.fee_split_enabled && (
                        <div className="space-y-3 rounded-lg border border-border p-3">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-muted-foreground">
                              Nº de colaboradores
                            </label>
                            <Input
                              type="number"
                              min={1}
                              max={20}
                              value={form.fee_split.length || ""}
                              onChange={(e) => {
                                const count = Math.max(
                                  1,
                                  Math.min(20, parseInt(e.target.value || "1")),
                                );
                                setForm({
                                  ...form,
                                  fee_split: Array.from({ length: count }, () => ({
                                    professional_id: "",
                                    percentage: 0,
                                  })),
                                });
                              }}
                              className="h-8 w-20"
                            />
                          </div>

                          {form.fee_split.map((split, index) => (
                            <div
                              key={index}
                              className="grid grid-cols-[1fr_120px_40px] gap-2 items-end"
                            >
                              <div className="space-y-1">
                                <Label className="text-xs">Colaborador {index + 1}</Label>
                                <Select
                                  value={split.professional_id}
                                  onValueChange={(v) => {
                                    const newFeeSplit = [...form.fee_split];
                                    newFeeSplit[index] = { ...split, professional_id: v };
                                    setForm({ ...form, fee_split: newFeeSplit });
                                  }}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Selecionar" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(profissionais ?? [])
                                      .filter(
                                        (p) =>
                                          p.id === split.professional_id ||
                                          !form.fee_split.some((s) => s.professional_id === p.id),
                                      )
                                      .map((item) => (
                                        <SelectItem key={item.id} value={item.id}>
                                          {item.name}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Percentagem (%)</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={split.percentage || ""}
                                  onChange={(e) => {
                                    const newFeeSplit = [...form.fee_split];
                                    newFeeSplit[index] = {
                                      ...split,
                                      percentage: Math.max(
                                        0,
                                        Math.min(100, parseFloat(e.target.value || "0")),
                                      ),
                                    };
                                    setForm({ ...form, fee_split: newFeeSplit });
                                  }}
                                  className="h-8"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => {
                                  const newFeeSplit = form.fee_split.filter((_, i) => i !== index);
                                  setForm({ ...form, fee_split: newFeeSplit });
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}

                          <div className="space-y-1 pt-2 border-t border-border">
                            <p className="text-xs font-medium">Resumo Financeiro</p>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <p className="text-muted-foreground">Valor Total</p>
                                <p className="font-semibold">
                                  {formatCurrency(parseFloat(form.amount || "0"))}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Distribuído</p>
                                <p
                                  className={cn(
                                    "font-semibold",
                                    feeSplitSummary.totalPercentage > 100 && "text-destructive",
                                  )}
                                >
                                  {formatCurrency(feeSplitSummary.distributed)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Escritório</p>
                                <p className="font-semibold">
                                  {formatCurrency(feeSplitSummary.remaining)}
                                </p>
                              </div>
                            </div>
                            {!feeSplitSummary.isValid && (
                              <p className="text-xs text-destructive">
                                A soma das percentagens não pode ultrapassar 100%.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label>Forma de Pagamento</Label>
                    <Select
                      value={form.payment_method}
                      onValueChange={(v) =>
                        setForm({ ...form, payment_method: v as PaymentMethod })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione forma de pagamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethodOptions.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* UPLOAD VISUAL */}
                  <div className="space-y-1.5">
                    <Label>Anexo</Label>
                    <div
                      className={cn(
                        "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors",
                        form.attachment_file ? "border-success" : "border-border",
                      )}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      {form.attachment_file ? (
                        <div className="flex items-center justify-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-success" />
                          <span className="truncate">{form.attachment_file.name}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
                          <Upload className="h-5 w-5" />
                          <span>Clique ou arraste arquivos aqui</span>
                          <span className="text-xs">PDF, JPG, PNG, JPEG</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Data de Vencimento</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !form.due_date && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                            {form.due_date ? formatDate(form.due_date) : "Selecionar data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={form.due_date ? parseISO(form.due_date) : undefined}
                            onSelect={(d) =>
                              setForm({ ...form, due_date: d ? toLocalDateString(d) : "" })
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Data de Pagamento</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !form.payment_date && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                            {form.payment_date ? formatDate(form.payment_date) : "Selecionar data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={form.payment_date ? parseISO(form.payment_date) : undefined}
                            onSelect={(d) =>
                              setForm({
                                ...form,
                                payment_date: d ? toLocalDateString(d) : "",
                              })
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Frequência</Label>
                    <Select
                      value={form.frequency}
                      onValueChange={(v) =>
                        setForm({ ...form, frequency: v as TransactionFrequency })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setOpenDialog(false)}>
                      {t("cancel")}
                    </Button>
                    <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                      {createMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <Check className="mr-2 h-4 w-4" />
                      {t("save")}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              onClick={handleExport}
              className="gap-1.5"
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isExporting ? "Gerando relatório..." : "Exportar Relatório"}
            </Button>
          </div>
        </div>
      </header>

      {/* FILTROS - NO TOPO */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Data inicial"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy") : "Data final"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={
                type === "receita"
                  ? "Buscar por cliente ou descrição..."
                  : "Buscar por profissional ou descrição..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </Card>

      {/* CARDS DE ESTATÍSTICAS */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardSimple
          label={type === "receita" ? "Total a Receber" : "Total a Pagar"}
          value={formatCurrency(stats.abertos)}
          accent="primary"
        />
        <StatCardSimple
          label={type === "receita" ? "Recebido" : "Pago"}
          value={formatCurrency(stats.recebidos || stats.despesas)}
          accent="success"
        />
        <StatCardSimple
          label="Vencidos"
          value={formatCurrency(stats.vencidos)}
          accent="destructive"
        />
        <StatCardSimple
          label="Em Aberto"
          value={formatCurrency(stats.abertos - stats.vencidos)}
          accent="warning"
        />
      </section>

      {/* TABELA */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (filteredTransactions ?? []).length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Nenhuma transação encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead className="bg-muted/30">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">{t("description")}</th>
                  <th className="px-4 py-3 font-medium">{t("amount")}</th>
                  <th className="px-4 py-3 font-medium">
                    {type === "receita" ? t("client") : t("professional")}
                  </th>
                  {type === "receita" && showFeeSplit && (
                    <th className="px-4 py-3 font-medium">Colaboradores</th>
                  )}
                  <th className="px-4 py-3 font-medium">Vencimento</th>
                  <th className="px-4 py-3 font-medium">Pagamento</th>
                  <th className="px-4 py-3 font-medium">Frequência</th>
                  <th className="px-4 py-3 font-medium">Anexo</th>
                  <th className="px-4 py-3 font-medium">Forma Pagamento</th>
                  <th className="px-4 py-3 font-medium">{t("status")}</th>
                  <th className="px-4 py-3 font-medium w-24">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => {
                  const todayStr = getTodayString();
                  const isVencido = t.status === "aberto" && t.due_date < todayStr;
                  return (
                    <tr
                      key={t.id}
                      className="border-t border-border/60 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">{t.description}</td>
                      <td className="px-4 py-3">{formatCurrency(Number(t.amount))}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {type === "receita" && "client_name" in t
                          ? (t as Extract<typeof t, { client_name: string | null }>).client_name ||
                            "—"
                          : t.professional_name || "—"}
                      </td>
                      {type === "receita" && showFeeSplit && (
                        <td className="px-4 py-3">
                          {(t as Extract<typeof t, { fee_split_enabled?: boolean }>)
                            .fee_split_enabled ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingFeeSplit(t.id)}
                              className="h-7 px-2 gap-1"
                            >
                              <Users className="h-3.5 w-3.5" />
                              <span className="text-xs">{t("yes")}</span>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(t.due_date)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(t.payment_date)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{t.frequency || "—"}</td>
                      <td className="px-4 py-3">
                        {t.attachment_url ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setViewingAttachment({
                                url: t.attachment_url!,
                                type: t.attachment_type,
                              })
                            }
                            className="h-7 px-2"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {getPaymentMethodName(t.payment_method)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={STATUS_BADGE[isVencido ? "vencido" : t.status]}>
                          {isVencido
                            ? t("overdue")
                            : t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-1">
                          {t.status === "aberto" && (
                            <Button
                              size="sm"
                              onClick={() =>
                                type === "receita"
                                  ? handleMarkAsReceived(t.id)
                                  : handleMarkAsPaid(t.id)
                              }
                              className="h-7 px-2 bg-success hover:bg-success/90"
                            >
                              {type === "receita" ? "Receber Valor" : "Pagar"}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(t.id)}
                            className="h-7 w-7 p-0 text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {viewingAttachment && (
        <Dialog open={!!viewingAttachment} onOpenChange={() => setViewingAttachment(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Visualizar Anexo</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {viewingAttachment.type === "pdf" ? (
                <iframe src={viewingAttachment.url} className="w-full h-[600px] border rounded" />
              ) : (
                <img
                  src={viewingAttachment.url}
                  alt="Anexo"
                  className="max-w-full max-h-[600px] object-contain mx-auto"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {editingFeeSplit && (
        <Dialog open={!!editingFeeSplit} onOpenChange={() => setEditingFeeSplit(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Divisão de Honorários</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {(feeSplitsForEdit ?? []).map((split) => (
                <div
                  key={split.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="font-medium">{split.profissional_nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {split.percentagem}% — {formatCurrency(split.valor_calculado || 0)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => {
                      setConfirmDeleteId(split.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("finance.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("finance.confirmDelete")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDeleteId(null)}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmDeleteId) return;
                try {
                  await deleteMutation.mutateAsync({ id: confirmDeleteId, type });
                } catch {
                  // handled
                } finally {
                  setConfirmDeleteId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddFeeSplitForm({
  recebimentoId,
  profissionais,
  onAdded,
}: {
  recebimentoId: string;
  profissionais: Array<{ id: string; name: string }>;
  onAdded: () => void;
}) {
  const [professionalId, setProfessionalId] = useState("");
  const [percentage, setPercentage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleError = useSupabaseErrorHandler();
  const { t } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!professionalId || !percentage) return;

    setIsSubmitting(true);
    try {
      const { data: transaction } = await supabase
        .from("financial_transactions")
        .select("amount, company_id")
        .eq("id", recebimentoId)
        .single();

      if (!transaction) throw new Error("Transação não encontrada");
      if (!transaction.company_id) throw new Error("Transação sem empresa associada");

      const amount = Number(transaction.amount);
      const perc = parseFloat(percentage);
      const valorCalculado = (amount * perc) / 100;

      const { error } = await supabase.from("financial_transactions").insert({
        company_id: transaction.company_id,
        process_id: recebimentoId,
        professional_id: professionalId,
        amount: valorCalculado,
        description: `Fee split - ${perc}%`,
        transaction_type: "income",
        status: "pending",
        due_date: new Date().toISOString().split('T')[0],
        fee_split_enabled: true,
      });

      if (error) throw error;

      setProfessionalId("");
      setPercentage("");
      onAdded();
    } catch (e) {
      console.error(e);
      handleError(e, { operation: "INSERT", table: "financial_transactions" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex-1 space-y-1">
        <Label className="text-xs">Profissional</Label>
        <Select value={professionalId} onValueChange={setProfessionalId}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Selecionar" />
          </SelectTrigger>
          <SelectContent>
            {profissionais.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-24 space-y-1">
        <Label className="text-xs">%</Label>
        <Input
          type="number"
          min={0}
          max={100}
          value={percentage}
          onChange={(e) => setPercentage(e.target.value)}
          className="h-8"
        />
      </div>
      <Button type="submit" size="sm" disabled={isSubmitting || !professionalId || !percentage}>
        {isSubmitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
        {t("add")}
      </Button>
    </form>
  );
}

function StatCardSimple({
  label,
  value,
  accent = "primary",
}: {
  label: string;
  value: string;
  accent?: "primary" | "success" | "warning" | "info" | "destructive";
}) {
  const accentMap = {
    primary: "text-primary bg-primary/10 border-primary/25",
    success: "text-success bg-success/10 border-success/25",
    warning: "text-warning bg-warning/10 border-warning/25",
    info: "text-info bg-info/10 border-info/25",
    destructive: "text-destructive bg-destructive/10 border-destructive/25",
  } as const;

  return (
    <div className={cn("glass relative overflow-hidden rounded-2xl border p-5", accentMap[accent])}>
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "mt-2 text-2xl font-semibold tracking-tight",
            accent === "success"
              ? "text-success"
              : accent === "warning"
                ? "text-warning"
                : accent === "destructive"
                  ? "text-destructive"
                  : "text-foreground",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export { TransactionsTable as FinancialTransactionsTable };
