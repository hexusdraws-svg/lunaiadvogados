import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle, FontSize } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import { TableKit } from "@tiptap/extension-table";
import { ContractVariable } from "@/components/contract-variable";

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Variable,
  Table as TableIcon,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/hooks/use-i18n";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  humanizeVar,
  CLIENT_VARS,
  PROCESS_VARS,
  PROFESSIONAL_VARS,
  CONTRACT_VARS,
  COMPANY_VARS,
  DATE_VARS,
} from "@/lib/contracts";

export interface TipTapEditorApi {
  insertVariable: (variable: string) => void;
  /** Insert plain text at the current cursor without losing focus/scroll. */
  insertText: (text: string) => void;
}

interface Props {
  value: string;
  onChange: (html: string) => void;
  paper?: boolean;
  insertVariable?: (variable: string) => void;
  /** Hide the built-in "Inserir variável" button (when variables live in an external sidebar). */
  hideVariables?: boolean;
  /** Receives an imperative API so external UI can insert variables at the cursor. */
  apiRef?: React.MutableRefObject<TipTapEditorApi | null>;
}

const MM_TO_PX = 96 / 25.4;
const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const PAGE_PAD_Y_MM = 25;
const PAGE_PAD_X_MM = 22;
const PAGE_GAP_PX = 24;
const PAGE_H_PX = PAGE_H_MM * MM_TO_PX;

