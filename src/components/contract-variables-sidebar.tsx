import { useState } from "react";
import { ChevronDown, User, CalendarDays, Sparkles, Plus, Variable } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/use-i18n";
import {
  humanizeVar,
  CLIENT_VARS,
  DATE_VARS,
  DOCUMENT_LIVE_CLIENT_VARS,
  DOCUMENT_LIVE_VAR_LABELS,
} from "@/lib/contracts";
import { Input } from "@/components/ui/input";

/**
 * Variable groups available while editing a *generic* document (model or contract).
 *
 * Per product decision, models must stay generic — only Cliente + Datas make sense,
 * plus user-defined "Variáveis Personalizadas". Empresa / Advogado / Processo were
 * intentionally removed from this sidebar.
 */
export const DOCUMENT_VARIABLE_GROUPS: {
  key: string;
  label: string;
  icon: typeof User;
  vars: readonly string[];
}[] = [
  { key: "cliente", label: "Cliente", icon: User, vars: CLIENT_VARS },
  { key: "datas", label: "Datas", icon: CalendarDays, vars: DATE_VARS },
];

export function DocumentVariablesSidebar({
  onInsert,
  /**
   * PARTE 1/3 — Quando fornecido, a barra funciona em modo "ao vivo":
   * clicar numa variável do cliente insere o VALOR REAL (não a variável).
   * Usado no editor de Contratos, onde já existe um cliente selecionado.
   */
  clienteValues,
  onInsertText,
}: {
  onInsert: (variable: string) => void;
  clienteValues?: Record<string, string>;
  onInsertText?: (text: string) => void;
}) {
  const liveMode = !!clienteValues && !!onInsertText;
  const [open, setOpen] = useState<Record<string, boolean>>({ cliente: true });
  const [customName, setCustomName] = useState("");
  const { t } = useI18n();

  const toggle = (key: string) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const insertCustom = () => {
    const clean = customName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!clean || clean.length < 2) return;
    if (/^[pk]$/.test(clean)) return;
    onInsert(clean);
    setCustomName("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Variable className="h-4 w-4 text-[#c8a24a]" />
          Variáveis
        </p>
        <p className="text-[11px] text-muted-foreground">
          {liveMode
            ? "Clique para inserir o valor real do cliente."
            : "Clique para inserir no cursor."}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {/* PARTE 1/3 — MODO AO VIVO: dados reais do cliente selecionado */}
        {liveMode ? (
          <div className="rounded-md border border-border/60">
            <button
              type="button"
              onClick={() => toggle("cliente")}
              className="flex w-full items-center justify-between px-2.5 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-accent/60"
            >
              <span className="flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                Cliente
              </span>
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform", open["cliente"] && "rotate-180")}
              />
            </button>
            {open["cliente"] && (
              <div className="space-y-1 p-1.5 pt-0">
                {DOCUMENT_LIVE_CLIENT_VARS.map((v) => {
                  const value = clienteValues?.[v] ?? "";
                  const label = DOCUMENT_LIVE_VAR_LABELS[v] ?? humanizeVar(v);
                  const hasValue = value.trim().length > 0;
                  return (
                    <button
                      key={v}
                      type="button"
                      disabled={!hasValue}
                      onClick={() => onInsertText?.(value)}
                      title={hasValue ? value : "Sem valor para este cliente"}
                      className={cn(
                        "flex w-full flex-col items-start rounded-md border border-transparent px-2.5 py-1.5 text-left text-xs transition-colors",
                        hasValue
                          ? "bg-blue-50/60 text-blue-700 hover:border-blue-200 hover:bg-blue-100"
                          : "cursor-not-allowed bg-muted/40 text-muted-foreground/60",
                      )}
                    >
                      <span className="font-medium">{label}</span>
                       <span className="truncate w-full text-[11px] opacity-80">
                         {hasValue ? value : t("none")}
                       </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          DOCUMENT_VARIABLE_GROUPS.map((group) => {
            const Icon = group.icon;
            const isOpen = !!open[group.key];
            return (
              <div key={group.key} className="rounded-md border border-border/60">
                <button
                  type="button"
                  onClick={() => toggle(group.key)}
                  className="flex w-full items-center justify-between px-2.5 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-accent/60"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    {group.label}
                  </span>
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")}
                  />
                </button>
                {isOpen && (
                  <div className="space-y-1 p-1.5 pt-0">
                    {group.vars.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => onInsert(v)}
                        className="flex w-full items-center rounded-md border border-transparent bg-blue-50/60 px-2.5 py-1.5 text-left text-xs font-medium text-blue-700 transition-colors hover:border-blue-200 hover:bg-blue-100"
                      >
                        {humanizeVar(v)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* DATAS — sempre disponível como variável (mesmo em modo ao vivo) */}
        {liveMode && (
          <div className="rounded-md border border-border/60">
            <button
              type="button"
              onClick={() => toggle("datas")}
              className="flex w-full items-center justify-between px-2.5 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-accent/60"
            >
              <span className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5" />
                Datas
              </span>
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform", open["datas"] && "rotate-180")}
              />
            </button>
            {open["datas"] && (
              <div className="space-y-1 p-1.5 pt-0">
                {DATE_VARS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onInsert(v)}
                    className="flex w-full items-center rounded-md border border-transparent bg-blue-50/60 px-2.5 py-1.5 text-left text-xs font-medium text-blue-700 transition-colors hover:border-blue-200 hover:bg-blue-100"
                  >
                    {humanizeVar(v)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CUSTOM VARIABLES */}
        <div className="rounded-md border border-border/60">
          <button
            type="button"
            onClick={() => toggle("personalizadas")}
            className="flex w-full items-center justify-between px-2.5 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-accent/60"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              Personalizadas
            </span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                open["personalizadas"] && "rotate-180",
              )}
            />
          </button>
          {open["personalizadas"] && (
            <div className="space-y-2 p-2 pt-0">
              <p className="text-[11px] text-muted-foreground">
                Crie uma variável própria (ex.: valor_renda).
              </p>
              <div className="flex items-center gap-1.5">
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      insertCustom();
                    }
                  }}
                  placeholder="nome_da_variavel"
                  className="h-8 text-xs"
                />
                <button
                  type="button"
                  onClick={insertCustom}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#c8a24a] text-black hover:bg-[#b8923a]"
                  title="Inserir variável personalizada"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
