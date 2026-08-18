import { useState, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/ui/date-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Upload, FileText, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { pt as dateFnsPt, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toLocalDateString } from "@/lib/utils";
import { useI18n, usePaymentMethods } from "@/hooks/use-i18n";
import {
  useProfessionalsForSelect,
  useCreateTransaction,
  uploadAttachment,
  type PaymentMethod,
} from "@/hooks/use-financial-transactions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const STANDARD_CATEGORIES = [
  "Salário",
  "Energia",
  "Água",
  "Internet",
  "Transporte",
  "Material de Escritório",
  "Marketing",
  "Equipamentos",
  "Custas Judiciais",
  "Honorários Externos",
  "Outros",
];

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpenseFormDialog({ open, onOpenChange }: ExpenseFormDialogProps) {
  const { t, language, dateFormat } = useI18n();
  const { data: companyPaymentMethods } = usePaymentMethods();
  const { profile, isSuperAdmin } = useAuth();
  const companyId = profile?.company_id ?? null;
  const locale = language === "en" ? enUS : dateFnsPt;

  const [categoryMode, setCategoryMode] = useState<"select" | "custom">("select");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dataDespesa, setDataDespesa] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("");
  const [observacoes, setObservacoes] = useState("");
  const [processoSearch, setProcessoSearch] = useState("");
  const [processoSelected, setProcessoSelected] = useState<string | null>(null);
  const [processoSelectedLabel, setProcessoSelectedLabel] = useState<string | null>(null);
  const [processoFocused, setProcessoFocused] = useState(false);
  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteSelected, setClienteSelected] = useState<string | null>(null);
  const [clienteSelectedLabel, setClienteSelectedLabel] = useState<string | null>(null);
  const [clienteFocused, setClienteFocused] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [unregisteredProfessional, setUnregisteredProfessional] = useState(false);
  const [unregisteredName, setUnregisteredName] = useState("");
  const [unregisteredCargo, setUnregisteredCargo] = useState("");
  const [unregisteredDesc, setUnregisteredDesc] = useState("");
  const [professionalSelected, setProfessionalSelected] = useState<string | null>(null);
  const [professionalSelectedLabel, setProfessionalSelectedLabel] = useState<string | null>(null);

  const paymentMethodOptions = useMemo(() => {
    if (companyPaymentMethods && companyPaymentMethods.length > 0) {
      return companyPaymentMethods
        .filter((m) => m.is_active)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map((m) => ({ value: m.method_key as PaymentMethod, label: m.method_label }));
    }
    return [
      { value: "dinheiro", label: t("finance.paymentMethods.cash") },
      { value: "transferencia", label: t("finance.paymentMethods.transfer") },
      { value: "mpesa", label: t("finance.paymentMethods.mpesa") },
      { value: "emola", label: t("finance.paymentMethods.emola") },
      { value: "cartao", label: t("finance.paymentMethods.card") },
      { value: "cheque", label: t("finance.paymentMethods.check") },
      { value: "outro", label: t("finance.paymentMethods.other") },
    ];
  }, [companyPaymentMethods, t]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const createMutation = useCreateTransaction();

  const selectedCategory = categoryMode === "custom" ? customCategory : category;
  const isSalary = selectedCategory === "Salário";

  const { data: profissionais = [] } = useProfessionalsForSelect();

  const { data: processosSearch = [] } = useQuery({
    queryKey: ["processos-busca-despesa", companyId, processoSearch],
    queryFn: async () => {
      if (!companyId) return [];

      let q = supabase
        .from("processos")
        .select("id, numero, cliente_nome, tipo")
        .eq("company_id", companyId);

      if (processoSearch) {
        q = q.or(`numero.ilike.%${processoSearch}%,cliente_nome.ilike.%${processoSearch}%`);
      }

      const { data, error } = await q.order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const { data: clientesSearch = [] } = useQuery({
    queryKey: ["clientes-busca-despesa", companyId, clienteSearch],
    queryFn: async () => {
      if (!companyId) return [];

      let q = supabase.from("clientes").select("id, nome").eq("company_id", companyId);

      if (clienteSearch) {
        q = q.ilike("nome", `%${clienteSearch}%`);
      }

      const { data, error } = await q.order("nome").limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return format(parseISO(dateStr), dateFormat, { locale });
    } catch {
      return dateStr;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
      if (validTypes.includes(file.type)) {
        setAttachmentFile(file);
      } else {
        toast.error(t("finance.expenses.invalidFileType"));
      }
    }
  };

  const resetForm = () => {
    setCategoryMode("select");
    setCategory("");
    setCustomCategory("");
    setDescription("");
    setAmount("");
    setDataDespesa(null);
    setPaymentMethod("" as PaymentMethod);
    setObservacoes("");
    setProcessoSearch("");
    setProcessoSelected(null);
    setProcessoSelectedLabel(null);
    setClienteSearch("");
    setClienteSelected(null);
    setClienteSelectedLabel(null);
    setAttachmentFile(null);
    setUnregisteredProfessional(false);
    setUnregisteredName("");
    setUnregisteredCargo("");
    setUnregisteredDesc("");
    setProfessionalSelected(null);
    setProfessionalSelectedLabel(null);
  };

  const handleSubmit = async () => {
    const finalCategory = categoryMode === "custom" ? customCategory : category;
    if (!finalCategory) {
      toast.error(t("finance.expenses.selectCategory"));
      return;
    }
    if (!description && !finalCategory) {
      toast.error(t("finance.expenses.fillDescription"));
      return;
    }
    if (!amount) {
      toast.error(t("finance.expenses.fillAmount"));
      return;
    }
    if (!dataDespesa) {
      toast.error(t("finance.expenses.fillDate"));
      return;
    }
    if (!paymentMethod) {
      toast.error(t("finance.expenses.selectPaymentMethod"));
      return;
    }

    let attachmentUrl = "";
    if (attachmentFile) {
      try {
        const result = await uploadAttachment(attachmentFile);
        attachmentUrl = result.url;
      } catch (e) {
        console.error(t("finance.expenses.uploadError"), e);
        toast.error(t("finance.expenses.uploadError"));
        return;
      }
    }

    const descricaoFinal = description || finalCategory;

    let professionalName: string | null = null;
    let professionalId: string | null = null;

    if (isSalary) {
      if (!unregisteredProfessional && professionalSelected) {
        const pro = profissionais?.find((p) => p.id === professionalSelected);
        professionalName = pro?.name || null;
        professionalId = professionalSelected || null;
      } else if (unregisteredProfessional) {
        professionalName = `${unregisteredName}${
          unregisteredCargo ? ` (${unregisteredCargo})` : ""
        }${unregisteredDesc ? ` - ${unregisteredDesc}` : ""}`;
        professionalId = null;
      }
    }

    if (!professionalId && profile?.id) {
      professionalId = profile.id;
      professionalName = profile.full_name || profile.email || null;
    }

    createMutation.mutate({
      values: {
        description: descricaoFinal,
        amount: amount,
        client_id: clienteSelected || null,
        client_name: clienteSelectedLabel || null,
        process_id: processoSelected || null,
        professional_id: professionalId,
        professional_name: professionalName,
        frequency: "nenhum",
        attachment_url: attachmentUrl || null,
        attachment_type: attachmentFile
          ? attachmentFile.type === "application/pdf"
            ? "pdf"
            : "image"
          : null,
        status: "aberto",
        payment_method: paymentMethod,
        expense_category: finalCategory,
        fee_split_enabled: false,
        fee_split: [],
      },
      type: "despesa",
      expense_category: finalCategory,
    });

    onOpenChange(false);
    resetForm();
  };

  const removeProcesso = () => {
    setProcessoSelected(null);
    setProcessoSelectedLabel(null);
    setProcessoSearch("");
  };

  const removeCliente = () => {
    setClienteSelected(null);
    setClienteSelectedLabel(null);
    setClienteSearch("");
  };

  const removeAttachment = () => {
    setAttachmentFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle>{t("finance.expenses.newExpense")}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2 lg:grid-cols-2">
          {/* Category - Flexible */}
          <div className="space-y-1.5">
            <Label>{t("finance.expenses.category")} *</Label>
            {categoryMode === "select" ? (
              <div className="space-y-2">
                <Select value={category} onValueChange={(v) => setCategory(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("finance.expenses.selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    {STANDARD_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => setCategoryMode("custom")}
                >
                  {t("finance.expenses.addCustomCategory")}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder={t("finance.expenses.customCategoryPlaceholder")}
                />
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => {
                    setCategoryMode("select");
                    setCustomCategory("");
                    setCategory("");
                  }}
                >
                  {t("finance.expenses.backToStandard")}
                </Button>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>{t("finance.expenses.description")} *</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("finance.expenses.descriptionPlaceholder")}
            />
          </div>

          {/* Value */}
          <div className="space-y-1.5">
            <Label>{t("finance.expenses.amount")} *</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Data */}
          <div className="space-y-1.5">
            <Label>{t("finance.expenses.date")} *</Label>
            <DateInput
              value={dataDespesa}
              onChange={(v) => setDataDespesa(v)}
              placeholder="DD/MM/AAAA"
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label>{t("finance.expenses.paymentMethod")} *</Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("finance.expenses.select")} />
              </SelectTrigger>
              <SelectContent>
                {paymentMethodOptions.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Salary Professional - Conditional */}
          {isSalary && (
            <div className="lg:col-span-2 space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <Label className="font-medium">{t("finance.expenses.professional")}</Label>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">{t("finance.expenses.unregisteredProfessional")}</Label>
                  <Switch
                    checked={unregisteredProfessional}
                    onCheckedChange={setUnregisteredProfessional}
                  />
                </div>
              </div>

              {!unregisteredProfessional ? (
                <div className="space-y-2">
                  <Select
                    value={professionalSelected ?? ""}
                    onValueChange={(v) => {
                      const label = profissionais?.find((p) => p.id === v)?.name ?? null;
                      setProfessionalSelected(v);
                      setProfessionalSelectedLabel(label);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("finance.expenses.selectProfessional")} />
                    </SelectTrigger>
                    <SelectContent>
                      {profissionais?.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {professionalSelectedLabel && (
                    <Badge variant="secondary" className="text-xs">
                      {professionalSelectedLabel}
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>{t("finance.expenses.name")} *</Label>
                    <Input
                      value={unregisteredName}
                      onChange={(e) => setUnregisteredName(e.target.value)}
                      placeholder={t("finance.expenses.namePlaceholder")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("finance.expenses.role")} *</Label>
                    <Input
                      value={unregisteredCargo}
                      onChange={(e) => setUnregisteredCargo(e.target.value)}
                      placeholder={t("finance.expenses.rolePlaceholder")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("finance.expenses.description")}</Label>
                    <Input
                      value={unregisteredDesc}
                      onChange={(e) => setUnregisteredDesc(e.target.value)}
                      placeholder={t("finance.expenses.descriptionShortPlaceholder")}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Processo Search */}
          <div className="space-y-1.5">
             <Label>{t("finance.expenses.linkProcess")} {t("optional")}</Label>
            <div className="relative">
              <Input
                value={processoSearch}
                onChange={(e) => setProcessoSearch(e.target.value)}
                placeholder={t("finance.expenses.processSearchPlaceholder")}
                className="pr-8"
                onFocus={() => setProcessoFocused(true)}
                onBlur={() => setTimeout(() => setProcessoFocused(false), 200)}
              />
              {processoSelected && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0"
                    onClick={removeProcesso}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            {processoFocused && processosSearch.length > 0 && !processoSelected && (
              <div className="max-h-40 overflow-y-auto border border-border rounded-md">
                {processosSearch.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProcessoSelected(p.id);
                      setProcessoSelectedLabel(`${p.numero} - ${p.tipo}`);
                      setProcessoSearch("");
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-accent"
                  >
                    <div className="font-medium">{p.numero}</div>
                    <div className="text-muted-foreground">
                      {p.cliente_nome} · {p.tipo}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {processoSelectedLabel && !processosSearch.length && (
              <Badge variant="secondary" className="text-xs">
                {processoSelectedLabel}
              </Badge>
            )}
          </div>

          {/* Cliente Search */}
          <div className="space-y-1.5">
             <Label>{t("finance.expenses.client")} {t("optional")}</Label>
            <div className="relative">
              <Input
                value={clienteSearch}
                onChange={(e) => setClienteSearch(e.target.value)}
                placeholder={t("finance.expenses.clientPlaceholder")}
                className="pr-8"
                onFocus={() => setClienteFocused(true)}
                onBlur={() => setTimeout(() => setClienteFocused(false), 200)}
              />
              {clienteSelected && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={removeCliente}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            {clienteFocused && clientesSearch.length > 0 && !clienteSelected && (
              <div className="max-h-40 overflow-y-auto border border-border rounded-md">
                {clientesSearch.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setClienteSelected(c.id);
                      setClienteSelectedLabel(c.nome);
                      setClienteSearch("");
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-accent"
                  >
                    {c.nome}
                  </button>
                ))}
              </div>
            )}
            {clienteSelectedLabel && !clientesSearch.length && (
              <Badge variant="secondary" className="text-xs">
                {clienteSelectedLabel}
              </Badge>
            )}
          </div>

          {/* Observations */}
          <div className="lg:col-span-2 space-y-1.5">
            <Label>{t("finance.expenses.observations")}</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder={t("finance.expenses.observationsPlaceholder")}
              rows={3}
            />
          </div>

          {/* Upload */}
          <div className="space-y-1.5">
             <Label>{t("finance.expenses.attachments")} {t("optional")}</Label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors",
                attachmentFile ? "border-success" : "border-border",
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
              {attachmentFile ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-success" />
                  <span className="truncate">{attachmentFile.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAttachment();
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
                  <Upload className="h-5 w-5" />
                  <span>{t("finance.expenses.uploadHint")}</span>
                  <span className="text-xs">PDF, JPG, PNG, JPEG</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending && <span className="mr-2 animate-spin">↻</span>}
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
