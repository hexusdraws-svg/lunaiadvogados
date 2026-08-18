import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatDateForDisplay,
  formatDateForDb,
  applyDateMask,
  validateDate,
} from "@/lib/date-utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { pt as dateFnsPt, enUS } from "date-fns/locale";

interface DateInputProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  label?: string;
  locale?: "pt" | "en";
  showCalendar?: boolean;
}

export function DateInput({
  value,
  onChange,
  placeholder = "DD/MM/AAAA",
  required,
  className,
  label,
  locale = "pt",
  showCalendar = true,
}: DateInputProps) {
  const [displayValue, setDisplayValue] = useState(() => formatDateForDisplay(value));
  const [touched, setTouched] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      const display = formatDateForDisplay(value);
      setDisplayValue(display);
    }
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const masked = applyDateMask(raw);

      const prevDigitsBeforeCursor = raw
        .slice(0, e.target.selectionStart)
        .replace(/\D/g, "").length;

      setDisplayValue(masked);
      setTouched(true);

      const digits = masked.replace(/\D/g, "");
      if (digits.length === 8) {
        const dbValue = formatDateForDb(masked);
        if (dbValue) onChange(dbValue);
      } else if (digits.length === 0) {
        onChange(null);
      }

      let newPos = 0;
      let digitsCount = 0;
      for (let i = 0; i < masked.length && digitsCount < prevDigitsBeforeCursor; i++) {
        if (/\d/.test(masked[i])) digitsCount++;
        newPos = i + 1;
      }

      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(newPos, newPos);
        }
      });
    },
    [onChange]
  );

  const handleCalendarSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const dbValue = format(selectedDate, "yyyy-MM-dd");
      const display = format(selectedDate, "dd/MM/yyyy");
      setDisplayValue(display);
      onChange(dbValue);
    } else {
      setDisplayValue("");
      onChange(null);
    }
    setOpen(false);
    inputRef.current?.focus();
  };

  const parsedDate = useCallback(() => {
    if (!value) return undefined;
    const parts = value.split("-");
    if (parts.length === 3) {
      const [y, m, d] = parts.map(Number);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m - 1, d);
      }
    }
    return undefined;
  }, [value])();

  const validation = touched ? validateDate(displayValue) : null;
  const digitCount = displayValue.replace(/\D/g, "").length;
  const showError = validation && !validation.valid && digitCount > 0;
  const showRequired = required && touched && digitCount === 0 && displayValue.length > 0;

  return (
    <div className="space-y-1 relative">
      {label && <label className="text-xs text-muted-foreground">{label}</label>}
      {showCalendar ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Input
                ref={inputRef}
                value={displayValue}
                onChange={handleChange}
                placeholder={placeholder}
                maxLength={10}
                inputMode="numeric"
                required={required}
                className={cn("pr-10", showError || showRequired ? "border-destructive" : "", className)}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  setOpen(!open);
                }}
                type="button"
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={parsedDate}
              onSelect={handleCalendarSelect}
              locale={locale === "en" ? enUS : dateFnsPt}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      ) : (
        <div className="relative">
          <Input
            ref={inputRef}
            value={displayValue}
            onChange={handleChange}
            placeholder={placeholder}
            maxLength={10}
            inputMode="numeric"
            required={required}
            className={cn("pr-10", showError || showRequired ? "border-destructive" : "", className)}
          />
          <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      )}
      {showRequired && (
        <p className="text-xs text-destructive">Campo obrigatório</p>
      )}
      {showError && validation.error && (
        <p className="text-xs text-destructive">{validation.error}</p>
      )}
    </div>
  );
}
