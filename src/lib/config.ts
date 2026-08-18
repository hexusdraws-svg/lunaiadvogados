// Operational config — Sheets configuration.
// Requires Vite env vars for security (no hardcoded API keys or sheet IDs).
// Falls back to process.env for SSR (server-side rendering).

export const SHEET_ID = import.meta.env?.VITE_SHEET_ID || process.env.SHEET_ID;
export const API_KEY =
  import.meta.env?.VITE_GOOGLE_SHEETS_API_KEY || process.env.GOOGLE_SHEETS_API_KEY;
