import { cn } from "@/lib/utils";

const map: Record<string, string> = {
  Qualificado: "bg-info/15 text-info border-info/30",
  "Em negociação": "bg-warning/15 text-warning border-warning/30",
  "Sem resposta": "bg-destructive/15 text-destructive border-destructive/30",
  "Visita marcada": "bg-success/15 text-success border-success/30",
  Confirmada: "bg-success/15 text-success border-success/30",
  Pendente: "bg-warning/15 text-warning border-warning/30",
  Realizada: "bg-info/15 text-info border-info/30",
  Cancelada: "bg-destructive/15 text-destructive border-destructive/30",
  Enviado: "bg-info/15 text-info border-info/30",
  Respondido: "bg-success/15 text-success border-success/30",
  Agendado: "bg-primary/15 text-primary border-primary/30",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = map[status] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        cls,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
