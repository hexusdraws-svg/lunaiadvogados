import { useState, useMemo } from "react";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, addDays, parseISO } from "date-fns";
import { pt as dateFnsPt } from "date-fns/locale";

export type PeriodKey =
  | "today"
  | "week"
  | "month"
  | "last_month"
  | "year"
  | "custom";

export interface PeriodRange {
  from: Date | null;
  to: Date | null;
  label: string;
}

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Hoje",
  week: "Últimos 7 dias",
  month: "Este mês",
  last_month: "Mês passado",
  year: "Este ano",
  custom: "Período personalizado",
};

function computeRange(key: PeriodKey, customFrom: Date | null, customTo: Date | null): PeriodRange {
  const now = new Date();

  switch (key) {
    case "today": {
      const start = startOfDay(now);
      return { from: start, to: endOfDay(now), label: PERIOD_LABELS.today };
    }
    case "week": {
      const to = endOfDay(now);
      const from = startOfDay(addDays(now, -6));
      return { from, to, label: PERIOD_LABELS.week };
    }
    case "month": {
      const from = startOfMonth(now);
      const to = endOfMonth(now);
      return { from, to, label: PERIOD_LABELS.month };
    }
    case "last_month": {
      const firstOfSyntax = startOfMonth(now);
      const lastMonthEnd = endOfDay(addDays(firstOfSyntax, -1));
      const lastMonthStart = startOfDay(startOfMonth(lastMonthEnd));
      return { from: lastMonthStart, to: lastMonthEnd, label: PERIOD_LABELS.last_month };
    }
    case "year": {
      const from = startOfYear(now);
      const to = endOfYear(now);
      return { from, to, label: PERIOD_LABELS.year };
    }
    case "custom": {
      const from = customFrom ? startOfDay(customFrom) : null;
      const to = customTo ? endOfDay(customTo) : null;
      return { from, to, label: PERIOD_LABELS.custom };
    }
    default:
      return { from: null, to: null, label: PERIOD_LABELS.today };
  }
}

export function useFinancialPeriod(initial: PeriodKey = "month") {
  const [periodKey, setPeriodKey] = useState<PeriodKey>(initial);
  const [customFrom, setCustomFrom] = useState<Date | null>(null);
  const [customTo, setCustomTo] = useState<Date | null>(null);

  const range = useMemo(() => computeRange(periodKey, customFrom, customTo), [periodKey, customFrom, customTo]);

  const setCustom = (from: Date | null, to: Date | null) => {
    setCustomFrom(from);
    setCustomTo(to);
    setPeriodKey("custom");
  };

  const fromStr = useMemo(() => range.from ? format(range.from, "yyyy-MM-dd") : null, [range.from]);
  const toStr = useMemo(() => range.to ? format(range.to, "yyyy-MM-dd") : null, [range.to]);

  const isWithinRange = (dateStr: string | null | undefined): boolean => {
    if (!dateStr || !fromStr || !toStr) return false;
    try {
      const d = parseISO(dateStr);
      return d >= startOfDay(parseISO(fromStr)) && d <= endOfDay(parseISO(toStr));
    } catch {
      return false;
    }
  };

  const filterByPaymentDate = (transactions: { payment_date?: string | null; due_date?: string | null; created_at?: string }[]): typeof transactions => {
    return transactions.filter((t) => {
      const dateStr = t.payment_date || t.due_date || t.created_at;
      return isWithinRange(dateStr);
    });
  };

  return {
    periodKey,
    setPeriodKey,
    customFrom,
    customTo,
    setCustom,
    range,
    fromStr,
    toStr,
    isWithinRange,
    filterByPaymentDate,
    PERIOD_LABELS,
  };
}
