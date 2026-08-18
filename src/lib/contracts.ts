// Variable engine for contract templates.
// Variables look like {{snake_case}} inside template HTML.

// All available template variables
export const CLIENT_VARS = [
  "cliente_nome",
  "cliente_primeiro_nome",
  "cliente_ultimo_nome",
  "cliente_bi",
  "cliente_passaporte",
  "cliente_documento",
  "cliente_numero_documento",
  "cliente_tipo_documento",
  "cliente_emissao",
  "cliente_data_emissao",
  "cliente_local_emissao",
  "cliente_nacionalidade",
  "cliente_contacto",
  "cliente_email",
  "cliente_endereco",
  "cliente_data_nascimento",
  "cliente_estado_civil",
  "cliente_profissao",
] as const;

export const PROCESS_VARS = [
  "processo_numero",
  "processo_tipo",
  "processo_estado",
  "processo_prioridade",
  "processo_valor_causa",
  "processo_data_abertura",
  "processo_descricao",
] as const;

export const PROFESSIONAL_VARS = [
  "profissional_nome",
  "profissional_cargo",
  "profissional_email",
  "profissional_contacto",
  "profissional_oab",
  "locador_nome",
  "locador_representante",
  "locador_documento",
  "locador_contacto",
  "locador_email",
] as const;

export const COMPANY_VARS = [
  "empresa_nome",
  "empresa_nuit",
  "empresa_endereco",
  "empresa_telefone",
  "empresa_email",
  "empresa_website",
] as const;

export const CONTRACT_VARS = [
  "contrato_data",
  "contrato_inicio",
  "contrato_fim",
  "contrato_valor",
  "contrato_duracao",
  "contrato_valor_extenso",
  "contrato_numero",
] as const;

export const DATE_VARS = [
  "data_atual",
  "dia",
  "mes",
  "ano",
  "hora",
  "data_por_extenso",
] as const;

/**
 * PARTE 3 — Variáveis do cliente disponíveis para inserção "ao vivo" no editor.
 * Ao clicar, o valor real do cliente é inserido no texto (não uma variável).
 * PARTE 4 — Intencionalmente NÃO inclui "Tipo Documento": o advogado escreve
 * manualmente "Portador do Bilhete de Identidade / Passaporte / Carta de Condução".
 * O painel superior informa qual documento foi usado.
 */
export const DOCUMENT_LIVE_CLIENT_VARS = [
  "cliente_primeiro_nome",
  "cliente_ultimo_nome",
  "cliente_nome",
  "cliente_contacto",
  "cliente_email",
  "cliente_endereco",
  "cliente_numero_documento",
  "cliente_nacionalidade",
  "cliente_data_nascimento",
] as const;

/** Rótulos humanos personalizados para as variáveis ao vivo (PARTE 3). */
export const DOCUMENT_LIVE_VAR_LABELS: Record<string, string> = {
  cliente_primeiro_nome: "Nome",
  cliente_ultimo_nome: "Apelido",
  cliente_nome: "Nome Completo",
  cliente_contacto: "Contacto",
  cliente_email: "Email",
  cliente_endereco: "Morada",
  cliente_numero_documento: "Número Documento",
  cliente_nacionalidade: "Nacionalidade",
  cliente_data_nascimento: "Data Nascimento",
};

export function extractVariables(html: string): string[] {
  const set = new Set<string>();
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) set.add(m[1]);
  return Array.from(set);
}

export function isClientVar(v: string): boolean {
  return (CLIENT_VARS as readonly string[]).includes(v);
}
export function isPropertyVar(v: string): boolean {
  return (PROCESS_VARS as readonly string[]).includes(v);
}
export function isProfissionalVar(v: string): boolean {
  return (PROFESSIONAL_VARS as readonly string[]).includes(v);
}
export function isContractVar(v: string): boolean {
  return (CONTRACT_VARS as readonly string[]).includes(v);
}
export function isCompanyVar(v: string): boolean {
  return (COMPANY_VARS as readonly string[]).includes(v);
}
export function isAutoVar(v: string): boolean {
  return (
    isClientVar(v) ||
    isCompanyVar(v) ||
    isProcessVar(v) ||
    isProfissionalVar(v) ||
    isContractVar(v) ||
    isDateVar(v)
  );
}

export function isProcessVar(v: string): boolean {
  return (PROCESS_VARS as readonly string[]).includes(v);
}

export function isDateVar(v: string): boolean {
  return (DATE_VARS as readonly string[]).includes(v);
}

