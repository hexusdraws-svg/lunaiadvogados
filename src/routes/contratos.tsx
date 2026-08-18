import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { ProtectedRoute, SuperAdminRedirect } from "@/components/protected-route";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import {
  FileText,
  FilePlus2,
  Plus,
  Search,
  Loader2,
  Eye,
  Download,
  Pencil,
  Trash2,
  Check,
  FileStack,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { pt as dateFnsPt, enUS } from "date-fns/locale";
import { useI18n } from "@/hooks/use-i18n";
import { useAuth } from "@/hooks/use-auth";
import { ModelosView } from "@/routes/modelos";
import {
  useContracts,
  useDeleteContract,
  useProcessosForContracts,
  CONTRACT_STATUS_LABELS,
  type Contract,
} from "@/hooks/use-contracts";
import { useClientes, useProfilesForClientes } from "@/hooks/use-clientes";
import { useContractTemplates, type ContractTemplate } from "@/hooks/use-contract-templates";
import {
  ContractEditorPanel,
  printContractPdf,
  type ContractDraft,
} from "@/components/contract-editor-panel";
import { useActiveCompany } from "@/hooks/use-company";
import {
  buildClientValuesFromRow,
  buildDateValues,
  fillTemplateValues,
  htmlToChips,
} from "@/lib/contracts";
import { ContractDataBuilder } from "@/lib/contract-data-builder";

export const Route = createFileRoute("/contratos")({
  head: () => ({ meta: [{ title: "Contratos" }] }),
  component: () => (
    <ProtectedRoute>
      <SuperAdminRedirect>
        <ContratosPage />
      </SuperAdminRedirect>
    </ProtectedRoute>
  ),
});

type MainTab = "modelos" | "emitidos";

function ContratosPage() {
   const { t } = useI18n();
   const [tab, setTab] = useState<MainTab>("modelos");

   return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <PageHeader title={t("nav.contratos")} subtitle={t("nav.contratos")} />

        {/* MAIN TABS */}
        <div className="px-6 pt-4 lg:px-8">
          <div className="flex gap-1 border-b border-border">
            <TabButton active={tab === "modelos"} onClick={() => setTab("modelos")} icon={FileStack}>
              {t("nav.modelosContrato")}
            </TabButton>
            <TabButton active={tab === "emitidos"} onClick={() => setTab("emitidos")} icon={FileText}>
              {t("contracts.issued", { defaultValue: "Contratos Emitidos" })}
            </TabButton>
          </div>
        </div>

        {tab === "modelos" ? <ModelosView /> : <ContratosEmitidosView />}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof FileText;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* CONTRATOS EMITIDOS                                                   */
/* ------------------------------------------------------------------ */

function ContratosEmitidosView() {
  const { t, language, dateFormat } = useI18n();
  const locale = language === "en" ? enUS : dateFnsPt;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: contracts = [], isLoading } = useContracts({
    search: search || undefined,
    status: statusFilter,
  });

  const { data: templates = [] } = useContractTemplates({ status: "active" });
  const { data: clientes = [], isLoading: clientesLoading } = useClientes();
  const { data: profiles = [] } = useProfilesForClientes();
  const { data: processos = [] } = useProcessosForContracts();
  const { data: activeCompany } = useActiveCompany();
  const companyName = activeCompany?.nome || "";
  const deleteContract = useDeleteContract();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [editorDraft, setEditorDraft] = useState<ContractDraft | null>(null);
  const [viewing, setViewing] = useState<Contract | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fmtDate = (v?: string | null) => {
    if (!v) return "—";
    try {
      return format(parseISO(v), dateFormat, { locale });
    } catch {
      return v;
    }
  };

  const openEditExisting = (c: Contract) => {
    const data = (c.cliente_data ?? {}) as Record<string, unknown>;
    const proc = processos.find((p) => p.id === c.processo_id);
    setEditorDraft({
      id: c.id,
      nome: c.nome || c.template_nome || "Contrato",
      status: c.status || "draft",
      tipo: c.tipo,
      html: htmlToChips(c.html_final || ""),
      templateId: c.template_id,
      templateNome: c.template_nome,
      clienteId: c.cliente_id,
      clienteNome: c.cliente_nome,
      clienteData: c.cliente_data,
      processoId: c.processo_id,
      clienteTipoDocumento: (data.tipo_documento as string | null) ?? null,
      processoNumero: proc?.numero ?? null,
    });
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteContract.mutateAsync(confirmDeleteId);
    } catch {
      // handled
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      sent: "bg-blue-500/15 text-blue-600 border-blue-500/30",
      signed: "bg-success/15 text-success border-success/30",
      cancelled: "bg-destructive/15 text-destructive border-destructive/30",
    };
    return (
      <Badge variant="outline" className={cn(map[status] ?? "bg-muted text-muted-foreground")}>
        {CONTRACT_STATUS_LABELS[status] ?? status}
      </Badge>
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-4">
      {/* FILTERS */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("clients.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("contracts.statusFilter.all", { defaultValue: "Todos os estados" })}</SelectItem>
            <SelectItem value="draft">{t("contracts.statusFilter.draft", { defaultValue: "Rascunho" })}</SelectItem>
            <SelectItem value="sent">{t("contracts.statusFilter.sent", { defaultValue: "Enviado" })}</SelectItem>
            <SelectItem value="signed">{t("contracts.statusFilter.signed", { defaultValue: "Assinado" })}</SelectItem>
            <SelectItem value="cancelled">{t("contracts.statusFilter.cancelled", { defaultValue: "Cancelado" })}</SelectItem>
          </SelectContent>
        </Select>
        <Button className="gap-1.5" onClick={() => setWizardOpen(true)}>
          <Plus className="h-4 w-4" /> {t("contracts.newContract", { defaultValue: "Novo Contrato" })}
        </Button>
      </div>

      {/* TABLE */}
      {isLoading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : contracts.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-foreground">{t("contracts.emptyTitle", { defaultValue: "Sem contratos emitidos" })}</p>
          <p className="text-xs text-muted-foreground">
            {t("contracts.emptyHint", { defaultValue: "Clique em \"Novo Contrato\" para produzir o primeiro documento." })}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">{t("contracts.table.name", { defaultValue: "Nome" })}</th>
                  <th className="px-4 py-3 font-medium">{t("contracts.table.client", { defaultValue: "Cliente" })}</th>
                  <th className="px-4 py-3 font-medium">{t("contracts.table.date", { defaultValue: "Data" })}</th>
                  <th className="px-4 py-3 font-medium">{t("contracts.table.status", { defaultValue: "Estado" })}</th>
                  <th className="w-44 px-4 py-3 font-medium">{t("contracts.table.actions", { defaultValue: "Ações" })}</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-border/60 transition-colors hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 font-medium">{c.nome || c.template_nome || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.cliente_nome || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(c.created_at)}</td>
                    <td className="px-4 py-3">{statusBadge(c.status)}</td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-1">
                        <IconBtn title={t("view")} onClick={() => setViewing(c)}>
                          <Eye className="h-3.5 w-3.5" />
                        </IconBtn>
                        <IconBtn
                          title={t("downloadPDF")}
                          onClick={() => {
                            console.log("[CONTRACT PDF] download clicked", c.id, "html length", c.html_final?.length);
                            printContractPdf({ companyName, html: c.html_final || "" });
                          }}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </IconBtn>
                        <IconBtn title={t("edit")} onClick={() => openEditExisting(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </IconBtn>
                        <IconBtn
                          title={t("delete")}
                          className="text-destructive"
                          onClick={() => setConfirmDeleteId(c.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* WIZARD */}
      {wizardOpen && (
        <ContractWizard
          templates={templates}
          clientes={clientes}
          clientesLoading={clientesLoading}
          profiles={profiles}
          processos={processos}
          onCancel={() => setWizardOpen(false)}
          onComplete={(draft) => {
            setWizardOpen(false);
            setEditorDraft(draft);
          }}
        />
      )}

      {/* EDITOR */}
      {editorDraft && (
        <ContractEditorPanel initial={editorDraft} onClose={() => setEditorDraft(null)} />
      )}

      {/* VIEW */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>{viewing?.nome || viewing?.template_nome || t("contracts.previewTitle", { defaultValue: "Contrato" })}</DialogTitle>
            <DialogDescription>
              {viewing?.cliente_nome ? t("contracts.previewClientLabel", { defaultValue: "Cliente:" }) + " " + viewing.cliente_nome : t("contracts.previewDescription", { defaultValue: "Pré-visualização" })}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-[#1a1d24] p-6">
            <div
              className="tiptap-preview mx-auto"
              dangerouslySetInnerHTML={{ __html: viewing?.html_final || "" }}
            />
          </div>
          <DialogFooter className="border-t px-6 py-3">
              <Button
                variant="outline"
                onClick={() => {
                  console.log("[CONTRACT PDF] preview download clicked", viewing?.id, "html length", viewing?.html_final?.length);
                  viewing && printContractPdf({ companyName, html: viewing.html_final || "" });
                }}
              >
              <Download className="mr-2 h-4 w-4" />
              {t("downloadPDF")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("contracts.confirmDeleteTitle", { defaultValue: "Eliminar contrato" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("contracts.confirmDelete", { defaultValue: "Tem a certeza que deseja eliminar este contrato? Esta ação não pode ser revertida." })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDeleteId(null)}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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

function IconBtn({
  title,
  onClick,
  className,
  children,
}: {
  title: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={onClick}
      className={cn("h-7 w-7 p-0", className)}
      title={title}
    >
      {children}
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/* NOVO CONTRATO — WIZARD                                               */
/* ------------------------------------------------------------------ */

function ContractWizard({
  templates,
  clientes,
  clientesLoading,
  profiles,
  processos,
  onCancel,
  onComplete,
}: {
  templates: ContractTemplate[];
  clientes: import("@/hooks/use-clientes").UseCliente[];
  clientesLoading: boolean;
  profiles: { id: string; full_name: string | null }[];
  processos: { id: string; numero: string | null; cliente_nome: string | null }[];
  onCancel: () => void;
  onComplete: (draft: ContractDraft) => void;
}) {
  const { t } = useI18n();
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [templateId, setTemplateId] = useState<string>("blank");
  const [clienteId, setClienteId] = useState<string>("");
  const [clientSearch, setClientSearch] = useState("");
  const [processoId, setProcessoId] = useState<string>("none");

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId],
  );
  const selectedCliente = useMemo(
    () => clientes.find((c) => c.id === clienteId),
    [clientes, clienteId],
  );

  const filteredProcessos = useMemo(() => {
    if (!clienteId || !processos.length) return [];
    return processos.filter((p) => p.cliente_id === clienteId || p.cliente_nome === selectedCliente?.nome);
  }, [clienteId, processos, selectedCliente?.nome]);

  const lawyerName = (id?: string | null) =>
    profiles.find((p) => p.id === id)?.full_name ?? "—";

  // Meus clientes primeiro, depois os restantes da mesma empresa.
  const sortedClientes = useMemo(() => {
    const myId = profile?.id;
    return [...clientes].sort((a, b) => {
      const aMine = a.created_by === myId ? 0 : 1;
      const bMine = b.created_by === myId ? 0 : 1;
      if (aMine !== bMine) return aMine - bMine;
      return (b.created_at || "").localeCompare(a.created_at || "");
    });
  }, [clientes, profile?.id]);

  // Pesquisa em tempo real: nome, telefone, email, BI/NUIT (documento).
  const filteredClientes = useMemo(() => {
    const q = clientSearch.toLowerCase().trim();
    if (!q) return sortedClientes;
    return sortedClientes.filter((c) => {
      return (
        (c.nome ?? "").toLowerCase().includes(q) ||
        (c.contacto ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.documento ?? "").toLowerCase().includes(q)
      );
    });
  }, [sortedClientes, clientSearch]);

  const canNext = step === 1 ? true : step === 2 ? !!clienteId : true;

  const finish = () => {
    if (!selectedCliente) return;

    const selectedProcesso = processoId === "none"
      ? null
      : processos.find((p) => p.id === processoId) ?? null;

    const data = ContractDataBuilder.build({
      cliente: selectedCliente,
      processo: selectedProcesso ?? undefined,
    });

    let html = "";
    if (selectedTemplate) {
      html = htmlToChips(fillTemplateValues(selectedTemplate.html_content || "", data.mergedValues));
    }

    const draft: ContractDraft = {
      nome: selectedTemplate ? `${selectedTemplate.nome} — ${selectedCliente.nome}` : "Novo Contrato",
      status: "draft",
      tipo: selectedTemplate?.category ?? null,
      html,
      templateId: selectedTemplate?.id ?? null,
      templateNome: selectedTemplate?.nome ?? null,
      clienteId: selectedCliente.id,
      clienteNome: selectedCliente.nome,
      clienteData: selectedCliente as unknown as ContractDraft["clienteData"],
      processoId: processoId === "none" ? null : processoId,
      clienteTipoDocumento: selectedCliente.tipo_documento ?? null,
      processoNumero: selectedProcesso?.numero ?? null,
    };
    onComplete(draft);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("contracts.wizardTitle", { defaultValue: "Novo Contrato" })}</DialogTitle>
          <DialogDescription>
             {t("contracts.wizardStep", { defaultValue: "Passo" })} {step} de 3 —{" "}
             {step === 1 ? t("contracts.wizard.step1", { defaultValue: "Escolher Modelo" }) : step === 2 ? t("contracts.wizard.step2", { defaultValue: "Escolher Cliente" }) : t("contracts.wizard.step3", { defaultValue: "Associar Processo" })}
          </DialogDescription>
        </DialogHeader>

        {/* STEP INDICATOR */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                s <= step ? "bg-[#c8a24a]" : "bg-muted",
              )}
            />
          ))}
        </div>

        <div className="min-h-[220px] py-2">
          {/* STEP 1 — MODEL */}
          {step === 1 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t("contracts.wizard.baseTemplate", { defaultValue: "Modelo base" })}</Label>
              <button
                onClick={() => setTemplateId("blank")}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                  templateId === "blank"
                    ? "border-[#c8a24a] bg-[#c8a24a]/10"
                    : "border-border hover:bg-accent/50",
                )}
              >
                <FilePlus2 className="h-5 w-5 text-[#c8a24a]" />
                <div>
                  <p className="text-sm font-medium">{t("contracts.wizard.blankContract", { defaultValue: "Contrato em branco" })}</p>
                  <p className="text-xs text-muted-foreground">{t("contracts.wizard.startFromZero", { defaultValue: "Começar do zero, sem modelo." })}</p>
                </div>
                {templateId === "blank" && <Check className="ml-auto h-4 w-4 text-[#c8a24a]" />}
              </button>

              <div className="max-h-56 space-y-1.5 overflow-y-auto pt-1">
                {templates.length === 0 && (
                  <p className="px-1 text-xs text-muted-foreground">
                    {t("contracts.wizard.noActiveTemplates", { defaultValue: "Não existem modelos ativos. Pode criar um contrato em branco." })}
                  </p>
                )}
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplateId(t.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                      templateId === t.id
                        ? "border-[#c8a24a] bg-[#c8a24a]/10"
                        : "border-border hover:bg-accent/50",
                    )}
                  >
                    <FileStack className="h-5 w-5 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{t.category}</p>
                    </div>
                    {templateId === t.id && <Check className="ml-auto h-4 w-4 text-[#c8a24a]" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2 — CLIENT */}
          {step === 2 && (
            <div className="flex h-[420px] flex-col gap-3">
              {/* PESQUISA EM TEMPO REAL */}
              <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder={t("clients.searchPlaceholder")}
                  className="h-10 pl-9"
                />
              </div>

              {/* LISTA DE CARTOES */}
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {clientesLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredClientes.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                    {clientes.length === 0
                      ? t("contracts.wizard.noClientsRegistered", { defaultValue: "Não existem clientes registados." })
                      : t("contracts.wizard.noClientMatches", { defaultValue: "Nenhum cliente corresponde à pesquisa." })}
                  </p>
                ) : (
                  filteredClientes.map((c) => {
                    const selected = c.id === clienteId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setClienteId(c.id)}
                        className={cn(
                          "w-full rounded-lg border p-3 text-left transition-colors",
                          selected
                            ? "border-[#c8a24a] bg-[#c8a24a]/10"
                            : "border-border hover:bg-accent/50",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{c.nome || "—"}</p>
                             <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                               {t("contracts.wizard.responsibleLabel", { defaultValue: "Responsável:" })} {lawyerName(c.created_by)}
                             </p>
                          </div>
                          {selected && <Check className="h-4 w-4 shrink-0 text-[#c8a24a]" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* STEP 3 — PROCESS */}
          {step === 3 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t("contracts.wizard.processOptional", { defaultValue: "Processo (opcional)" })}</Label>
              <Select value={processoId} onValueChange={setProcessoId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectProcess")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("contracts.wizard.noProcess", { defaultValue: "Sem processo" })}</SelectItem>
                  {filteredProcessos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.numero || t("contracts.wizard.processLabel", { defaultValue: "Processo" })}
                      {p.cliente_nome ? ` — ${p.cliente_nome}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {filteredProcessos.length === 0
                  ? t("contracts.wizard.noProcessForClient", { defaultValue: "Nenhum processo encontrado para este cliente." })
                  : t("contracts.wizard.associateProcessHint", { defaultValue: "Pode associar este contrato a um processo existente ou deixar sem processo." })}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => (step === 1 ? onCancel() : setStep((s) => s - 1))}
          >
            {step === 1 ? t("cancel") : t("back")}
          </Button>
          {step < 3 ? (
            <Button
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
              className="bg-[#c8a24a] font-semibold text-black hover:bg-[#b8923a]"
            >
              {t("contracts.wizard.continue", { defaultValue: "Continuar" })}
            </Button>
          ) : (
            <Button
              onClick={finish}
              className="bg-[#c8a24a] font-semibold text-black hover:bg-[#b8923a]"
            >
              {t("contracts.wizard.openEditor", { defaultValue: "Abrir Editor" })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
