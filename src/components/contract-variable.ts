import { Node, mergeAttributes } from "@tiptap/core";
import { humanizeVar } from "@/lib/contracts";

/**
 * Custom inline atom node used to represent a contract variable as a visual chip.
 *
 * - In the editor it is rendered (via node view) as a blue chip showing a human
 *   readable label, e.g. "Cliente Nome" — the user never sees raw HTML.
 * - When serialized with editor.getHTML() it renders a stable span that contains
 *   the {{placeholder}} so it round-trips on reload and so the contract rendering
 *   engine (renderTemplate) keeps working with {{variable}} tokens.
 */
export const ContractVariable = Node.create({
  name: "contractVariable",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      name: {
        default: "",
        parseHTML: (el) => {
          const explicit = el.getAttribute("data-name");
          if (explicit) return explicit;
          const text = el.textContent || "";
          const m = text.match(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/);
          return m ? m[1] : "";
        },
        renderHTML: (attrs) => ({ "data-name": attrs.name }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-variable="contract-variable"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-variable": "contract-variable",
      }),
      `{{${node.attrs.name}}}`,
    ];
  },

  renderText({ node }) {
    return `{{${node.attrs.name}}}`;
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("span");
      dom.setAttribute("data-variable", "contract-variable");
      dom.setAttribute("data-name", node.attrs.name);
      dom.setAttribute("contenteditable", "false");
      dom.className = "contract-var-chip";
      dom.textContent = humanizeVar(node.attrs.name) || node.attrs.name;
      return { dom };
    };
  },
});
