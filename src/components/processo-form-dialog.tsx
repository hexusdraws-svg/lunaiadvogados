import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useCompanyId } from "@/hooks/use-profile-company";
import { useCreateProcesso, useUpdateProcesso } from "@/hooks/use-tarefas";
import { useClientsForSelect } from "@/hooks/use-financial-transactions";
import { useCreateCollaborationInvites } from "@/hooks/use-process-collaboration";
import {
  LEGAL_PROCESS_TYPES,
  PROCESS_PRIORITIES,
  PROCESS_PRIORITY_LABELS,
  PROCESS_STATUSES,
  PROCESS_STATUS_LABELS,
  type Processo,
} from "@/lib/processos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Search, Check, ChevronsUpDown, Users, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcessoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processo?: Processo | null;
  onSaved?: () => void;
}

const EMPTY_FORM = {
  numero: "",
  cliente_id: "",
  cliente_nome: "",
  tipo: LEGAL_PROCESS_TYPES[0],
  descricao: "",
  valor_causa: "",
  prioridade: "media",
  status: "novo",
  responsavel_id: "",
  colaboradores: [] as string[],
  etiquetas: [] as string[],
  observacoes_gerais: "",
};

export function ProcessoFormDialog({
  open,
  onOpenChange,
  processo,
  onSaved,
}: ProcessoFormDialogProps) {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const companyId = useCompanyId();
  const isEdit = !!processo;
  const createMutation = useCreateProcesso();
  const updateMutation = useUpdateProcesso();
  const createInvites = useCreateCollaborationInvites();
  const { t } = useI18n();

  const { data: clients = [] } = useClientsForSelect();
  const { data: professionals = [] } = useQuery({
    queryKey: ["professionals-all", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, professional_role")
        .eq("company_id", companyId)
        .eq("status", "active")
        .order("full_name");
      return (data ?? []).map((p) => ({ id: p.id, name: p.full_name ?? p.id }));
    },
    enabled: !!companyId,
  });

  const [form, setForm] = useState(EMPTY_FORM);
  const [clientComboOpen, setClientComboOpen] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [lastOpenKey, setLastOpenKey] = useState("");

  const openKey = `${open ? "open" : "closed"}:${processo?.id ?? "new"}`;
  useEffect(() => {
    if (openKey === lastOpenKey) return;
    setLastOpenKey(openKey);
    if (open) {
      setForm(
        processo
          ? {
              numero: processo.numero ?? "",
              cliente_id: processo.cliente_id ?? "",
              cliente_nome: processo.cliente_nome ?? "",
              tipo: processo.tipo ?? EMPTY_FORM.tipo,
              descricao: processo.descricao ?? "",
              valor_causa: processo.valor_causa != null ? String(processo.valor_causa) : "",
              prioridade: processo.prioridade ?? "media",
              status: processo.status ?? "novo",
              responsavel_id: processo.responsavel_id ?? profile?.id ?? "",
              colaboradores: processo.colaboradores ?? [],
              etiquetas: processo.etiquetas ?? [],
              observacoes_gerais: processo.observacoes_gerais ?? "",
            }
          : {
              ...EMPTY_FORM,
              responsavel_id: profile?.id ?? "",
            },
      );
      setTagInput("");
    }
  }, [openKey, lastOpenKey, open, processo, profile?.id]);

  const filteredClients = useMemo(() => {
    const q = form.cliente_nome.toLowerCase().trim();
    return clients.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 30);
  }, [clients, form.cliente_nome]);

  const set = (key: keyof typeof form, value: string | string[]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const responsavelName = useMemo(() => {
    if (!form.responsavel_id) return "—";
    if (form.responsavel_id === profile?.id) return profile?.full_name ?? "—";
    return professionals.find((p) => p.id === form.responsavel_id)?.name ?? "—";
  }, [form.responsavel_id, profile, professionals]);

  const collaboratorNames = form.colaboradores
    .map((id) => professionals.find((p) => p.id === id)?.name)
    .filter(Boolean) as string[];

  // O responsável nunca deve aparecer na lista de colaboradores.
  const availableCollaborators = useMemo(
    () => professionals.filter((p) => p.id !== form.responsavel_id),
    [professionals, form.responsavel_id],
  );

  const addTag = () => {
    const v = tagInput.trim();
    if (v && !form.etiquetas.includes(v)) {
      set("etiquetas", [...form.etiquetas, v]);
    }
    setTagInput("");
  };

   const handleSubmit = async () => {
     if (!form.cliente_nome.trim()) {
       return;
     }
     const payload = {
       numero: form.numero.trim(),
       cliente_id: form.cliente_id || null,
       cliente_nome: form.cliente_nome.trim(),
       tipo: form.tipo,
       status: form.status,
       descricao: form.descricao.trim() || null,
       responsavel_id: form.responsavel_id || profile?.id || null,
       valor_causa: form.valor_causa ? parseFloat(form.valor_causa) : null,
       prioridade: form.prioridade,
       etiquetas: form.etiquetas.length ? form.etiquetas : null,
       observacoes_gerais: form.observacoes_gerais.trim() || null,
     };

     try {
       if (isEdit && processo) {
         await updateMutation.mutateAsync({ id: processo.id, updates: payload });
         const newCollabs = form.colaboradores;
         if (newCollabs.length && companyId) {
           await createInvites.mutateAsync({
             processId: processo.id,
             companyId,
             collaborators: newCollabs,
             processoNumero: processo.numero || payload.numero || "Processo",
           });
         }
       } else {
         const created = await createMutation.mutateAsync(payload);
         const createdProcess = created as Processo | undefined;
         if (createdProcess?.id && companyId && form.colaboradores.length) {
           await createInvites.mutateAsync({
             processId: createdProcess.id,
             companyId,
             collaborators: form.colaboradores,
             processoNumero: createdProcess.numero || payload.numero || "Processo",
           });
         }
       }
       qc.invalidateQueries({ queryKey: ["processos"] });
       onSaved?.();
       onOpenChange(false);
     } catch {
       // handled by hook toasts
     }
   };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Processo" : "Novo Processo"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Número do Processo <span className="text-muted-foreground/60">{t("optional")}</span>
              </Label>
              <Input
                value={form.numero}
                onChange={(e) => set("numero", e.target.value)}
                placeholder="Deixe em branco para gerar automaticamente"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tipo de Processo *</Label>
              <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEGAL_PROCESS_TYPES.map((tp) => (
                    <SelectItem key={tp} value={tp}>
                      {tp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cliente - ComboBox pesquisável */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cliente *</Label>
            <Popover open={clientComboOpen} onOpenChange={setClientComboOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  onClick={() => setClientComboOpen(true)}
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <span className={form.cliente_nome ? "" : "text-muted-foreground"}>
                    {form.cliente_nome || "Selecionar cliente"}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput
                    value={form.cliente_nome}
                    onValueChange={(v) => set("cliente_nome", v)}
                    placeholder="Pesquisar cliente..."
                  />
                  <CommandList>
                    <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>
                    <CommandGroup>
                      {filteredClients.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.name}
                          onSelect={() => {
                            set("cliente_id", c.id);
                            set("cliente_nome", c.name);
                            setClientComboOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              form.cliente_id === c.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {c.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Valor da Causa</Label>
              <Input
                type="number"
                step="0.01"
                value={form.valor_causa}
                onChange={(e) => set("valor_causa", e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("priority")}</Label>
              <Select value={form.prioridade} onValueChange={(v) => set("prioridade", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROCESS_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PROCESS_PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("status")}</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROCESS_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PROCESS_STATUS_LABELS[s] || s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("responsibleLawyer")}</Label>
              <Input value={responsavelName} disabled className="bg-muted/50" />
            </div>
          </div>

          {/* Advogados Colaboradores - Multiselect */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Advogados Colaboradores</Label>
            <Popover open={collabOpen} onOpenChange={setCollabOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <span className={collaboratorNames.length ? "" : "text-muted-foreground"}>
                    {collaboratorNames.length
                      ? collaboratorNames.join(", ")
                      : "Selecionar colaboradores"}
                  </span>
                  <Users className="h-4 w-4 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandList>
                    <CommandGroup>
                      {availableCollaborators.map((p) => {
                        const checked = form.colaboradores.includes(p.id);
                        return (
                          <CommandItem
                            key={p.id}
                            value={p.name}
                            onSelect={() => {
                              set(
                                "colaboradores",
                                checked
                                  ? form.colaboradores.filter((id) => id !== p.id)
                                  : [...form.colaboradores, p.id],
                              );
                            }}
                          >
                            <Check
                              className={cn("mr-2 h-4 w-4", checked ? "opacity-100" : "opacity-0")}
                            />
                            {p.name}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Etiquetas */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Etiquetas</Label>
            <div className="flex flex-wrap gap-1.5 rounded-md border border-input bg-background p-2">
              {form.etiquetas.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        "etiquetas",
                        form.etiquetas.filter((t) => t !== tag),
                      )
                    }
                    className="rounded-full hover:bg-primary/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <div className="flex flex-1 items-center gap-1">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Adicionar etiqueta..."
                  className="h-7 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                />
                {tagInput.trim() && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={addTag}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("description")}</Label>
            <Textarea
              value={form.descricao}
              onChange={(e) => set("descricao", e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Observações Gerais</Label>
            <Textarea
              value={form.observacoes_gerais}
              onChange={(e) => set("observacoes_gerais", e.target.value)}
              rows={3}
              placeholder="Observações gerais sobre o processo..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
