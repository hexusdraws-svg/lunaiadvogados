import { useState, useEffect, useMemo } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarDays,
  MessageCircle,
  BellRing,
  UserCircle,
  Users,
  User,
  Briefcase,
  FileText,
  TrendingUp,
  DollarSign,
  Settings,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  LogOut,
  Gavel,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useActiveCompany } from "@/hooks/use-company";
import { useI18n } from "@/hooks/use-i18n";
import { useSupabaseErrorHandler } from "@/lib/supabase-error-handler";
import { can } from "@/lib/permissions";
import { APP_VERSION } from "@/lib/version";
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
import { LogoImage } from "@/components/branding/app-branding";

type Item = {
  title: string;
  url: string;
  icon: typeof User;
  permission?: string;
  tKey?: string;
};
type Group = {
  label: string;
  items: Item[];
  collapsible?: boolean;
  tKey?: string;
};

export function AppSidebar() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: company } = useActiveCompany();
  const { profile, isAdmin, isSuperAdmin } = useAuth();
  const canAccess = (item: Group["items"][number]) =>
    !item.permission || can(profile, item.permission as any);
  const [mounted, setMounted] = useState(false);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  const baseGroups: Group[] = [
    {
      tKey: "nav.operations",
      label: t("nav.operations"),
      items: [
        {
          tKey: "nav.dashboard",
          title: t("nav.dashboard"),
          url: "/dashboard",
          icon: LayoutDashboard,
        },
        { tKey: "nav.agenda", title: t("nav.agenda"), url: "/agenda", icon: CalendarDays },
        { tKey: "nav.audiencias", title: t("nav.audiencias"), url: "/audiencias", icon: Gavel },
        { tKey: "nav.tarefas", title: t("nav.tarefas"), url: "/tarefas", icon: CheckSquare },
      ],
    },
    {
      tKey: "nav.processesContracts",
      label: t("nav.processesContracts"),
      collapsible: true,
      items: [
        {
          tKey: "nav.clients",
          title: t("nav.clients.title"),
          url: "/cadastros/clientes",
          icon: UserCircle,
        },
        { tKey: "nav.profissionais", title: t("nav.profissionais"), url: "/cadastros/profissionais", icon: Users, permission: "manage_team" },
        { tKey: "nav.processos", title: t("nav.processos"), url: "/processos", icon: Briefcase },
        {
          tKey: "nav.contratos",
          title: t("nav.contratos"),
          url: "/contratos",
          icon: FileText,
        },
      ],
    },
    {
      tKey: "nav.finances",
      label: t("nav.finances"),
      collapsible: true,
      items: [
        {
          tKey: "nav.recebimentos",
          title: t("nav.recebimentos"),
          url: "/financas/recebimentos",
          icon: TrendingUp,
          permission: "manage_finances",
        },
        {
          tKey: "nav.despesas",
          title: t("nav.despesas"),
          url: "/financas/despesas",
          icon: DollarSign,
          permission: "manage_expenses",
        },
      ],
    },
    {
      tKey: "nav.sistema",
      label: t("nav.sistema"),
      items: [
        { tKey: "nav.configuracoes", title: t("nav.configuracoes"), url: "/configuracoes", icon: Settings },
      ],
    },
  ];

  const adminGroup: Group | undefined = useMemo(
    () =>
      isAdmin
        ? {
            tKey: "nav.executivePanel",
            label: t("nav.executivePanel"),
            collapsible: true,
            items: [
              {
                tKey: "nav.executivePanel",
                title: t("nav.executivePanel"),
                url: "/admin/painel-executivo",
                icon: BarChart3,
              },
            ],
          }
        : undefined,
    [isAdmin, t],
  );

  const groups = useMemo(
    () => (adminGroup ? [...baseGroups, adminGroup] : baseGroups),
    [adminGroup],
  );

  useEffect(() => {
    setMounted(true);
    setOpenMap(loadOpen());
  }, []);

  useEffect(() => {
    setOpenMap((prev) => {
      const groupToOpen = groups.find((g) => {
        if (!g.collapsible) return false;
        return g.items.some((i) => i.url === pathname);
      });

      if (!groupToOpen) {
        return prev;
      }

      if (prev[groupToOpen.label]) {
        return prev;
      }

      const nextState = { ...prev, [groupToOpen.label]: true };
      return nextState;
    });
  }, [pathname, groups]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(LS_KEY, JSON.stringify(openMap));
    }
  }, [openMap, mounted]);

  const toggle = (label: string) => {
    const nextState = { ...openMap, [label]: !(openMap[label] ?? false) };
    setOpenMap(nextState);
  };

  // O Super Admin tem arquitetura completamente separada (/super-admin).
  // Nunca deve ver nem carregar a sidebar de empresa.
  if (isSuperAdmin) return null;

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl">
      <div className="px-6 py-3 border-b border-sidebar-border">
        <p className="text-sm font-semibold tracking-tight text-foreground">{t("systemName")}</p>
        <p className="text-[10px] text-muted-foreground font-medium">{APP_VERSION}</p>
      </div>
      <Link
        to="/empresa"
        className="flex items-center gap-3 px-6 py-6 hover:bg-sidebar-accent/30 transition"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gradient-primary)] glow-ring overflow-hidden">
          {company?.logo_url ? (
            <img src={company.logo_url} alt={company.nome} className="h-full w-full object-cover" />
          ) : (
            <LogoImage className="h-5 w-5 text-primary-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-sidebar-foreground">
            {company?.nome ?? t("companySelect")}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            {profile?.full_name ?? profile?.email ?? t("profile.user", { defaultValue: "Utilizador" })}
          </p>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
        {groups.map((g) => (
          <SidebarGroup
            key={g.label}
            group={g}
            pathname={pathname}
            open={g.collapsible ? (openMap[g.label] ?? false) : true}
            onToggle={() => toggle(g.label)}
            canAccess={canAccess}
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
  canAccess,
}: {
  group: Group;
  pathname: string;
  open: boolean;
  onToggle: () => void;
  canAccess: (item: Group["items"][number]) => boolean;
}) {
  const { t } = useI18n();
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
          {group.items.filter(canAccess).map((item) => {
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
                      active
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-sidebar-foreground",
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
    const loadingToast = toast.loading(t("logoutLoading", { defaultValue: "Terminando sessão..." }));
    try {
      await signOut();
      toast.dismiss(loadingToast);
      toast.success(t("logoutBye", { defaultValue: "Até breve!" }));
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
          <span>{t("logout")}</span>
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("logoutConfirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("logoutConfirmDesc")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("logoutCancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleLogout} disabled={loading}>
            {t("logout")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const LS_KEY = "sidebar.groups.open";

function loadOpen(): Record<string, boolean> {
  const raw = localStorage.getItem(LS_KEY) ?? "{}";
  try {
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}
