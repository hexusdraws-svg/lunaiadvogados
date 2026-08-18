import { NotificationsBell } from "./notifications-bell";
import { useI18n } from "@/hooks/use-i18n";
import { Button } from "@/components/ui/button";

export function PageHeader({
  title,
  subtitle,
  action,
  showSearch,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  showSearch?: boolean;
}) {
  const { t } = useI18n();

  return (
    <header className="flex flex-col gap-4 border-b border-border bg-background/40 px-6 py-5 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <NotificationsBell />
        {action}
      </div>
    </header>
  );
}
