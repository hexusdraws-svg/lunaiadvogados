/**
 * Formata valores monetários baseado na moeda da empresa.
 * Single source of truth para formatCurrency em todo o projeto.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  MZN: "MTn",
  USD: "$",
  EUR: "€",
  ZAR: "R",
  GBP: "£",
  AUD: "A$",
  CAD: "C$",
  CHF: "Fr",
  JPY: "¥",
  INR: "₹",
};

export function formatCurrency(value: number | null | undefined, currency: string = "MZN"): string {
  if (value == null) return "—";
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  try {
    const formatted = new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    if (formatted.includes(symbol) || formatted.includes(currency)) return formatted;
    return `${symbol} ${formatted}`;
  } catch {
    return `${symbol} ${value.toLocaleString("pt-PT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

export const getCurrencySymbol = (currency: string): string => {
  return CURRENCY_SYMBOLS[currency] || currency;
};
