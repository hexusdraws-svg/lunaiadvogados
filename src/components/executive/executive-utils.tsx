import { useNavigate } from "@tanstack/react-router";
import { useI18n } from "@/hooks/use-i18n";
import { PROCESS_STATUS_LABELS, PROCESS_STATUS_STYLES, PROCESS_PRIORITY_LABELS, PROCESS_PRIORITY_STYLES } from "@/lib/processos";

export function useExecNavigate() {
  const navigate = useNavigate();
  return (target: { to: string; id?: string } | null | undefined) => {
    if (!target) return;
    if (target.id) {
      navigate({ to: target.to as "/processos/$id", params: { id: target.id } as never });
    } else {
      navigate({ to: target.to as "/audiencias" });
    }
  };
}

export function formatRelativeTime(iso: string | null, language: string): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (language === "en") {
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  }
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} d`;
}

export function formatDateTime(iso: string | null, dateFormat: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  if (dateFormat === "yyyy-MM-dd") {
    return d.toISOString().slice(0, 10);
  }
  if (dateFormat === "MM/dd/yyyy") {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${mm}/${dd}/${d.getFullYear()}`;
  }
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function ProcessStatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const label = t(`process.status.${status}`) || (PROCESS_STATUS_LABELS[status] ?? status);
  const style = PROCESS_STATUS_STYLES[status] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string | null }) {
  const { t } = useI18n();
  const p = priority ?? "normal";
  const label = t(`process.priority.${p}`) || (PROCESS_PRIORITY_LABELS[p] ?? p);
  const style = PROCESS_PRIORITY_STYLES[p] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}

export function Section({
  title,
  icon: Icon,
  accent,
  action,
  children,
  className = "",
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "primary" | "success" | "warning" | "info" | "destructive";
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const accentBar: Record<string, string> = {
    primary: "from-primary/60",
    success: "from-success/60",
    warning: "from-warning/60",
    info: "from-info/60",
    destructive: "from-destructive/60",
  };
  return (
    <section
      className={`glass relative overflow-hidden rounded-2xl border border-border bg-card/60 ${className}`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${accentBar[accent ?? "primary"]} to-transparent`}
      />
      <header className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                {
                  primary: "border-primary/30 bg-primary/10 text-primary",
                  success: "border-success/30 bg-success/10 text-success",
                  warning: "border-warning/30 bg-warning/10 text-warning",
                  info: "border-info/30 bg-info/10 text-info",
                  destructive: "border-destructive/30 bg-destructive/10 text-destructive",
                }[accent ?? "primary"]
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
          )}
          <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">{title}</h3>
        </div>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function initials(name: string): string {
  return (name || "")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

export function useExecI18n() {
  const { t, language, currency, dateFormat } = useI18n();
  const tx = (key: string) => t(`admin.executive.${key}`);
  return { t, language, currency, dateFormat, tx };
}