// Build client values from cliente data
export function buildClientValues(cliente: {
  nome: string;
  documento: string;
  nacionalidade: string;
  emissao: string;
  contacto: string;
  email: string;
  endereco?: string;
  tipo_documento?: string;
  local_emissao?: string;
  data_emissao?: string;
}): Record<string, string> {
  return {
    cliente_nome: cliente.nome || "",
    cliente_bi: cliente.tipo_documento === "BI" ? cliente.documento : "",
    cliente_passaporte: cliente.tipo_documento === "Passaporte" ? cliente.documento : "",
    cliente_documento: cliente.documento || "",
    cliente_numero_documento: cliente.documento || "",
    cliente_tipo_documento: cliente.tipo_documento || "BI",
    cliente_emissao: cliente.emissao || "",
    cliente_data_emissao: cliente.data_emissao || "",
    cliente_local_emissao: cliente.local_emissao || "",
    cliente_nacionalidade: cliente.nacionalidade || "",
    cliente_contacto: cliente.contacto || "",
    cliente_email: cliente.email || "",
    cliente_endereco: cliente.endereco || "",
    cliente_estado_civil: "",
    cliente_profissao: "",
  };
}

// Build contract values from property data
export function buildPropertyValues(property: {
  location?: string;
  type?: string;
  salePrice?: number | null;
  rentPrice?: number | null;
  description?: string;
  videoUrl?: string;
  reference?: string;
  bedrooms?: number;
  bathrooms?: number;
  condominium?: number;
  nome?: string;
  endereco?: string;
  preco?: string;
  quartos?: string;
  banheiros?: string;
}): Record<string, string> {
  return {
    imovel_nome: property.nome || property.location || "",
    imovel_tipo: property.type || "",
    imovel_endereco: property.endereco || property.location || "",
    imovel_localizacao: property.location || "",
    imovel_preco: property.salePrice
      ? formatPrice(property.salePrice)
      : property.preco
        ? property.preco
        : "",
    imovel_preco_venda: property.salePrice ? String(property.salePrice) : "",
    imovel_preco_renda: property.rentPrice ? String(property.rentPrice) : "",
    imovel_quartos: property.bedrooms
      ? String(property.bedrooms)
      : property.quartos
        ? String(property.quartos)
        : "",
    imovel_banheiros: property.bathrooms
      ? String(property.bathrooms)
      : property.banheiros
        ? String(property.banheiros)
        : "",
    imovel_condominio: property.condominium ? formatPrice(property.condominium) : "",
    imovel_descricao: property.description || "",
    imovel_video: property.videoUrl || "",
    imovel_referencia: property.reference || "",
  };
}

// Build professional values
export function buildProfissionalValues(profissional: {
  nome: string;
  cargo?: string;
  contacto?: string;
  email?: string;
}): Record<string, string> {
  return {
    locador_nome: profissional.nome || "",
    locador_representante: profissional.nome || "",
    locador_documento: "",
    locador_contacto: profissional.contacto || "",
    locador_email: profissional.email || "",
    profissional_nome: profissional.nome || "",
    profissional_cargo: profissional.cargo || "",
    profissional_contacto: profissional.contacto || "",
    profissional_email: profissional.email || "",
  };
}

// Build contract values
export function buildContractValues(
  numero: string,
  valor?: string | number,
  inicio?: string,
  fim?: string,
  duracao?: string,
): Record<string, string> {
  return {
    contrato_data: new Date().toLocaleDateString("pt-PT"),
    contrato_inicio: inicio || new Date().toLocaleDateString("pt-PT"),
    contrato_fim: fim || "",
    contrato_valor: valor ? String(valor) : "",
    contrato_duracao: duracao || "",
    contrato_valor_extenso: valor ? numberToWords(Number(valor)) : "",
    contrato_numero: numero,
  };
}

// Render template with all values
export function renderTemplate(html: string, values: Record<string, string>): string {
  return html.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key: string) => {
    const v = values[key];
    return v
      ? escapeHtml(v)
      : `<span style="background:#fef3c7;color:#92400e;padding:0 4px;border-radius:3px">[${key}]</span>`;
  });
}

/**
 * Replace only the variables that have a (non-empty) value, leaving every other
 * {{variable}} token untouched so it can still be edited as a chip afterwards.
 * Used when generating a contract from a template + client data.
 */
export function fillTemplateValues(html: string, values: Record<string, string>): string {
  return html.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, key: string) => {
    const v = values[key];
    return v ? escapeHtml(v) : match;
  });
}

