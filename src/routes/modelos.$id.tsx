import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ProtectedRoute, SuperAdminRedirect } from "@/components/protected-route";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/hooks/use-i18n";
import { useContractTemplates, useUpdateContractTemplate, type ContractTemplate } from "@/hooks/use-contract-templates";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TipTapEditor } from "@/components/tiptap-editor";
import { htmlToChips, chipsToHtml } from "@/lib/contracts";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/modelos/$id")({
  head: () => ({ meta: [{ title: "Editar Modelo" }] }),
  component: () => (
    <ProtectedRoute>
      <SuperAdminRedirect>
        <ModeloEditPage />
      </SuperAdminRedirect>
    </ProtectedRoute>
  ),
});

function ModeloEditPage() {
  const { t } = useI18n();
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useContractTemplates();
  const updateTemplate = useUpdateContractTemplate();

  const template = templates.find((m) => m.id === id);

  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [category, setCategory] = useState("Outros");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [htmlContent, setHtmlContent] = useState("");
  const [saving, setSaving] = useState(false);

  // Load template data once it becomes available.
  useEffect(() => {
    if (template && template.id !== loadedId) {
      setLoadedId(template.id);
      setNome(template.nome);
      setCategory(template.category);
      setDescription(template.description || "");
      setStatus(template.status);
      setHtmlContent(htmlToChips(template.html_content));
    }
  }, [template, loadedId]);

  const handleSave = async () => {
    if (!template) return;
    if (!nome.trim()) {
      return toast.error("O nome do modelo é obrigatório.");
    }
    if (!category.trim()) {
      return toast.error("A categoria do modelo é obrigatória.");
    }
    const plainContent = chipsToHtml(htmlContent).replace(/<[^>]*>/g, "").trim();
    if (!plainContent) {
      return toast.error("O conteúdo do modelo não pode estar vazio.");
    }
    setSaving(true);
    try {
      await updateTemplate.mutateAsync({
        id: template.id,
        nome: nome.trim(),
        category,
        description: description.trim() || undefined,
        status,
        html_content: chipsToHtml(htmlContent),
      });
      toast.success("Modelo guardado com sucesso");
    } catch {
      // handled
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <PageHeader
          title={t("editModel")}
          subtitle={template?.nome}
          action={
            <Button variant="outline" onClick={() => navigate({ to: "/modelos" })}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          }
        />

        <div className="p-6 lg:p-8 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !template ? (
            <Card className="p-12 text-center">
              <p className="text-sm font-medium">Modelo não encontrado</p>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Nome do Modelo *</label>
                    <Input value={nome} onChange={(e) => setNome(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Categoria</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Direito Civil", "Direito Comercial", "Direito Laboral", "Direito Penal", "Direito da Família", "Procuração", "Outros"].map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Estado</label>
                    <Select value={status} onValueChange={(v) => setStatus(v as "active" | "archived")}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">{t("modelStatusActive")}</SelectItem>
                        <SelectItem value="archived">{t("modelStatusArchived")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs text-muted-foreground">Descrição</label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                  </div>
                </div>
              </Card>

              <Card className="overflow-hidden">
                <div className="border-b bg-white p-0">
                  <div className="h-[70vh]">
                    <TipTapEditor value={htmlContent} onChange={setHtmlContent} paper />
                  </div>
                </div>
              </Card>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => navigate({ to: "/modelos" })}>
                  {t("cancel")}
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("save")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
