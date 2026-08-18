import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ProtectedRoute, SuperAdminRedirect } from "@/components/protected-route";
import { PageHeader } from "@/components/page-header";
import { AppSidebar } from "@/components/app-sidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n, CURRENCIES, TIMEZONES, DATE_FORMATS } from "@/hooks/use-i18n";
import { useSupabaseErrorHandler } from "@/lib/supabase-error-handler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadCompanyAsset } from "@/lib/company";
import type { Language } from "@/lib/i18n";

export const Route = createFileRoute("/empresa")({
  head: () => ({ meta: [{ title: "Empresa" }] }),
  component: () => (
    <ProtectedRoute>
      <SuperAdminRedirect>
        <EmpresaPage />
      </SuperAdminRedirect>
    </ProtectedRoute>
  ),
});

function EmpresaPage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const handleError = useSupabaseErrorHandler();

  const { data: company, isLoading } = useQuery({
    queryKey: ["company", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", profile.company_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      if (!company?.id) throw new Error("Company not found");
      const { error } = await supabase
        .from("companies")
        .update(updates as never)
        .eq("id", company.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["active-company"] });
      toast.success(t("success"));
    },
    onError: (e: Error) => handleError(e, { operation: "UPDATE", table: "companies" }),
  });

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    nuit: "",
    endereco: "",
    cidade: "",
    pais: "Mozambique",
    website: "",
    language: "pt" as Language,
    currency: "MZN",
    timezone: "Africa/Maputo",
    date_format: "dd/MM/yyyy",
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    if (company) {
      setFormData({
        nome: company.nome ?? "",
        email: company.email ?? "",
        telefone: company.telefone ?? "",
        nuit: company.nuit ?? "",
        endereco: company.endereco ?? "",
        cidade: company.cidade ?? "",
        pais: company.pais ?? "Mozambique",
        website: company.website ?? "",
        language: (company.language as Language) ?? "pt",
        currency: company.currency ?? "MZN",
        timezone: company.timezone ?? "Africa/Maputo",
        date_format: company.date_format ?? "dd/MM/yyyy",
      });
    }
  }, [company]);

  const handleSave = async () => {
    if (!logoFile) {
      updateMutation.mutate(formData as Record<string, unknown>);
      return;
    }

    try {
      const logoUrl = await uploadCompanyAsset(logoFile, "logo");
      updateMutation.mutate({ ...formData, logo_url: logoUrl } as Record<string, unknown>);
    } catch (err) {
      handleError(err, { operation: "UPLOAD", table: "company-assets" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />

      <main className="flex-1 overflow-auto">
        <PageHeader title={t("companySettings")} subtitle={company?.nome} />

        <div className="p-6 lg:p-8 space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t("companySettings")}</h2>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("companyName")}</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  disabled={updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("email")}</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("phone")}</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  disabled={updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("nuit")}</Label>
                <Input
                  value={formData.nuit}
                  onChange={(e) => setFormData({ ...formData, nuit: e.target.value })}
                  disabled={updateMutation.isPending}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>{t("address")}</Label>
                <Input
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  disabled={updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("city")}</Label>
                <Input
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  disabled={updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("country")}</Label>
                <Input
                  value={formData.pais}
                  onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
                  disabled={updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("website")}</Label>
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  disabled={updateMutation.isPending}
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t("selectCurrency")}</h2>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>{t("selectLanguage")}</Label>
                <Select
                  value={formData.language}
                  onValueChange={(v) => setFormData({ ...formData, language: v as Language })}
                  disabled={updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt">Português</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("selectCurrency")}</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(v) => setFormData({ ...formData, currency: v })}
                  disabled={updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("selectTimezone")}</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(v) => setFormData({ ...formData, timezone: v })}
                  disabled={updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("selectDateFormat")}</Label>
                <Select
                  value={formData.date_format}
                  onValueChange={(v) => setFormData({ ...formData, date_format: v })}
                  disabled={updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_FORMATS.map((df) => (
                      <SelectItem key={df.value} value={df.value}>
                        {df.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("uploadLogo")}</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  disabled={updateMutation.isPending}
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("save")}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
