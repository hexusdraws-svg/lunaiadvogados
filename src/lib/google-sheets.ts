import { SHEET_ID, API_KEY } from "./config";

// Centralized Google Sheets service
// All sheet access should go through this service for consistency and error handling

export async function fetchGoogleSheet(
  sheetName: string,
): Promise<{ values: string[][]; error: string | null }> {
  try {
    // Debug logging to verify environment variables are loaded
    console.log(
      "[GoogleSheets] API_KEY loaded:",
      API_KEY ? "YES (length: " + API_KEY.length + ")" : "NO",
    );

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(sheetName)}?key=${API_KEY}`;


    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      const errorMsg = `HTTP ${response.status}: ${errorText}`;
      console.error(`[GoogleSheets] ERROR for sheet "${sheetName}":`, errorMsg);
      return { values: [], error: errorMsg };
    }

    const data = (await response.json()) as { values?: string[][] };
    const values = data.values ?? [];

    return { values, error: null };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[GoogleSheets] FETCH ERROR for sheet "${sheetName}":`, error);
    return { values: [], error: errorMsg };
  }
}

// Convert sheet values to objects with headers
export function sheetToObjects(values: string[][]): SheetRow[] {
  if (!values || values.length < 2) return [];

  const [headerRow, ...dataRows] = values;
  const headers = headerRow.map((h) => (h ?? "").trim().toLowerCase().replace(/\s+/g, "_"));

  return dataRows.map((row) => {
    const obj: SheetRow = {};
    headers.forEach((header, i) => {
      obj[header] = (row[i] ?? "").trim();
    });
    return obj;
  });
}

export type SheetRow = Record<string, string>;

// Specific sheet fetchers using the centralized service
export async function fetchClientes(): Promise<SheetRow[]> {
  const { values, error } = await fetchGoogleSheet("clientes");
  if (error) {
    console.error("[fetchClientes] Error:", error);
    // Return empty array to prevent UI break
    return [];
  }
  return sheetToObjects(values);
}

export async function fetchProfissionais(): Promise<SheetRow[]> {
  const { values, error } = await fetchGoogleSheet("profissionais");
  if (error) {
    console.error("[fetchProfissionais] Error:", error);
    return [];
  }
  return sheetToObjects(values);
}

export async function fetchLembretesPendentes(): Promise<SheetRow[]> {
  const { values, error } = await fetchGoogleSheet("L.pendentes");
  if (error) {
    console.error("[fetchLembretesPendentes] Error:", error);
    return [];
  }
  return sheetToObjects(values);
}

export async function fetchLembretesEnviados(): Promise<SheetRow[]> {
  const { values, error } = await fetchGoogleSheet("L.enviados");
  if (error) {
    console.error("[fetchLembretesEnviados] Error:", error);
    return [];
  }
  return sheetToObjects(values);
}

export async function fetchBookVisit(): Promise<SheetRow[]> {
  const { values, error } = await fetchGoogleSheet("book_visit");
  if (error) {
    console.error("[fetchBookVisit] Error:", error);
    return [];
  }
  return sheetToObjects(values);
}

export async function fetchFollowUps(): Promise<SheetRow[]> {
  const { values, error } = await fetchGoogleSheet("follow ups");
  if (error) {
    console.error("[fetchFollowUps] Error:", error);
    return [];
  }
  return sheetToObjects(values);
}

export async function fetchApartamentos(): Promise<SheetRow[]> {
  const { values, error } = await fetchGoogleSheet("apartamentos");
  if (error) {
    console.error("[fetchApartamentos] Error:", error);
    return [];
  }
  return sheetToObjects(values);
}

export async function fetchCasas(): Promise<SheetRow[]> {
  const { values, error } = await fetchGoogleSheet("casas");
  if (error) {
    console.error("[fetchCasas] Error:", error);
    return [];
  }
  return sheetToObjects(values);
}

// Export types
export interface SheetTable {
  headers: string[];
  keys: string[];
  rows: SheetRow[];
}
