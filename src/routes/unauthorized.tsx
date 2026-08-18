import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/unauthorized")({
  component: UnauthorizedPage,
});

function UnauthorizedPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Acesso Negado</h1>
      <p className="text-muted-foreground">Você não tem permissão para aceder a esta página.</p>
      <Button asChild>
        <a href="/login">Entrar</a>
      </Button>
    </div>
  );
}
