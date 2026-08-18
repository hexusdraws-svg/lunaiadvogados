import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { PeriodKey, PeriodRange } from "@/hooks/use-financial-period";

interface PeriodSelectorProps {
  periodKey: PeriodKey;
  setPeriodKey: (key: PeriodKey) => void;
  customFrom: Date | null;
  customTo: Date | null;
  setCustom: (from: Date | null, to: Date | null) => void;
  range: PeriodRange;
  labels: Record<PeriodKey, string>;
  compact?: boolean;
}

export function PeriodSelector({
  periodKey,
  setPeriodKey,
  customFrom,
  customTo,
  setCustom,
  range,
  labels,
  compact = false,
}: PeriodSelectorProps) {
  const displayValue = range.from && range.to
    ? `${format(range.from, "dd/MM/yyyy")} — ${format(range.to, "dd/MM/yyyy")}`
    : labels[periodKey];

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        compact ? "text-xs" : "text-sm",
      )}
    >
      <Select value={periodKey} onValueChange={(v) => setPeriodKey(v as PeriodKey)}>
        <SelectTrigger
          className={cn(
            "border-border bg-secondary/30",
            compact ? "h-8 text-xs" : "h-9",
          )}
        >
          <SelectValue placeholder={labels.today} />
        </SelectTrigger>
        <SelectContent align="start">
          {Object.entries(labels).map(([key, label]) => (
            <SelectItem key={key} value={key} className="text-xs">
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {periodKey === "custom" && (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size={compact ? "sm" : "default"}
                className={cn(
                  "justify-start text-left font-normal",
                  compact ? "h-8 text-xs" : "h-9",
                  !customFrom && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customFrom ? format(customFrom, "dd/MM/yyyy") : "Data inicial"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customFrom}
                onSelect={(d) => setCustom(d, customTo)}
              />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground">—</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size={compact ? "sm" : "default"}
                className={cn(
                  "justify-start text-left font-normal",
                  compact ? "h-8 text-xs" : "h-9",
                  !customTo && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customTo ? format(customTo, "dd/MM/yyyy") : "Data final"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customTo}
                onSelect={(d) => setCustom(customFrom, d)}
              />
            </PopoverContent>
          </Popover>
        </>
      )}

      {!compact && (
        <div className="ml-2 flex items-center gap-1 text-xs text-muted-foreground">
          <ChevronDown className="h-3 w-3" />
          <span>{displayValue}</span>
        </div>
      )}
    </div>
  );
}