/** Build the full set of {{cliente_*}} values from a Supabase `clientes` row. */
export function buildClientValuesFromRow(cliente: {
  nome?: string | null;
  documento?: string | null;
  tipo_documento?: string | null;
  data_emissao?: string | null;
  data_validade?: string | null;
  local_emissao?: string | null;
  nacionalidade?: string | null;
  naturalidade?: string | null;
  contacto?: string | null;
  email?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  bairro?: string | null;
  provincia?: string | null;
  empresa?: string | null;
  estado_civil?: string | null;
  profissao?: string | null;
  data_nascimento?: string | null;
}): Record<string, string> {
  const doc = cliente.documento || "";
  const tipo = cliente.tipo_documento || "BI";
  const nome = cliente.nome || "";
  const parts = nome.trim().split(/\s+/);
  return {
    cliente_nome: nome,
    cliente_primeiro_nome: parts[0] || "",
    cliente_ultimo_nome: parts.length > 1 ? parts[parts.length - 1] : "",
    cliente_bi: tipo === "BI" ? doc : "",
    cliente_passaporte: tipo === "Passaporte" ? doc : "",
    cliente_documento: doc,
    cliente_numero_documento: doc,
    cliente_nuit: tipo === "NUIT" || tipo === "nuit" ? doc : "",
    cliente_bi_nuit: doc,
    cliente_tipo_documento: tipo,
    cliente_emissao: cliente.data_emissao || "",
    cliente_data_emissao: cliente.data_emissao || "",
    cliente_local_emissao: cliente.local_emissao || "",
    cliente_data_validade: cliente.data_validade || "",
    cliente_nacionalidade: cliente.nacionalidade || "",
    cliente_naturalidade: cliente.naturalidade || "",
    cliente_contacto: cliente.contacto || "",
    cliente_telefone: cliente.contacto || "",
    cliente_email: cliente.email || "",
    cliente_endereco: cliente.endereco || "",
    cliente_morada: cliente.endereco || "",
    cliente_bairro: cliente.bairro || "",
    cliente_data_nascimento: cliente.data_nascimento || "",
    cliente_estado_civil: cliente.estado_civil || "",
    cliente_profissao: cliente.profissao || "",
  };
}

/** Build the {{data_*}} values for the current date. */
export function buildDateValues(d: Date = new Date()): Record<string, string> {
  const meses = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  const dia = d.getDate();
  const mes = d.getMonth();
  const ano = d.getFullYear();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    data_atual: d.toLocaleDateString("pt-PT"),
    dia: pad(dia),
    mes: pad(mes + 1),
    ano: String(ano),
    hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    data_por_extenso: `${dia} de ${meses[mes]} de ${ano}`,
  };
}


function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function humanizeVar(v: string): string {
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function htmlToChips(html: string): string {
  return html.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, varName) => {
    const escaped = varName.replace(/"/g, "&quot;");
    return `<span data-variable="contract-variable" data-name="${escaped}">{{${varName}}}</span>`;
  });
}

export function chipsToHtml(html: string): string {
  return html.replace(
    /<span[^>]*data-variable="contract-variable"[^>]*>\s*\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}\s*<\/span>/g,
    "{{$1}}",
  );
}

// Get label for variable category
export function getVarCategory(
  v: string,
): "Cliente" | "Processo" | "Profissional" | "Contrato" | "Empresa" | "Outro" {
  if (isClientVar(v)) return "Cliente";
  if (isPropertyVar(v)) return "Processo";
  if (isProfissionalVar(v)) return "Profissional";
  if (isContractVar(v)) return "Contrato";
  if (isCompanyVar(v)) return "Empresa";
  return "Outro";
}

// Helper to format price
function formatPrice(n: number): string {
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(n) + " MZN";
}

// Convert number to words (Portuguese)
function numberToWords(num: number): string {
  // Simplified Portuguese number to words - can be expanded
  const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const especial = [
    "dez",
    "onze",
    "doze",
    "treze",
    "quatorze",
    "quinze",
    "dezasseis",
    "dezassete",
    "dezoito",
    "dezanove",
  ];
  const dezenas = [
    "",
    "",
    "vinte",
    "trinta",
    "quarenta",
    "cinquenta",
    "sessenta",
    "setenta",
    "oitenta",
    "noventa",
  ];

  if (num < 10) return unidades[num] || "";
  if (num < 20) return especial[num - 10] || "";
  if (num < 100) {
    const d = Math.floor(num / 10);
    const u = num % 10;
    return dezenas[d] + (u > 0 ? " e " + unidades[u] : "");
  }

  const mil = Math.floor(num / 1000);
  const resto = num % 1000;

  if (mil > 0) {
    return (
      (mil < 10 ? unidades[mil] : numberToWords(mil)) +
      " mil" +
      (resto > 0 ? " " : "") +
      numberToWords(resto)
    );
  }

  return String(num);
}
