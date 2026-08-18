import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const COUNTRIES = [
  { code: "+258", country: "🇲🇿", name: "Moçambique" },
  { code: "+351", country: "🇵🇹", name: "Portugal" },
  { code: "+55", country: "🇧🇷", name: "Brasil" },
  { code: "+244", country: "🇦🇴", name: "Angola" },
  { code: "+27", country: "🇿🇦", name: "África do Sul" },
  { code: "+1", country: "🇺🇸", name: "Estados Unidos" },
  { code: "+44", country: "🇬🇧", name: "Reino Unido" },
  { code: "+49", country: "🇩🇪", name: "Alemanha" },
  { code: "+33", country: "🇫🇷", name: "França" },
  { code: "+34", country: "🇪🇸", name: "Espanha" },
] as const;

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  countryCode?: string;
  onCountryCodeChange?: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function PhoneInput({
  value = "",
  onChange,
  countryCode = "+258",
  onCountryCodeChange,
  placeholder = "84 607 8509",
  disabled,
  className,
}: PhoneInputProps) {
  const [open, setOpen] = useState(false);

  const selected = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0];

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only digits, spaces, and hyphens
    const cleaned = e.target.value.replace(/[^\d\s-]/g, "");
    onChange?.(cleaned);
  };

  return (
    <div className={cn("flex items-center rounded-md border border-input bg-background", className)}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        className={cn(
          "flex items-center gap-1 px-3 py-2 text-sm hover:bg-muted/50 transition-colors border-r border-input",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        disabled={disabled}
      >
        <span className="text-base">{selected.country}</span>
        <span className="text-xs text-muted-foreground">{selected.code}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-background shadow-lg">
            {COUNTRIES.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  onCountryCodeChange?.(c.code);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50",
                  c.code === countryCode && "bg-muted",
                )}
              >
                <span className="text-base">{c.country}</span>
                <span>{c.code}</span>
                <span className="text-muted-foreground text-xs">{c.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <input
        type="tel"
        value={value}
        onChange={handleNumberChange}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
      />
    </div>
  );
}