export function TipTapEditor({ value, onChange, paper = false, hideVariables = false, apiRef }: Props) {
  const [pages, setPages] = useState(1);
  const measureRef = useRef<() => void>(() => {});
  const { t } = useI18n();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      FontSize.configure({ types: ["textStyle"] }),
      FontFamily.configure({ types: ["textStyle"] }),
      TableKit,
      ContractVariable,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],

    content: value,

    immediatelyRender: false,

    editorProps: {
      attributes: {
        class: paper
          ? "tiptap-page-editor focus:outline-none"
          : "prose prose-invert max-w-none min-h-[500px] p-6 focus:outline-none bg-card rounded-b-lg",
      },
    },

    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      measureRef.current();
    },
  });

  // Measure content height and compute how many A4 pages are needed.
  useEffect(() => {
    if (!editor) return;
    const recalc = () => {
      const dom = editor.view.dom as HTMLElement;
      const contentHeight = dom.getBoundingClientRect().height;
      const perPage = PAGE_H_PX + PAGE_GAP_PX;
      const needed = Math.max(1, Math.ceil(contentHeight / perPage));
      setPages((prev) => (needed === prev ? prev : needed));
    };
    measureRef.current = recalc;
    recalc();

    const dom = editor.view.dom as HTMLElement;
    const ro = new ResizeObserver(() => recalc());
    ro.observe(dom);
    return () => ro.disconnect();
  }, [editor]);

  useEffect(() => {
    if (!editor || !value) return;
    const html = editor.getHTML();
    if (value !== html) {
      editor.commands.setContent(value);
      measureRef.current();
    }
  }, [editor, value]);

  if (!editor) return null;

  const insertSpecificVariable = (variable: string) => {
    editor
      .chain()
      .focus()
      .insertContent({ type: "contractVariable", attrs: { name: variable } })
      .insertContent(" ")
      .run();
  };

  // Insert a resolved value as plain text at the caret, keeping focus & scroll.
  // Uses insertContent (not setContent) so the editor is never re-rendered and
  // the cursor stays exactly where it was.
  const insertPlainText = (text: string) => {
    if (!text) return;
    editor.chain().focus().insertContent(text).run();
  };

  if (apiRef) {
    apiRef.current = {
      insertVariable: insertSpecificVariable,
      insertText: insertPlainText,
    };
  }

  const toolbar = (
    <div className="sticky top-0 z-50 flex flex-wrap items-center gap-1 border-b border-border bg-white p-2 shadow-sm">
      <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
        <Bold className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
        <Italic className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")}>
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolBtn>

      <div className="mx-1 h-5 w-px bg-border" />

      <Select
        value={editor.getAttributes("textStyle").fontFamily || "default"}
        onValueChange={(v) => {
          if (v === "default") {
            editor.chain().focus().unsetFontFamily().run();
          } else {
            editor.chain().focus().setFontFamily(v).run();
          }
        }}
      >
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue placeholder="Fonte" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Fonte padrão</SelectItem>
          <SelectItem value="'Times New Roman'">Times New Roman</SelectItem>
          <SelectItem value="Georgia">Georgia</SelectItem>
          <SelectItem value="Arial">Arial</SelectItem>
          <SelectItem value="Calibri">Calibri</SelectItem>
          <SelectItem value="'Courier New'">Courier New</SelectItem>
          <SelectItem value="Garamond">Garamond</SelectItem>
          <SelectItem value="Verdana">Verdana</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={editor.getAttributes("textStyle").fontSize || "default"}
        onValueChange={(v) => {
          if (v === "default") {
            editor.chain().focus().unsetFontSize().run();
          } else {
            editor.chain().focus().setFontSize(v).run();
          }
        }}
      >
        <SelectTrigger className="h-8 w-[80px] text-xs">
          <SelectValue placeholder="Tamanho" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Padrão</SelectItem>
          <SelectItem value="10pt">10pt</SelectItem>
          <SelectItem value="11pt">11pt</SelectItem>
          <SelectItem value="12pt">12pt</SelectItem>
          <SelectItem value="14pt">14pt</SelectItem>
          <SelectItem value="16pt">16pt</SelectItem>
          <SelectItem value="18pt">18pt</SelectItem>
          <SelectItem value="24pt">24pt</SelectItem>
        </SelectContent>
      </Select>

      <div className="mx-1 h-5 w-px bg-border" />

      <ToolBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
      >
        <Heading1 className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
      >
        <Heading2 className="h-3.5 w-3.5" />
      </ToolBtn>

      <div className="mx-1 h-5 w-px bg-border" />

      <ToolBtn
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
      >
        <AlignRight className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        active={editor.isActive({ textAlign: "justify" })}
      >
        <AlignJustify className="h-3.5 w-3.5" />
      </ToolBtn>

      <div className="mx-1 h-5 w-px bg-border" />

      <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>
        <List className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
      >
        <TableIcon className="h-3.5 w-3.5" />
      </ToolBtn>

      <div className="mx-1 h-5 w-px bg-border" />

      <ToolBtn onClick={() => editor.chain().focus().undo().run()}>
        <Undo className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().redo().run()}>
        <Redo className="h-3.5 w-3.5" />
      </ToolBtn>

      {!hideVariables && (
        <div className="ml-auto">
          <Sheet>
          <SheetTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Variable className="h-3.5 w-3.5" />
              Inserir variável
            </Button>
          </SheetTrigger>

          <SheetContent className="w-[400px]">
            <SheetHeader>
              <SheetTitle>Inserir Variável</SheetTitle>
            </SheetHeader>

            <Tabs defaultValue="cliente" className="mt-4">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="cliente">{t("client")}</TabsTrigger>
                <TabsTrigger value="processo">{t("process")}</TabsTrigger>
                <TabsTrigger value="profissional">Prof.</TabsTrigger>
                <TabsTrigger value="contrato">Contr.</TabsTrigger>
                <TabsTrigger value="empresa">Empr.</TabsTrigger>
                <TabsTrigger value="datas">Datas</TabsTrigger>
              </TabsList>

              {[
                ["cliente", CLIENT_VARS],
                ["processo", PROCESS_VARS],
                ["profissional", PROFESSIONAL_VARS],
                ["contrato", CONTRACT_VARS],
                ["empresa", COMPANY_VARS],
                ["datas", DATE_VARS],
              ].map(([tab, vars]) => (
                <TabsContent
                  key={tab as string}
                  value={tab as string}
                  className="mt-3 max-h-80 overflow-y-auto space-y-1.5"
                >
                  {(vars as readonly string[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => insertSpecificVariable(v)}
                      className="flex w-full justify-between rounded-md border border-border bg-card px-3 py-2 text-left text-xs hover:bg-accent"
                    >
                      <code className="text-primary">{`{{${v}}}`}</code>

                      <span className="text-muted-foreground">{humanizeVar(v)}</span>
                    </button>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  );

  if (!paper) {
    return (
      <div className="flex h-full w-full flex-col">
        {toolbar}
        <div className="flex-1 overflow-y-auto">
          <EditorContent editor={editor} />
        </div>
      </div>
    );
  }

  const canvasHeight = `calc(${pages} * ${PAGE_H_MM}mm + ${(pages - 1) * PAGE_GAP_PX}px)`;
  const editorMinHeight = canvasHeight;

  return (
    <div className="flex h-full w-full flex-col">
      {toolbar}
      <div className="a4-scroll flex-1 overflow-auto bg-[#1a1d24] py-8">
        <div className="a4-canvas relative mx-auto" style={{ minHeight: canvasHeight, width: `${PAGE_W_MM}mm` }}>
          {/* Page sheets (visual only, behind the editable content) */}
          <div className="a4-pages pointer-events-none absolute inset-0 flex flex-col items-center">
            {Array.from({ length: pages }).map((_, i) => (
              <div
                key={i}
                className="a4-page"
                style={{
                  width: `${PAGE_W_MM}mm`,
                  height: `${PAGE_H_MM}mm`,
                  marginBottom: i < pages - 1 ? `${PAGE_GAP_PX}px` : 0,
                }}
              >
                <span className="a4-page-number">Página {i + 1}</span>
              </div>
            ))}
          </div>

          {/* Editable content overlay — aligned with the page sheets */}
          <div className="relative z-10" style={{ minHeight: editorMinHeight }}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ onClick, active, children }: { onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground ${
        active ? "bg-accent text-foreground" : ""
      }`}
    >
      {children}
    </button>
  );
}
