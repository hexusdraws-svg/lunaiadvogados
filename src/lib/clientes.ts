import { fetchGoogleSheet, type SheetRow } from "./google-sheets";

export interface Cliente {
  id: string;
  nome: string;
  documento: string;
  contacto: string;
  nacionalidade: string;
  emissao: string;
  email: string;
  endereco: string;
  tipo_documento: string;
  local_emissao: string;
  data_emissao: string;
  raw: SheetRow;
}

function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    for (const rk of Object.keys(row)) {
      if (rk.toLowerCase().replace(/\s+/g, "_") === k) return row[rk];
    }
  }
  return "";
}

export async function fetchClientes(): Promise<Cliente[]> {
  const rows = await fetchGoogleSheet("clientes");
  const all = rows.values ?? [];
  if (all.length < 2) return [];
  const [header, ...body] = all;
  const headers = header.map((h) => (h ?? "").trim().toLowerCase().replace(/\s+/g, "_"));

  return body
    .map<Cliente>((r, i) => {
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => (row[h] = (r[idx] ?? "").trim()));
      return {
        id: String(i + 1),
        nome: pick(row, ["nome", "nome_completo", "name", "cliente"]),
        documento: pick(row, ["bi", "passaporte", "documento", "n_documento", "numero_documento"]),
        contacto: pick(row, ["contacto", "telefone", "phone"]),
        nacionalidade: pick(row, ["nacionalidade", "nationality"]),
        emissao: pick(row, ["emissao", "data_emissao", "emissão", "data_de_emissao"]),
        email: pick(row, ["email", "e-mail"]),
        endereco: pick(row, ["endereco", "endereço", "address"]),
        tipo_documento: pick(row, ["tipo_documento", "tipo documento"]) || "BI",
        local_emissao: pick(row, ["local_emissao", "local emissão", "local_de_emissao"]),
        data_emissao: pick(row, ["data_emissao", "data emissão", "data_de_emissao"]),
        raw: row,
      };
    })
    .filter((c) => c.nome || c.documento);
}

export interface NovoCliente {
  nome: string;
  nacionalidade: string;
  tipo_documento: string;
  numero_documento: string;
  local_emissao: string;
  data_emissao: string;
  contacto: string;
  email: string;
  endereco: string;
}

export async function submitCliente(c: NovoCliente, webhookUrl: string) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(c),
  });
  if (!res.ok) throw new Error(`Webhook HTTP ${res.status}`);
  return res.text();
}
