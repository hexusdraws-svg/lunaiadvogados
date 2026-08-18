import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, FileText, X } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TipTapEditor, type TipTapEditorApi } from "@/components/tiptap-editor";
import { DocumentVariablesSidebar } from "@/components/contract-variables-sidebar";

/**
 * The single professional fullscreen editor used across the Contracts module.
 *
 * Both the "Modelos" editor and the "Contratos Emitidos" editor render this same
 * shell (backdrop that blocks the dashboard, sticky header with a golden Guardar
 * button, compact form fields, A4 TipTap editor + variables sidebar, and unsaved
 * changes protection). Only the top form fields (`fields`) differ between modes.
 */
export function DocumentEditorPanel({
  title,
  subtitle,
  fields,
  html,
  onHtmlChange,
  dirty,
  saving,
  onSave,
  onClose,
  showClose = true,
  clienteValues,
  infoPanel,
}: {
  title: string;
  subtitle: string;
  fields?: ReactNode;
  html: string;
  onHtmlChange: (html: string) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => Promise<boolean>;
  onClose: () => void;
  showClose?: boolean;
  clienteValues?: Record<string, string>;
  infoPanel?: ReactNode;
}) {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const editorApi = useRef<TipTapEditorApi | null>(null);
  const { t } = useI18n();

  // Lock the dashboard scroll while the panel is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const requestClose = () => {
    if (dirty) setShowLeaveConfirm(true);
    else onClose();
  };

  // Intercept Escape so it never leaks to the dashboard / navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        requestClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  const handleSaveAndExit = async () => {
    const ok = await onSave();
    if (ok) {
      setShowLeaveConfirm(false);
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[100]">
        {/* BACKDROP — blocks & blurs the whole dashboard */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onMouseDown={requestClose} />

        {/* PANEL */}
        <div
          className="absolute left-1/2 top-1/2 flex h-[94vh] w-[95vw] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* HEADER — always visible */}
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#c8a24a]/15 text-[#c8a24a]">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold leading-tight">{title}</h2>
                <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" onClick={requestClose} disabled={saving}>
                {t("cancel")}
              </Button>
              <Button
                onClick={() => onSave()}
                disabled={saving}
                className="bg-[#c8a24a] font-semibold text-black hover:bg-[#b8923a]"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("save")}
              </Button>
              {showClose && (
                <button
                  onClick={requestClose}
                  className="ml-1 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                  title={t("close")}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </header>

          {/* COMPACT FORM ROW */}
          {fields && <div className="shrink-0 border-b border-border px-6 py-3">{fields}</div>}

          {/* PARTE 2 — PAINEL INFORMATIVO (referência para quem escreve) */}
          {infoPanel && (
            <div className="shrink-0 border-b border-border bg-muted/30 px-6 py-3">{infoPanel}</div>
          )}

          {/* BODY: EDITOR + VARIABLES SIDEBAR */}
          <div className="flex min-h-0 flex-1">
            <div className="min-h-0 flex-1 overflow-hidden">
              <TipTapEditor
                value={html}
                onChange={onHtmlChange}
                paper
                hideVariables
                apiRef={editorApi}
              />
            </div>

            <aside className="flex w-72 shrink-0 flex-col border-l border-border bg-card">
              <DocumentVariablesSidebar
                onInsert={(v) => editorApi.current?.insertVariable(v)}
                clienteValues={clienteValues}
                onInsertText={(txt) => editorApi.current?.insertText(txt)}
              />
            </aside>
          </div>
        </div>
      </div>

      {/* UNSAVED CHANGES CONFIRMATION */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent className="z-[110]">
          <AlertDialogHeader>
            <AlertDialogTitle>Existem alterações não guardadas</AlertDialogTitle>
            <AlertDialogDescription>
              Pretende sair sem guardar? As alterações feitas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel onClick={() => setShowLeaveConfirm(false)}>
              Continuar a editar
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                setShowLeaveConfirm(false);
                onClose();
              }}
            >
              Sair sem guardar
            </Button>
            <Button
              onClick={handleSaveAndExit}
              disabled={saving}
              className="bg-[#c8a24a] font-semibold text-black hover:bg-[#b8923a]"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar e sair
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
