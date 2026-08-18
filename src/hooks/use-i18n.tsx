import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { useActiveCompany } from "@/hooks/use-company";
import { supabase } from "@/integrations/supabase/client";
import type { Language, Translations } from "@/lib/i18n";
import { translations } from "@/lib/i18n";

const LANG_KEY = "app_language";

// Get language from localStorage or default to Portuguese
export function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "pt";
  const stored = localStorage.getItem(LANG_KEY);
  return (stored as Language) || "pt";
}

export function setStoredLanguage(lang: Language) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LANG_KEY, lang);
}

// Get currency symbol
export function getCurrencySymbol(currency: string | null): string {
  const symbols: Record<string, string> = {
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
  return symbols[currency || ""] || currency || "MTn";
}

// Date format options
export const DATE_FORMATS = [
  { value: "dd/MM/yyyy", label: "dd/MM/yyyy (Europe/Asia/Africa)" },
  { value: "MM/dd/yyyy", label: "MM/dd/yyyy (US/Canada)" },
  { value: "yyyy-MM-dd", label: "yyyy-MM-dd (ISO)" },
] as const;

export const TIMEZONES = [
  { value: "Africa/Maputo", label: "Africa/Maputo (Mozambique)" },
  { value: "Europe/Lisbon", label: "Europe/Lisbon (Portugal)" },
  { value: "America/New_York", label: "America/New_York (US East)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (US West)" },
  { value: "Europe/London", label: "Europe/London (UK)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (UAE)" },
  { value: "Australia/Sydney", label: "Australia/Sydney" },
] as const;

export const CURRENCIES = [
  { value: "MZN", label: "MTn (Mozambican Metical)" },
  { value: "USD", label: "$ (US Dollar)" },
  { value: "EUR", label: "€ (Euro)" },
  { value: "ZAR", label: "R (South African Rand)" },
  { value: "GBP", label: "£ (British Pound)" },
  { value: "AUD", label: "A$ (Australian Dollar)" },
  { value: "CAD", label: "C$ (Canadian Dollar)" },
  { value: "CHF", label: "Fr (Swiss Franc)" },
  { value: "JPY", label: "¥ (Japanese Yen)" },
  { value: "INR", label: "₹ (Indian Rupee)" },
  { value: "Other", label: "Other" },
] as const;

// Hook for payment methods
export function useCompanyPaymentMethods() {
  const { data: company } = useActiveCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ["company-payment-methods", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("company_payment_methods")
        .select("*")
        .eq("company_id", companyId)
        .order("display_order");

      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        method_key: string;
        method_label: string;
        is_active: boolean;
        display_order: number | null;
      }>;
    },
    enabled: !!companyId,
    staleTime: 5 * 60_000,
  });
}

export const usePaymentMethods = useCompanyPaymentMethods;

// i18n Context
interface I18nContextValue {
  language: Language;
  t: (key: string, options?: { [key: string]: string | undefined; defaultValue?: string }) => string;
  setLanguage: (lang: Language) => void;
  currency: string;
  dateFormat: string;
  timezone: string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// Get initial language synchronously to avoid hydration mismatch
const getInitialLanguage = (): Language => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === "pt" || stored === "en") return stored;
  }
  return "pt";
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const { data: company } = useActiveCompany();

  // Initialize language from localStorage immediately
  const initialLanguage = useMemo(() => getInitialLanguage(), []);

  // Use a ref to track language and ensure stable updates
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  // Força idioma Português no BETA 1. A troca de idioma está desativada temporariamente.
  useEffect(() => {
    if (language !== "pt") {
      setLanguageState("pt");
      setStoredLanguage("pt");
    }
  }, [language]);

  // Sync language with company settings (apenas para manter consistência, mas força PT)
  useEffect(() => {
    if (company?.language && company.language !== language) {
      setLanguageState("pt");
      setStoredLanguage("pt");
    }
  }, [company?.language]);

  const setLanguage = useCallback((lang: Language) => {
    // Troca de idioma desativada temporariamente para o BETA 1
    // Ignora qualquer tentativa de mudar para inglês
    if (lang !== "pt") {
      setLanguageState("pt");
      setStoredLanguage("pt");
    }
  }, []);

  const t = useCallback(
    (key: string, options?: { [key: string]: string | undefined; defaultValue?: string }): string => {
      const keys = key.split(".");
      let value: unknown = translations[language];

      for (const k of keys) {
        if (
          typeof value === "object" &&
          value !== null &&
          k in (value as Record<string, unknown>)
        ) {
          value = (value as Record<string, unknown>)[k];
        } else {
          value = undefined;
          break;
        }
      }

      if (typeof value !== "string") {
        const dict = translations[language] as Record<string, unknown> | undefined;
        if (dict && key in dict) {
          value = dict[key];
        }
      }

      if (typeof value !== "string") {
        return options?.defaultValue ?? "";
      }

      let result = value;

      // Support interpolation
      if (options) {
        Object.entries(options).forEach(([k, v]) => {
          if (k !== "defaultValue") {
            result = result.replace(`{{${k}}}`, v || "");
          }
        });
      }

      return result;
    },
    [language],
  );

  const contextValue = useMemo(
    () => ({
      language: "pt" as Language,
      t,
      setLanguage,
      currency: company?.currency || "MZN",
      dateFormat: company?.date_format || "dd/MM/yyyy",
      timezone: company?.timezone || "Africa/Maputo",
    }),
    [language, t, setLanguage, company?.currency, company?.date_format, company?.timezone],
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Return Portuguese defaults if not in provider
    return {
      language: "pt" as Language,
      t: (key: string) => {
        const keys = key.split(".");
        let value: unknown = translations.pt;
        for (const k of keys) {
          if (typeof value === "object" && value !== null && k in (value as Record<string, unknown>)) {
            value = (value as Record<string, unknown>)[k];
          } else {
            value = undefined;
            break;
          }
        }
        return typeof value === "string" ? value : "";
      },
      setLanguage: () => {},
      currency: "MZN",
      dateFormat: "dd/MM/yyyy",
      timezone: "Africa/Maputo",
    };
  }
  return ctx;
}
