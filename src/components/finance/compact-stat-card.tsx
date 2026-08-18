import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  delta?: string;
  icon?: LucideIcon;
  accent?: "primary" | "success" | "warning" | "info" | "destructive" | "muted";
}

const accentMap = {
  primary: "text-primary bg-primary/10 border-primary/25",
  success: "text-success bg-success/10 border-success/25",
  warning: "text-warning bg-warning/10 border-warning/25",
  info: "text-info bg-info/10 border-info/25",
  destructive: "text-destructive bg-destructive/10 border-destructive/25",
  muted: "text-muted-foreground bg-muted/50 border-muted/25",
} as const;

export function CompactStatCard({ label, value, delta, icon: Icon, accent = "primary" }: Props) {
  return (
    <div className="glass relative overflow-hidden rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-1.5 text-xl font-semibold tracking-tight text-foreground truncate">{value}</p>
          {delta && (
            <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-success">
              {delta}
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${accentMap[accent]}`}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
    </div>
  );
}