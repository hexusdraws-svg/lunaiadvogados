import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Building2,
  KeyRound,
  BarChart3,
  BellRing,
  Settings,
  Shield,
  LogOut,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useSupabaseErrorHandler } from "@/lib/supabase-error-handler";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * Sidebar EXCLUSIVA do Super Admin. Arquitetura completamente separada da
 * empresa: não carrega processos, clientes, contratos, audiências, agenda,
 * financeiro nem dashboard de empresa. Apenas gestão de plataforma.
 */
type Item = { title: string; url: string; icon: typeof Building2 };
type Group = { label: string; items: Item[]; collapsible?: boolean };

const LS_KEY = "superadmin.sidebar.groups.open";

function loadOpen(): Record<string, boolean> {
  const raw = localStorage.getItem(LS_KEY) ?? "{}";
  try {
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

export function SuperAdminSidebar() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mounted, setMounted] = useState(false);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  const superAdminGroups: Group[] = [
    {
      label: t("superAdmin.label", { defaultValue: "Super Admin" }),
      items: [
        { title: t("dashboardTitle"), url: "/super-admin", icon: LayoutDashboard },
        { title: t("company"), url: "/super-admin/empresas", icon: Building2 },
        { title: t("finances"), url: "/super-admin/financeiro", icon: BarChart3 },
        { title: t("license", { defaultValue: "Licenças" }), url: "/super-admin/licencas", icon: KeyRound },
        { title: t("alerts", { defaultValue: "Alertas" }), url: "/super-admin/alertas", icon: BellRing },
        { title: t("configuracoes"), url: "/super-admin/configuracoes", icon: Settings },
      ],
    },
  ];

  useEffect(() => {
    setMounted(true);
    setOpenMap(loadOpen());
  }, []);

  useEffect(() => {
    setOpenMap((prev) => {
      const groupToOpen = superAdminGroups.find((g) => {
        if (!g.collapsible) return false;
        return g.items.some((i) => i.url === pathname);
      });
      if (!groupToOpen) return prev;
      if (prev[groupToOpen.label]) return prev;
      return { ...prev, [groupToOpen.label]: true };
    });
  }, [pathname]);

  useEffect(() => {
    if (mounted) localStorage.setItem(LS_KEY, JSON.stringify(openMap));
  }, [openMap, mounted]);

  const toggle = (label: string) => {
    setOpenMap((prev) => ({ ...prev, [label]: !(prev[label] ?? false) }));
  };

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gradient-primary)] glow-ring">
          <Shield className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-sidebar-foreground">
            {t("superAdmin.label", { defaultValue: "Super Admin" })}
          </p>
          <p className="text-xs text-muted-foreground">{t("superAdmin.platform", { defaultValue: "Plataforma" })}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
        {superAdminGroups.map((g) => (
          <SidebarGroup
            key={g.label}
            group={g}
            pathname={pathname}
            open={g.collapsible ? (openMap[g.label] ?? false) : true}
            onToggle={() => toggle(g.label)}
          />
        ))}
      </nav>

      <LogoutButton />
    </aside>
  );
}

function SidebarGroup({
  group,
  pathname,
  open,
  onToggle,
}: {
  group: Group;
  pathname: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      {group.collapsible ? (
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-between px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <span>{group.label}</span>
          <ChevronDown className={cn("h-3 w-3 transition-transform", !open && "-rotate-90")} />
        </button>
      ) : (
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {group.label}
        </p>
      )}
      {open && (
        <ul className="space-y-1">
          {group.items.map((item) => {
            const active = pathname === item.url;
            return (
              <li key={item.url}>
                <Link
                  to={item.url}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_var(--sidebar-border)]"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 transition-colors",
                      active ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground",
                    )}
                  />
                  <span className="flex-1">{item.title}</span>
                  {active && <ChevronRight className="h-3.5 w-3.5 text-primary" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function LogoutButton() {
  const { signOut, loading } = useAuth();
  const { t } = useI18n();
  const handleError = useSupabaseErrorHandler();

  const handleLogout = async () => {
    const loadingToast = toast.loading(t("loading") + "...");
    try {
      await signOut();
      toast.dismiss(loadingToast);
      toast.success(t("signOut") + "!");
    } catch (err) {
      toast.dismiss(loadingToast);
      handleError(err, { operation: "AUTH", table: "auth" });
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          disabled={loading}
          className="flex items-center gap-3 rounded-lg px-3 py-2 mx-3 mb-4 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-all disabled:opacity-50"
        >
          <LogOut className="h-4 w-4 text-muted-foreground" />
          <span>{t("signOut")}</span>
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("signOut")}</AlertDialogTitle>
          <AlertDialogDescription>{t("logoutConfirmDesc")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleLogout} disabled={loading}>
            {t("signOut")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
