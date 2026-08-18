import { CheckCircle2, AlertCircle, CalendarCheck, UserPlus } from "lucide-react";
import type { FollowUp } from "@/lib/sheets";

const iconFor = (s: FollowUp["status"]) => {
  switch (s) {
    case "Enviado":
      return {
        icon: CheckCircle2,
        color: "text-info bg-info/10 border-info/25",
        label: "Follow-up enviado",
      };
    case "Sem resposta":
      return {
        icon: AlertCircle,
        color: "text-destructive bg-destructive/10 border-destructive/25",
        label: "Cliente sem resposta",
      };
    case "Respondido":
      return {
        icon: UserPlus,
        color: "text-success bg-success/10 border-success/25",
        label: "Novo cliente registado",
      };
    case "Agendado":
      return {
        icon: CalendarCheck,
        color: "text-primary bg-primary/10 border-primary/25",
        label: "Audiência confirmada",
      };
  }
};

export function AutomationFeed({ data, loading }: { data?: FollowUp[]; loading?: boolean }) {
  return (
    <div className="glass overflow-hidden rounded-2xl border border-border">
      <div className="border-b border-border px-6 py-4">
        <h3 className="text-base font-semibold text-foreground">Automação em tempo real</h3>
        <p className="text-xs text-muted-foreground">Eventos disparados pelos workflows</p>
      </div>
      <ul className="divide-y divide-border">
        {loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-6 py-4">
              <div className="h-9 w-9 animate-pulse rounded-xl bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-2 w-1/3 animate-pulse rounded bg-muted" />
              </div>
            </li>
          ))}
        {!loading &&
          data?.slice(0, 8).map((f) => {
            const meta = iconFor(f.status);
            const Icon = meta.icon;
            return (
              <li
                key={f.id}
                className="flex items-start gap-3 px-6 py-4 transition-colors hover:bg-accent/30"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${meta.color}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm font-medium text-foreground">
                      {meta.label} <span className="text-muted-foreground">— {f.lead}</span>
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">{f.date}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{f.message}</p>
                </div>
              </li>
            );
          })}
      </ul>
    </div>
  );
}
