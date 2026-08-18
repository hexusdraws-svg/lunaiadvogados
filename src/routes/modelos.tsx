import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import { ProtectedRoute, SuperAdminRedirect } from "@/components/protected-route";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/hooks/use-i18n";
import { useAuth } from "@/hooks/use-auth";
import {
  useContractTemplates,
  useDeleteContractTemplate,
  useDuplicateContractTemplate,
  useCreateContractTemplate,
  useUpdateContractTemplate,
  CONTRACT_CATEGORIES,
  type ContractTemplate,
} from "@/hooks/use-contract-templates";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Label } from "@/components/ui/label";
import {
  Loader2,
  FileText,
  Plus,
  Search,
  Pencil,
  Copy,
  Archive,
  Trash2,
  ArchiveRestore,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { pt as dateFnsPt, enUS } from "date-fns/locale";
import { DocumentEditorPanel } from "@/components/document-editor-panel";
import { htmlToChips, chipsToHtml } from "@/lib/contracts";

export const Route = createFileRoute("/modelos")({
  head: () => ({ meta: [{ title: "Modelos de Contrato" }] }),
  component: () => (
    <ProtectedRoute>
      <SuperAdminRedirect>
        <ModelosPage />
      </SuperAdminRedirect>
    </ProtectedRoute>
  ),
});

type SortField = "nome" | "category" | "created_at" | "updated_at";
type StatusFilter = "all" | "active" | "archived";

export function ModelosView() {
  const { t, language, dateFormat } = useI18n();
  const { profile, isSuperAdmin } = useAuth();
  const companyId = isSuperAdmin ? null : (profile?.company_id ?? null);
  const deleteTemplate = useDeleteContractTemplate();
  const duplicateTemplate = useDuplicateContractTemplate();
  const createTemplate = useCreateContractTemplate();
  const updateTemplate = useUpdateContractTemplate();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<{ field: SortField; dir: "asc" | "desc" }>({
    field: "created_at",
    dir: "desc",
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const locale = language === "en" ? enUS : dateFnsPt;

  const { data: templates = [], isLoading } = useContractTemplates({
    status: statusFilter,
    category: categoryFilter === "all" ? undefined : categoryFilter,
    search: search || undefined,
  });

  const sortedTemplates = useMemo(() => {
    const list = [...templates];
    list.sort((a, b) => {
      const aVal = a[sort.field];
      const bVal = b[sort.field];
      if (!aVal && !bVal) return 0;
      if (!aVal) return sort.dir === "asc" ? -1 : 1;
      if (!bVal) return sort.dir === "asc" ? 1 : -1;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [templates, sort]);

  const stats = useMemo(() => {
    const total = templates.length;
    const active = templates.filter((m) => m.status === "active").length;
    const archived = templates.filter((m) => m.status === "archived").length;
    const lastUpdated = templates
      .filter((m) => m.updated_at)
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))[0];
    return { total, active, archived, lastUpdated };
  }, [templates]);

  const toggleSort = (field: SortField) => {
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === "asc" ? "desc" : "asc",
    }));
  };

  const handleArchive = async (template: ContractTemplate) => {
    try {
      await updateTemplate.mutateAsync({
        id: template.id,
        status: template.status === "active" ? "archived" : "active",
      });
    } catch {
      // handled
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteTemplate.mutateAsync(confirmDeleteId);
    } catch {
      // handled
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateTemplate.mutateAsync(id);
    } catch {
      // handled
    }
  };

  const handleSave = async (values: {
    id?: string;
    nome: string;
    category: string;
    description?: string;
    status: "active" | "archived";
    html_content: string;
  }) => {
    if (values.id) {
      await updateTemplate.mutateAsync({
        id: values.id,
        nome: values.nome,
        category: values.category,
        description: values.description,
        status: values.status,
        html_content: values.html_content,
      });
    } else {
      await createTemplate.mutateAsync({
        nome: values.nome,
        category: values.category,
        description: values.description,
        status: values.status,
        html_content: values.html_content,
      });
    }
    setOpenDialog(false);
    setEditingTemplate(null);
  };

  const fmtDate = (v?: string | null) => {
    if (!v) return "—";
    try {
      return format(parseISO(v), dateFormat, { locale });
    } catch {
      return v;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="p-6 lg:p-8 space-y-4">
        {/* STATS CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Total de Modelos
              </p>
              <p className="text-xl font-semibold">{stats.total}</p>
            </Card>
            <Card className="p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Modelos Ativos
              </p>
              <p className="text-xl font-semibold text-success">{stats.active}</p>
            </Card>
            <Card className="p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Arquivados
              </p>
              <p className="text-xl font-semibold text-destructive">{stats.archived}</p>
            </Card>
            <Card className="p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Última Atualização
              </p>
              <p className="text-sm font-semibold truncate">
                {stats.lastUpdated ? fmtDate(stats.lastUpdated.updated_at) : "—"}
              </p>
            </Card>
          </div>

          {/* FILTERS */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 w-44">
                <SelectValue placeholder={t("filterByCategory")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {CONTRACT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger className="h-9 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="archived">Arquivados</SelectItem>
              </SelectContent>
            </Select>
            <Button className="gap-1.5" onClick={() => { setEditingTemplate(null); setOpenDialog(true); }}>
              <Plus className="h-4 w-4" /> {t("newModel")}
            </Button>
          </div>

          {/* TABLE */}
          {sortedTemplates.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium text-foreground">{t("noModels")}</p>
              <p className="text-xs text-muted-foreground">{t("noModelsDesc")}</p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3 font-medium cursor-pointer" onClick={() => toggleSort("nome")}>
                        Nome {sort.field === "nome" && (sort.dir === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="px-4 py-3 font-medium cursor-pointer" onClick={() => toggleSort("category")}>
                        Categoria {sort.field === "category" && (sort.dir === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="px-4 py-3 font-medium">{t("author")}</th>
                      <th className="px-4 py-3 font-medium cursor-pointer" onClick={() => toggleSort("updated_at")}>
                        {t("updatedAt")} {sort.field === "updated_at" && (sort.dir === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="px-4 py-3 font-medium">{t("modelStatus")}</th>
                      <th className="px-4 py-3 font-medium w-40">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTemplates.map((m) => (
                      <tr
                        key={m.id}
                        className="border-t border-border/60 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium">{m.nome}</td>
                        <td className="px-4 py-3 text-muted-foreground">{m.category}</td>
                        <td className="px-4 py-3 text-muted-foreground">—</td>
                        <td className="px-4 py-3 text-muted-foreground">{fmtDate(m.updated_at)}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={m.status === "active" ? "default" : "outline"}
                            className={cn(
                              m.status === "active"
                                ? "bg-success/15 text-success border-success/30"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {m.status === "active" ? t("modelStatusActive") : t("modelStatusArchived")}
                          </Badge>
                        </td>
                         <td className="px-2 py-3">
                           <div className="flex items-center gap-1">
                             <Button
                               size="sm"
                               variant="ghost"
                               onClick={() => { setEditingTemplate(m); setOpenDialog(true); }}
                               className="h-7 w-7 p-0"
                               title={t("view")}
                             >
                               <Eye className="h-3.5 w-3.5" />
                             </Button>
                             <Button
                               size="sm"
                               variant="ghost"
                               onClick={() => { setEditingTemplate(m); setOpenDialog(true); }}
                               className="h-7 w-7 p-0"
                               title={t("edit")}
                             >
                               <Pencil className="h-3.5 w-3.5" />
                             </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDuplicate(m.id)}
                              className="h-7 w-7 p-0"
                              title={t("duplicate")}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleArchive(m)}
                              className="h-7 w-7 p-0"
                              title={m.status === "active" ? t("archive") : t("modelStatusActive")}
                            >
                              {m.status === "active" ? (
                                <Archive className="h-3.5 w-3.5" />
                              ) : (
                                <ArchiveRestore className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setConfirmDeleteId(m.id)}
                              className="h-7 w-7 p-0 text-destructive"
                              title={t("delete")}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* CREATE/EDIT FULLSCREEN EDITOR PANEL */}
        {openDialog && (
          <ModelEditorPanel
            template={editingTemplate}
            onSave={handleSave}
            onClose={() => {
              setOpenDialog(false);
              setEditingTemplate(null);
            }}
          />
        )}

        {/* DELETE CONFIRMATION */}
        <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("confirmDelete")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmDeleteId(null)}>
                {t("cancel")}
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t("delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </>
  );
}

function ModelosPage() {
  const { t } = useI18n();
  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <PageHeader title={t("modelosContrato")} subtitle={t("modelosContratoSubtitle")} />
        <ModelosView />
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FULLSCREEN PROFESSIONAL EDITOR PANEL                                 */
/* ------------------------------------------------------------------ */

function ModelEditorPanel({
  template,
  onSave,
  onClose,
}: {
  template: ContractTemplate | null;
  onSave: (values: {
    id?: string;
    nome: string;
    category: string;
    description?: string;
    status: "active" | "archived";
    html_content: string;
  }) => Promise<void> | void;
  onClose: () => void;
}) {
  const [nome, setNome] = useState(template?.nome || "");
  const [category, setCategory] = useState(template?.category || "Outros");
  const [description, setDescription] = useState(template?.description || "");
  const [htmlContent, setHtmlContent] = useState(() => htmlToChips(template?.html_content || ""));
  const [saving, setSaving] = useState(false);

  // Snapshot of the initial state to detect unsaved changes.
  const initialSnapshot = useRef(
    JSON.stringify({
      nome: template?.nome || "",
      category: template?.category || "Outros",
      description: template?.description || "",
      htmlContent: htmlToChips(template?.html_content || ""),
    }),
  );

  const isDirty =
    JSON.stringify({ nome, category, description, htmlContent }) !== initialSnapshot.current;

  const persist = async (): Promise<boolean> => {
    if (!nome.trim()) {
      toast.error("O nome do modelo é obrigatório.");
      return false;
    }
    if (!category.trim()) {
      toast.error("A categoria do modelo é obrigatória.");
      return false;
    }
    const plainContent = chipsToHtml(htmlContent).replace(/<[^>]*>/g, "").trim();
    if (!plainContent) {
      toast.error("O conteúdo do modelo não pode estar vazio.");
      return false;
    }
    setSaving(true);
    try {
      await onSave({
        id: template?.id,
        nome: nome.trim(),
        category,
        description: description.trim() || undefined,
        status: template?.status || "active",
        html_content: chipsToHtml(htmlContent),
      });
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <DocumentEditorPanel
      title={template ? "Editar Modelo de Contrato" : "Novo Modelo de Contrato"}
      subtitle="Crie modelos reutilizáveis com variáveis inteligentes."
      html={htmlContent}
      onHtmlChange={setHtmlContent}
      dirty={isDirty}
      saving={saving}
      onSave={persist}
      onClose={onClose}
      fields={
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1.6fr)]">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Nome do Modelo *</Label>
            <Input
              className="h-9"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Contrato de Prestação de Serviços"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Categoria *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTRACT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Descrição</Label>
            <Input
              className="h-9"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional do modelo..."
            />
          </div>
        </div>
      }
    />
  );
}
