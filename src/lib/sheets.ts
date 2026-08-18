import { SHEET_ID, API_KEY } from "./config";

export type SheetRow = Record<string, string>;

export interface SheetTable {
  headers: string[];
  keys: string[];
  rows: SheetRow[];
}

// Validate that required config is available
const VALID_SHEET_ID = SHEET_ID || "";
const VALID_API_KEY = API_KEY || "";

async function fetchSheetTable(range: string): Promise<SheetTable> {
  // Check if configuration is available
  if (!VALID_SHEET_ID || !VALID_API_KEY) {
    console.error("[fetchSheetTable] Missing configuration - SHEET_ID or API_KEY is empty");
    return { headers: [], keys: [], rows: [] };
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${VALID_SHEET_ID}/values/${encodeURIComponent(range)}?key=${VALID_API_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[fetchSheetTable] HTTP error ${res.status}: ${errorText}`);
      throw new Error(`Sheet ${range} HTTP ${res.status}: ${errorText}`);
    }
    const json = (await res.json()) as { values?: string[][] };
    const all = json.values ?? [];
    if (all.length === 0) return { headers: [], keys: [], rows: [] };
    const [header, ...body] = all;
    const headers = header.map((h) => (h ?? "").trim());
    const keys = headers.map((h) => h.toLowerCase().replace(/\s+/g, "_"));
    const rows = body.map((r) => {
      const obj: SheetRow = {};
      keys.forEach((k, i) => (obj[k] = (r[i] ?? "").trim()));
      return obj;
    });
    return { headers, keys, rows };
  } catch (error) {
    console.error(`[fetchSheetTable] Error fetching ${range}:`, error);
    throw error;
  }
}

async function fetchSheet(range: string): Promise<SheetRow[]> {
  const { rows } = await fetchSheetTable(range);
  return rows;
}

// ---------- Types ----------
export interface FollowUp {
  id: string;
  lead: string;
  message: string;
  status: "Enviado" | "Sem resposta" | "Respondido" | "Agendado";
  channel: string;
  date: string;
}

export interface Visit {
  id: string;
  lead: string;
  contact: string;
  date: string; // ISO yyyy-mm-dd
  time: string;
  reference: string;
  visitType: string;
}

export type PropertyKind = "apartamentos" | "casas";

export interface Property {
  id: string;
  kind: PropertyKind;
  location: string;
  type: string;
  saleRange: string;
  rentRange: string;
  salePrice: number | null;
  rentPrice: number | null;
  description: string;
  videoUrl: string;
}

// ---------- Helpers ----------
function parsePrice(v: string): number | null {
  if (!v) return null;
  // remove currency words, spaces; treat both . and , as thousand separators in MZN-style "8.000.000" or "8,000,000"
  const clean = v.replace(/[^\d.,]/g, "");
  if (!clean) return null;
  // if multiple separators, strip all to get integer
  const onlyDigits = clean.replace(/[.,]/g, "");
  const n = Number(onlyDigits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseDateISO(v: string): string {
  if (!v) return "";
  const iso = /^\d{4}-\d{2}-\d{2}/.exec(v);
  if (iso) return v.slice(0, 10);
  const m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/.exec(v);
  if (m) {
    const [, d, mo, y] = m;
    const yyyy = y.length === 2 ? `20${y}` : y;
    return `${yyyy}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const d = new Date(v);
  return Number.isNaN(+d) ? "" : d.toISOString().slice(0, 10);
}

function readField(row: SheetRow, keys: string[]): string {
  for (const k of keys) if (row[k]) return row[k];
  return "";
}

// ---------- Adapters ----------
export async function getVisits(): Promise<{ data: Visit[]; error: string | null }> {
  try {
    const rows = await fetchSheet("book_visit");
    const data = rows
      .map<Visit>((r, i) => ({
        id: String(i + 1),
        lead: readField(r, ["nome", "lead", "name", "cliente"]),
        contact: readField(r, ["contacto", "contact", "telefone", "phone", "email"]),
        reference: readField(r, ["referencia", "referência", "imovel", "imóvel", "ref"]),
        visitType: readField(r, ["visita", "tipo", "tipo_visita"]),
        date: parseDateISO(readField(r, ["data", "date"])),
        time: readField(r, ["hora", "time"]),
      }))
      .filter((v) => v.lead || v.reference);
    return { data, error: null };
  } catch (e) {
    return { data: [], error: (e as Error).message };
  }
}

function rowsToProperties(rows: SheetRow[], kind: PropertyKind): Property[] {
  return rows
    .map<Property>((r, i) => ({
      id: `${kind}-${i + 1}`,
      kind,
      location: readField(r, ["location", "localizacao", "localização", "zona", "bairro"]),
      type: readField(r, ["tipo", "type", "tipologia"]),
      saleRange: readField(r, ["range(venda)", "range_venda", "venda_range"]),
      rentRange: readField(r, ["range(renda)", "range_renda", "renda_range"]),
      salePrice: parsePrice(readField(r, ["venda", "preco_venda", "sale_price"])),
      rentPrice: parsePrice(readField(r, ["renda", "preco_renda", "rent_price"])),
      description: readField(r, ["descrição", "descricao", "description", "desc"]),
      videoUrl: readField(r, ["link", "video", "vídeo", "video_url"]),
    }))
    .filter((p) => p.location || p.videoUrl);
}

export async function getProperties(
  kind: PropertyKind,
): Promise<{ data: Property[]; error: string | null }> {
  try {
    let range: string;
    if (kind === "apartamentos") {
      range = "apartamentos";
    } else if (kind === "casas") {
      range = "casas";
    } else {
      throw new Error(`Invalid property kind: ${kind}`);
    }

    const rows = await fetchSheet(range);
    return { data: rowsToProperties(rows, kind), error: null };
  } catch (e) {
    return { data: [], error: (e as Error).message };
  }
}

// ---------- Follow-ups ----------
export async function getFollowUps(): Promise<{ data: FollowUp[]; error: string | null }> {
  try {
    const rows = await fetchSheet("follow ups");
    const allowed: FollowUp["status"][] = ["Enviado", "Sem resposta", "Respondido", "Agendado"];
    const data = rows.map<FollowUp>((r, i) => {
      const raw = readField(r, ["status"]);
      const status = allowed.find((a) => a.toLowerCase() === raw.toLowerCase()) ?? "Enviado";
      return {
        id: String(i + 1),
        lead: readField(r, ["lead", "name", "cliente", "nome"]),
        message: readField(r, ["message", "mensagem"]),
        status,
        channel: readField(r, ["channel", "canal"]) || "WhatsApp",
        date: readField(r, ["date", "data"]),
      };
    });
    return { data, error: null };
  } catch (e) {
    return { data: [], error: (e as Error).message };
  }
}

// Derived clients
export interface Lead {
  id: string;
  name: string;
  neighborhood: string;
  budget: string;
  status: "Qualificado" | "Em negociação" | "Sem resposta" | "Visita marcada";
  visit: string;
  notes: string;
}

export function clientsFromVisits(visits: Visit[]): Lead[] {
  return visits.map((v) => ({
    id: v.id,
    name: v.lead,
    neighborhood: v.reference,
    budget: "—",
    status: "Visita marcada",
    visit: v.date && v.time ? `${v.date} ${v.time}` : "—",
    notes: v.contact,
  }));
}

// Video helpers
export function toDrivePreview(url: string): string | null {
  const m = /drive\.google\.com\/file\/d\/([^/]+)/.exec(url);
  if (!m) return null;
  return `https://drive.google.com/file/d/${m[1]}/preview`;
}

export function formatPrice(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(n) + " MZN";
}

// ---------- Raw follow-ups (dynamic columns) ----------
export async function getFollowUpsRaw(): Promise<{ data: SheetTable; error: string | null }> {
  try {
    const table = await fetchSheetTable("follow ups");
    return { data: table, error: null };
  } catch (e) {
    return { data: { headers: [], keys: [], rows: [] }, error: (e as Error).message };
  }
}

// ---------- Reminders ----------
export type ReminderKind = "pendentes" | "enviados";

export interface Reminder {
  id: string;
  client: string;
  contact: string;
  date: string;
  time: string;
  property: string;
  status: string;
  type: string;
  notes: string;
  raw: SheetRow;
}

function rowsToReminders(rows: SheetRow[], kind: ReminderKind): Reminder[] {
  return rows
    .map<Reminder>((r, i) => ({
      id: `${kind}-${i + 1}`,
      client: readField(r, ["cliente", "nome", "lead", "name"]),
      contact: readField(r, ["contacto", "contact", "telefone", "phone"]),
      date: parseDateISO(readField(r, ["data", "date"])),
      time: readField(r, ["hora", "time", "horário", "horario"]),
      property: readField(r, ["imovel", "imóvel", "referencia", "referência", "ref", "property"]),
      status: readField(r, ["status", "estado"]) || (kind === "pendentes" ? "Pendente" : "Enviado"),
      type: readField(r, ["tipo", "type", "lembrete"]),
      notes: readField(r, ["observação", "observacao", "obs", "notas", "notes"]),
      raw: r,
    }))
    .filter((r) => Object.values(r.raw).some(Boolean));
}

export async function getReminders(
  kind: ReminderKind,
): Promise<{ data: Reminder[]; headers: string[]; error: string | null }> {
  const range = kind === "pendentes" ? "L.pendentes" : "L.enviados";
  try {
    const table = await fetchSheetTable(range);
    return { data: rowsToReminders(table.rows, kind), headers: table.headers, error: null };
  } catch (e) {
    return { data: [], headers: [], error: (e as Error).message };
  }
}
