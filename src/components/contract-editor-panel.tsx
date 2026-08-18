import { useRef, useState } from "react";
import { toast } from "sonner";
import { DocumentEditorPanel } from "@/components/document-editor-panel";
import {
  useCreateContract,
  useUpdateContract,
  type Contract,
} from "@/hooks/use-contracts";
import { buildClientValuesFromRow, buildDateValues, chipsToHtml } from "@/lib/contracts";
import type { Json } from "@/integrations/supabase/types";
import { useI18n } from "@/hooks/use-i18n";

export type ContractDraft = {
  id?: string;
  nome: string;
  status: string;
  tipo?: string | null;
  /** editor HTML (already converted to chips) */
  html: string;
  templateId?: string | null;
  templateNome?: string | null;
  clienteId?: string | null;
  clienteNome?: string | null;
  clienteData?: Json;
  processoId?: string | null;
  /** PARTE 2 — referência para o painel informativo */
  clienteTipoDocumento?: string | null;
  processoNumero?: string | null;
};

/**
 * The Contracts editor is intentionally minimal: just the document, Guardar and
 * Cancelar. All metadata (cliente, processo) is decided in the wizard / carried
 * over from the existing record — no extra form options.
 */
export function ContractEditorPanel({
  initial,
  onClose,
}: {
  initial: ContractDraft;
  onClose: () => void;
}) {
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();

  const [savedId, setSavedId] = useState<string | undefined>(initial.id);
  const isEditing = !!(savedId ?? initial.id);
  const [nome, setNome] = useState(initial.nome || "");
  const [status, setStatus] = useState(initial.status || "draft");
  const [processoId, setProcessoId] = useState<string>(initial.processoId || "none");
  const [html, setHtml] = useState(initial.html || "");
  const [saving, setSaving] = useState(false);
  const { t } = useI18n();

  const snapshot = useRef(
    JSON.stringify({
      nome: initial.nome || "",
      status: initial.status || "draft",
      processoId: initial.processoId || "none",
      html: initial.html || "",
    }),
  );

  const dirty =
    JSON.stringify({ nome, status, processoId, html }) !== snapshot.current;

  // PARTE 1/3 — Carregar TODOS os dados do cliente selecionado em memória, para
  // que a barra de variáveis insira o valor REAL (ao vivo) no cursor.
  const clienteData = (initial.clienteData ?? {}) as Record<string, unknown>;
  const clienteValues = {
    ...buildClientValuesFromRow({
      nome: (clienteData.nome as string) ?? initial.clienteNome ?? "",
      documento: clienteData.documento as string | null,
      tipo_documento: clienteData.tipo_documento as string | null,
      data_emissao: clienteData.data_emissao as string | null,
      local_emissao: clienteData.local_emissao as string | null,
      nacionalidade: clienteData.nacionalidade as string | null,
      contacto: clienteData.contacto as string | null,
      email: clienteData.email as string | null,
      endereco: clienteData.endereco as string | null,
      cidade: clienteData.cidade as string | null,
      provincia: clienteData.provincia as string | null,
      empresa: clienteData.empresa as string | null,
      data_nascimento: clienteData.data_nascimento as string | null,
    }),
    ...buildDateValues(),
  };

  const tipoDocumento =
    (clienteData.tipo_documento as string | null) ?? initial.clienteTipoDocumento ?? null;

  const infoPanel = (
    <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Cliente
        </p>
        <p className="font-semibold">{initial.clienteNome || t("none")}</p>
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Tipo Documento
        </p>
        <p className="font-semibold">{tipoDocumento || t("none")}</p>
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Processo
        </p>
        <p className="font-semibold">{initial.processoNumero || t("none")}</p>
      </div>
    </div>
  );

  const persist = async (): Promise<boolean> => {
    if (!nome.trim()) {
      toast.error("O nome do contrato é obrigatório.");
      return false;
    }
    const plain = chipsToHtml(html).replace(/<[^>]*>/g, "").trim();
    if (!plain) {
      toast.error("O conteúdo do contrato não pode estar vazio.");
      return false;
    }
    setSaving(true);
    try {
      const payload = {
        nome: nome.trim(),
        numero: null,
        tipo: initial.tipo ?? null,
        status,
        html_final: chipsToHtml(html),
        template_id: initial.templateId ?? null,
        template_nome: initial.templateNome ?? null,
        cliente_id: initial.clienteId ?? null,
        cliente_nome: initial.clienteNome ?? null,
        cliente_data: initial.clienteData ?? {},
        processo_id: processoId === "none" ? null : processoId,
        variables: {} as Json,
      };
      const currentId = savedId ?? initial.id;
      let res: Contract | undefined;
      if (currentId) {
        res = await updateContract.mutateAsync({ id: currentId, ...payload });
      } else {
        res = await createContract.mutateAsync(payload);
        if (res?.id) setSavedId(res.id);
      }
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <DocumentEditorPanel
      title={isEditing ? "Editar Contrato" : "Novo Contrato"}
      subtitle={
        initial.clienteNome
          ? `Cliente: ${initial.clienteNome}`
          : "Documento final gerado a partir de um modelo ou em branco."
      }
      html={html}
      onHtmlChange={setHtml}
      dirty={dirty}
      saving={saving}
      onSave={persist}
      onClose={onClose}
      showClose={true}
      clienteValues={initial.clienteId ? clienteValues : undefined}
      infoPanel={initial.clienteId ? infoPanel : undefined}
    />
  );
}

/**
 * Open a print-ready, paginated A4 window that looks like a professional legal
 * document: the company name in the header (every page) and the emission date +
 * page number in the footer. No contract title or internal names are shown.
 */
export function printContractPdf(opts: {
  companyName: string;
  html: string;
  emittedAt?: string;
}) {
  if (typeof window === "undefined") return Promise.resolve();
  const { companyName, html, emittedAt } = opts;
  const dateStr = emittedAt || new Date().toLocaleDateString("pt-PT");

  console.log("[CONTRACT PDF] contract html length", html.length);
  console.log("[CONTRACT PDF] contract html preview", html.slice(0, 200));

  const element = document.createElement("div");
  element.style.width = "673px";
  element.innerHTML = html;

  console.log("[CONTRACT PDF] element innerHTML length", element.innerHTML.length);

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div style="width:210mm;height:297mm;padding:18mm 16mm;box-sizing:border-box;font-family:Georgia,'Times New Roman',serif;font-size:12pt;line-height:1.55;color:#111;page-break-after:always;">
      <div style="text-align:center;border-bottom:2px solid #c8a24a;padding-bottom:6px;margin-bottom:12px;">
        <div style="font-size:15pt;font-weight:700;letter-spacing:0.5px;color:#1a1a1a;">${companyName}</div>
      </div>
      <div id="pdf-content"></div>
      <div style="position:absolute;left:16mm;right:16mm;bottom:10mm;display:flex;justify-content:space-between;font-size:8pt;color:#888;border-top:1px solid #ccc;padding-top:3px;">
        <span>Emitido em: ${dateStr}</span>
        <span></span>
      </div>
    </div>
  `;

  const content = wrapper.firstElementChild as HTMLElement;
  const target = wrapper.querySelector("#pdf-content") as HTMLElement;
  if (content && target && element) {
    target.appendChild(element);
  }

  wrapper.style.position = "absolute";
  wrapper.style.left = "-9999px";
  wrapper.style.top = "0";
  wrapper.style.opacity = "1";
  wrapper.style.pointerEvents = "none";
  wrapper.style.zIndex = "0";

  document.body.appendChild(wrapper);

  console.log("[CONTRACT PDF] rendering element", wrapper, content, target);

  return import("html2pdf.js")
    .then((mod) => {
      console.log("[CONTRACT PDF] PDF generation started");
      return (mod.default || mod)().set({
        margin: 0,
        filename: `contrato-${dateStr.replace(/\//g, "-")}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
        .from(wrapper)
        .save();
    })
    .then(() => {
      console.log("[CONTRACT PDF] PDF generation completed");
      if (wrapper.parentNode) {
        document.body.removeChild(wrapper);
      }
    })
    .catch((e) => {
      console.error("[CONTRACT PDF] PDF generation failed", e);
      if (wrapper.parentNode) {
        document.body.removeChild(wrapper);
      }
      toast.error("Erro ao gerar PDF. Tente novamente.");
    });
}
