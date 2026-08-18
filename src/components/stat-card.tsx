import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  delta?: string;
  icon?: LucideIcon;
  accent?: "primary" | "success" | "warning" | "info" | "destructive";
}

const accentMap = {
  primary: "text-primary bg-primary/10 border-primary/25",
  success: "text-success bg-success/10 border-success/25",
  warning: "text-warning bg-warning/10 border-warning/25",
  info: "text-info bg-info/10 border-info/25",
  destructive: "text-destructive bg-destructive/10 border-destructive/25",
} as const;

export function StatCard({ label, value, delta, icon: Icon, accent = "primary" }: Props) {
  return (
    <div className="glass relative overflow-hidden rounded-2xl border border-border p-5">
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          {delta && (
            <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-success">
              <ArrowUpRight className="h-3 w-3" />
              {delta}
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl border ${accentMap[accent]}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
