import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useSupabaseErrorHandler } from "@/lib/supabase-error-handler";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import type { Database } from "@/integrations/supabase/types";

type Cliente = Database["public"]["Tables"]["clientes"]["Row"];

const DOCUMENT_TYPES = ["bi", "passaporte", "dire", "outro"] as const;

interface ClienteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: Cliente | null;
  onSaved: () => void;
}

export function ClienteFormDialog({
  open,
  onOpenChange,
  cliente,
  onSaved,
}: ClienteFormDialogProps) {
  const { t } = useI18n();
  const { profile, isSuperAdmin } = useAuth();
  const companyId = isSuperAdmin ? null : (profile?.company_id ?? null);
  const handleError = useSupabaseErrorHandler();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{
    nome: string;
    contacto: string;
    email: string;
    tipo_documento: (typeof DOCUMENT_TYPES)[number];
    documento: string;
    data_emissao: string | null;
    local_emissao: string | null;
    data_validade: string | null;
    nacionalidade: string | null;
    naturalidade: string | null;
    estado_civil: string | null;
    data_nascimento: string | null;
    endereco: string | null;
    cidade: string | null;
    pais: string | null;
    profissao: string | null;
    observacoes: string | null;
  }>({
    nome: "",
    contacto: "",
    email: "",
    tipo_documento: "bi",
    documento: "",
    data_emissao: null,
    local_emissao: null,
    data_validade: null,
    nacionalidade: null,
    naturalidade: null,
    estado_civil: null,
    data_nascimento: null,
    endereco: null,
    cidade: null,
    pais: null,
    profissao: null,
    observacoes: null,
  });

  useEffect(() => {
    if (!open) return;
    if (cliente) {
      setForm({
        nome: cliente.nome ?? "",
        contacto: cliente.contacto ?? "",
        email: cliente.email ?? "",
        tipo_documento: (DOCUMENT_TYPES as readonly string[]).includes(
          cliente.tipo_documento ?? "",
        )
          ? (cliente.tipo_documento as (typeof DOCUMENT_TYPES)[number])
          : "bi",
        documento: cliente.documento ?? "",
        data_emissao: cliente.data_emissao ?? null,
        local_emissao: cliente.local_emissao ?? null,
        data_validade: cliente.data_validade ?? null,
        nacionalidade: cliente.nacionalidade ?? null,
        naturalidade: cliente.naturalidade ?? null,
        estado_civil: cliente.estado_civil ?? null,
        data_nascimento: cliente.data_nascimento ?? null,
        endereco: cliente.endereco ?? null,
        cidade: cliente.cidade ?? null,
        pais: cliente.pais ?? null,
        profissao: cliente.profissao ?? null,
        observacoes: cliente.observacoes ?? null,
      });
    } else {
      setForm({
        nome: "",
        contacto: "",
        email: "",
        tipo_documento: "bi",
        documento: "",
        data_emissao: null,
        local_emissao: null,
        data_validade: null,
        nacionalidade: null,
        naturalidade: null,
        estado_civil: null,
        data_nascimento: null,
        endereco: null,
        cidade: null,
        pais: null,
        profissao: null,
        observacoes: null,
      });
    }
  }, [open, cliente]);

  const set = (key: keyof typeof form, value: string | null) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    if (!form.nome.trim()) {
      toast.error(t("clients.validation.nameRequired"));
      return false;
    }
    if (!form.contacto.trim()) {
      toast.error(t("clients.validation.phoneRequired"));
      return false;
    }
    if (!form.documento.trim()) {
      toast.error(t("clients.validation.documentRequired"));
      return false;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error(t("clients.validation.invalidEmail"));
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!companyId) {
      toast.error(t("error"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        contacto: form.contacto.trim(),
        email: form.email.trim() || null,
        tipo_documento: form.tipo_documento,
        documento: form.documento.trim(),
        data_emissao: form.data_emissao,
        local_emissao: form.local_emissao || null,
        data_validade: form.data_validade,
        nacionalidade: form.nacionalidade || null,
        naturalidade: form.naturalidade || null,
        estado_civil: form.estado_civil || null,
        data_nascimento: form.data_nascimento,
        endereco: form.endereco || null,
        cidade: form.cidade || null,
        pais: form.pais || null,
        profissao: form.profissao || null,
        observacoes: form.observacoes || null,
        company_id: companyId,
      };

      if (cliente) {
        const { error } = await supabase
          .from("clientes")
          .update(payload)
          .eq("id", cliente.id);
        if (error) throw error;
        toast.success(t("clients.toasts.updated"));
      } else {
        const { error } = await supabase.from("clientes").insert({
          ...payload,
          created_by: profile?.id ?? null,
        });
        if (error) throw error;
        toast.success(t("clients.toasts.created"));
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error("[ClienteFormDialog] save error", err);
      handleError(err, { operation: cliente ? "UPDATE" : "INSERT", table: "clientes" });
    } finally {
      setSaving(false);
    }
  };

  const isEdit = !!cliente;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("clients.editClient") : t("clients.addClient")}</DialogTitle>
          <DialogDescription>{t("clients.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-2">
          {/* SEÇÃO 1 - Informações Básicas */}
          <div className="grid gap-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2">
              {t("clients.sections.basicInfo", { defaultValue: "Informações Básicas" })}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("clients.form.fullName")} *</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => set("nome", e.target.value)}
                  placeholder={t("clients.form.fullName")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("clients.form.phone")} *</Label>
                <Input
                  value={form.contacto}
                  onChange={(e) => set("contacto", e.target.value)}
                  placeholder={t("clients.form.phone")}
                />
              </div>
              <div className="space-y-1.5 lg:col-span-2">
                <Label className="text-xs text-muted-foreground">{t("clients.form.email")}</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder={t("clients.form.email")}
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 2 - Documento de Identificação */}
          <div className="grid gap-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2">
              {t("clients.sections.document", { defaultValue: "Documento de Identificação" })}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("clients.form.documentType")} *
                </Label>
                <div className="flex flex-wrap gap-2">
                  {DOCUMENT_TYPES.map((dt) => (
                    <button
                      key={dt}
                      type="button"
                      onClick={() => set("tipo_documento", dt)}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                        form.tipo_documento === dt
                          ? "border-[#c8a24a] bg-[#c8a24a]/10 text-[#c8a24a]"
                          : "border-border hover:bg-accent",
                      )}
                    >
                      {t(`clients.documentType.${dt}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("clients.form.documentNumber")} *
                </Label>
                <Input
                  value={form.documento}
                  onChange={(e) => set("documento", e.target.value)}
                  placeholder={t("clients.form.documentNumber")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("clients.form.issueDate")}</Label>
                <DateInput
                  value={form.data_emissao}
                  onChange={(v) => set("data_emissao", v)}
                  placeholder="DD/MM/AAAA"
                  showCalendar={false}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("clients.form.issuePlace")}</Label>
                <Input
                  value={form.local_emissao}
                  onChange={(e) => set("local_emissao", e.target.value)}
                  placeholder={t("clients.form.issuePlace")}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("clients.form.expiryDate")}</Label>
                <DateInput
                  value={form.data_validade}
                  onChange={(v) => set("data_validade", v)}
                  placeholder="DD/MM/AAAA"
                  showCalendar={false}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("clients.form.nationality")}</Label>
                <Input
                  value={form.nacionalidade}
                  onChange={(e) => set("nacionalidade", e.target.value)}
                  placeholder={t("clients.form.nationality")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("clients.form.naturality")}</Label>
                <Input
                  value={form.naturalidade}
                  onChange={(e) => set("naturalidade", e.target.value)}
                  placeholder={t("clients.form.naturality")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("clients.form.maritalStatus")}</Label>
                <Input
                  value={form.estado_civil}
                  onChange={(e) => set("estado_civil", e.target.value)}
                  placeholder={t("clients.form.maritalStatus")}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("clients.form.birthDate")}</Label>
                <DateInput
                  value={form.data_nascimento}
                  onChange={(v) => set("data_nascimento", v)}
                  placeholder="DD/MM/AAAA"
                  showCalendar={false}
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 3 - Endereço */}
          <div className="grid gap-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2">
              {t("clients.sections.address", { defaultValue: "Endereço" })}
            </h3>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("clients.form.address")} *</Label>
              <Input
                value={form.endereco}
                onChange={(e) => set("endereco", e.target.value)}
                placeholder={t("clients.form.address")}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("clients.form.city")}</Label>
                <Input
                  value={form.cidade}
                  onChange={(e) => set("cidade", e.target.value)}
                  placeholder={t("clients.form.city")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("clients.form.country")}</Label>
                <Input
                  value={form.pais}
                  onChange={(e) => set("pais", e.target.value)}
                  placeholder={t("clients.form.country")}
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 4 - Informações Complementares */}
          <div className="grid gap-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2">
              {t("clients.sections.additional", { defaultValue: "Informações Complementares" })}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("clients.form.profession")}</Label>
                <Input
                  value={form.profissao}
                  onChange={(e) => set("profissao", e.target.value)}
                  placeholder={t("clients.form.profession")}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("clients.form.observations")}</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) => set("observacoes", e.target.value)}
                rows={3}
                placeholder={t("clients.form.observations")}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t("loading") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
