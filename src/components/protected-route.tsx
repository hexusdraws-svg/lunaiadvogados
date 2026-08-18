import { useEffect, useRef } from "react";
import { useNavigate, useRouterState, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { canAccessRoute, canPerform } from "@/lib/permissions";

/**
 * One-time redirect. Avoids the render/commit loop caused by TanStack Router's
 * <Navigate> component (its useLayoutEffect re-fires when the router/navigate
 * identity changes after each navigation, producing "Maximum update depth").
 */
function Redirect({
  to,
  search,
  replace,
}: {
  to: string;
  search?: Record<string, unknown>;
  replace?: boolean;
}) {
  const navigate = useNavigate();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    navigate({ to: to as never, search: search as never, replace });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

type ProtectedRouteProps = {
  children: React.ReactNode;
  requiredRole?: "admin" | "professional";
  permission?: string;
  fallback?: React.ReactNode;
};

export function ProtectedRoute({
  children,
  requiredRole,
  permission,
  fallback,
}: ProtectedRouteProps) {
  const { user, profile, loading, isSuperAdmin, isAdmin, isProfessional, reloadProfile } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  if (typeof window === "undefined") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // When the user is authenticated but the profile failed to load (e.g. an
  // expired access token 401'd the profile query), retry loading it instead of
  // showing a dead-end screen. If it still can't load shortly after, go to login.
  const profileReloadedRef = useRef(false);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  useEffect(() => {
    if (loading || !user || profile) {
      profileReloadedRef.current = false;
      return;
    }
    if (profileReloadedRef.current) return;
    profileReloadedRef.current = true;
    void reloadProfile();
    const timer = setTimeout(() => {
      if (!profileRef.current) navigate({ to: "/login" });
    }, 8000);
    return () => clearTimeout(timer);
  }, [loading, user, profile, reloadProfile, navigate]);

  // Fetch company status for non-super-admin users
  const { data: company } = useQuery({
    queryKey: ["company-status", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;
      const { data } = await supabase
        .from("companies")
        .select("status, company_type")
        .eq("id", profile.company_id)
        .maybeSingle();
      return data ?? null;
    },
    enabled: typeof window !== "undefined" && !!profile?.company_id && !isSuperAdmin,
    staleTime: 30_000,
  });

  const companyStatus = company?.status ?? null;
  const companyType = company?.company_type ?? null;

  if (loading) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (profile.status && profile.status !== "active") {
    return <Redirect to="/login" search={{ error: "User not authorized" }} />;
  }

  // Non-super-admin users MUST have a company_id
  if (!isSuperAdmin && !profile.company_id) {
    return (
      <Redirect
        to="/login"
        search={{ error: t("errors.companyNotConfigured") }}
      />
    );
  }

  // Company suspended check
  if (!isSuperAdmin && companyStatus === "suspended") {
    return <Redirect to="/suspended" />;
  }

  // Permission check (for direct permission prop)
  if (permission) {
    const hasPermission = canPerform(profile, permission);
    if (!hasPermission) {
      toast.error(t("errors.noPermission"));
      return <Redirect to="/dashboard" />;
    }
  }

  // Role check (legacy support)
  if (requiredRole) {
    const hasAccess =
      requiredRole === "admin"
        ? isSuperAdmin || isAdmin
        : isSuperAdmin || isAdmin || isProfessional;

    if (!hasAccess) {
      toast.error(t("errors.noPermission"));
      return <Redirect to="/dashboard" />;
    }
  }

  return <>{children}</>;
}

export function SuperAdminOnly({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin } = useAuth();
  const { t } = useI18n();

  return (
    <ProtectedRoute>
      {isSuperAdmin ? (
        children
      ) : (
        <Redirect to="/login" search={{ error: t("errors.noPermission") }} replace />
      )}
    </ProtectedRoute>
  );
}

export function AdminOrAbove({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole="admin">{children}</ProtectedRoute>;
}

/**
 * Garante que o Super Admin NUNCA entre no dashboard de uma empresa.
 * O Super Admin tem uma arquitetura completamente separada (/super-admin).
 * Se o utilizador for super_admin, é redirecionado para o seu painel próprio.
 * Caso contrário, renderiza os filhos (dashboard da empresa).
 */
export function SuperAdminRedirect({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin } = useAuth();

  if (isSuperAdmin) {
    return <Redirect to="/super-admin" replace />;
  }

  return <>{children}</>;
}

// ============================================================
// Route-level Permission Guard - For use in route definitions
// Redirects to /dashboard with error if no permission
// ============================================================

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const { t } = useI18n();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const hasAccess = canAccessRoute(profile, currentPath);

  if (!hasAccess) {
    toast.error(t("errors.noPermission"));
    return <Redirect to="/dashboard" replace />;
  }

  return <>{children}</>;
}
