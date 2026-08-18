const DATE_SEP = "/";

export function formatDateForDisplay(dbDate: string | null | undefined): string {
  if (!dbDate) return "";
  const trimmed = dbDate.trim();
  if (!trimmed) return "";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
  const parts = trimmed.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    if (/^\d{4}$/.test(y) && /^\d{1,2}$/.test(m) && /^\d{1,2}$/.test(d)) {
      return `${d.padStart(2, "0")}${DATE_SEP}${m.padStart(2, "0")}${DATE_SEP}${y}`;
    }
  }
  return trimmed;
}

export function formatDateForDb(displayDate: string): string | null {
  const trimmed = displayDate.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 8) {
    const d = digits.slice(0, 2);
    const m = digits.slice(2, 4);
    const y = digits.slice(4, 8);
    return `${y}-${m}-${d}`;
  }
  return null;
}

export function applyDateMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const d = digits.slice(0, 2);
  const m = digits.slice(2, 4);
  const y = digits.slice(4, 8);
  let result = d;
  if (m) result += DATE_SEP + m;
  if (y) result += DATE_SEP + y;
  return result;
}

export function validateDate(displayDate: string): { valid: boolean; error?: string } {
  if (!displayDate || displayDate.trim() === "") {
    return { valid: true };
  }
  const digits = displayDate.replace(/\D/g, "");
  if (digits.length !== 8) {
    return { valid: false, error: "Data incompleta" };
  }
  const d = parseInt(digits.slice(0, 2), 10);
  const m = parseInt(digits.slice(2, 4), 10);
  const y = parseInt(digits.slice(4, 8), 10);
  if (m < 1 || m > 12) {
    return { valid: false, error: `Mês inválido (1-12)` };
  }
  if (d < 1) {
    return { valid: false, error: "Dia inválido" };
  }
  const daysInMonth = new Date(y, m, 0).getDate();
  if (d > daysInMonth) {
    return { valid: false, error: `Dia inválido para o mês (máx. ${daysInMonth})` };
  }
  if (m === 2 && d === 29) {
    const isLeap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
    if (!isLeap) {
      return { valid: false, error: "Ano não bissexto" };
    }
  }
  return { valid: true };
}

export function isValidDateString(value: string): boolean {
  return validateDate(value).valid;
}
