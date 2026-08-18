import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/suspended")({
  head: () => ({ meta: [{ title: "Empresa Suspensa" }] }),
  component: CompanySuspendedPage,
});

export function CompanySuspendedPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <span className="text-2xl">🚫</span>
        </div>
        <h1 className="text-lg font-semibold text-foreground">Empresa Suspensa</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A licença desta empresa encontra-se suspensa. Contacte o administrador da plataforma.
        </p>
        <div className="mt-6">
          <button
            type="button"
            onClick={async () => {
              await useAuth.getState().signOut();
              navigate({ to: "/login" });
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Terminar Sessão
          </button>
        </div>
      </div>
    </div>
  );
}
