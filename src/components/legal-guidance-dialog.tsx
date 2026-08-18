import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLegalGuidance } from "@/hooks/use-legal-guidance";
import type { Audiencia } from "@/hooks/use-audiencias";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";
import {
  Scale,
  BookOpen,
  Loader2,
  AudioLines,
  Sparkles,
  ListOrdered,
  Library,
  Cpu,
  Timer,
  Coins,
  UserCog,
} from "lucide-react";

type GuidanceStatus = "processing" | "completed" | "failed";

const statusConfig: Record<GuidanceStatus, { label: string; className: string }> = {
  processing: {
    label: "A preparar",
    className: "bg-warning/15 text-warning border-warning/30",
  },
  completed: {
    label: "Concluída",
    className: "bg-success/15 text-success border-success/30",
  },
  failed: {
    label: "Falhou",
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
};

// Renderiza probable_questions / jurisprudence de forma segura:
// - se for texto (incluindo JSON em string), preserva quebras de linha
// - se for array de strings, lista cada item
// - se for array de objetos (JSON), lista os campos relevantes
function renderRichText(value: unknown) {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    // Tenta interpretar JSON (array ou objeto) sem nunca mostrar JSON bruto
    if (
      (trimmed.startsWith("[") || trimmed.startsWith("{")) &&
      (trimmed.includes('"') || trimmed.includes("'"))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        return renderRichValue(parsed);
      } catch {
        return <p className="whitespace-pre-line">{value}</p>;
      }
    }
    return <p className="whitespace-pre-line">{value}</p>;
  }
  return renderRichValue(value);
}

function renderRichValue(value: unknown) {
  if (Array.isArray(value)) {
    if (value.length === 0) return <p>—</p>;
    return (
      <ul className="list-disc space-y-2 pl-5">
        {value.map((item, i) => (
          <li key={i}>
            {typeof item === "string" ? (
              <span className="whitespace-pre-line">{item}</span>
            ) : (
              <span className="whitespace-pre-line">{JSON.stringify(item)}</span>
            )}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const entries = Object.entries(obj).filter(([, v]) => v != null && v !== "");
    if (entries.length === 0) return <p>—</p>;
    return (
      <div className="space-y-3">
        {entries.map(([k, v], i) => (
          <div key={i} className="rounded-lg border border-border/60 bg-background/40 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">{k}</p>
            <div className="mt-1 text-sm">
              {typeof v === "string" ? (
                <span className="whitespace-pre-line">{v}</span>
              ) : (
                <span className="whitespace-pre-line">{JSON.stringify(v)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return <p className="whitespace-pre-line">{String(value)}</p>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function LegalGuidanceDialog({
  open,
  onOpenChange,
  hearing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hearing: Audiencia | null;
}) {
  const { guidance, isLoading, refetch } = useLegalGuidance(open ? hearing?.id ?? null : null);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    if (hearing) {
      console.log("Opening guidance");
      console.log("Current hearing:", hearing);
      console.log("Current hearing id:", hearing.id);
      console.log("Current process id:", hearing.process_id);
    }
  }, [hearing, open]);

  useEffect(() => {
    if (guidance) {
      const t = setTimeout(() => setFadeIn(true), 50);
      return () => clearTimeout(t);
    }
    setFadeIn(false);
  }, [guidance]);

  const { t } = useI18n();

  // Mapear colunas reais da tabela (legal_guidance / strategy) com fallback
  // para os nomes usados na migration (summary / recommended_strategy).
  const record = guidance as Record<string, unknown> | null;
  const summaryText: string | null =
    (record?.legal_guidance as string | null) ??
    (record?.summary as string | null) ??
    null;
  const strategyText: string | null =
    (record?.strategy as string | null) ??
    (record?.recommended_strategy as string | null) ??
    null;
  const probableQuestions = record?.probable_questions ?? null;
  const jurisprudence = record?.jurisprudence ?? null;
  const audioUrl: string | null =
    (record?.audio_url as string | null) ?? null;

  if (guidance) {
    console.log("Legal Guidance:", guidance);
    console.log("Audio URL:", guidance.audio_url);
  }

  const status = (guidance?.status as GuidanceStatus) ?? null;
  const statusInfo = status ? statusConfig[status] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] w-[95vw] max-h-[92vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="border-b border-border/60 bg-gradient-to-r from-card to-card/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                Orientação Jurídica
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Preparação Inteligente para Audiência
              </DialogDescription>
            </div>
            {statusInfo && (
              <Badge className={cn("ml-auto border", statusInfo.className)}>
                {statusInfo.label}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(92vh-80px)]">
          <div className="p-6">
            {hearing && (
              <Card className="mb-5 border-border/60 bg-card/80 p-4">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  <Meta label="Cliente" value={hearing.cliente_nome ?? "—"} />
                  <Meta label="Processo" value={hearing.processo_numero ?? t("none")} />
                  <Meta label="Tipo" value={hearing.case_type ?? "—"} />
                  <Meta label="Data" value={hearing.hearing_date ?? "—"} />
                  <Meta label="Juiz" value={hearing.judge_name ?? "—"} />
                  <Meta label="Tribunal" value={hearing.court_name ?? "—"} />
                </div>
              </Card>
            )}

            {isLoading && (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-48 w-full rounded-xl" />
              </div>
            )}

            {!isLoading && !guidance && (
              <Card className="flex flex-col items-center justify-center gap-4 border-dashed border-border/60 bg-card/40 p-12 text-center">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/30">
                    <Scale className="h-7 w-7 text-primary" />
                  </div>
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">
                    A orientação jurídica ainda está a ser preparada.
                  </p>
                  <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                    A IA ainda não concluiu esta análise.
                  </p>
                </div>
                <button
                  onClick={() => refetch()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Loader2 className="h-3.5 w-3.5" />
                  Atualizar
                </button>
              </Card>
            )}

            {!isLoading && guidance && (
              <div
                className={cn(
                  "transition-opacity duration-500",
                  fadeIn ? "opacity-100" : "opacity-0",
                )}
              >
                <Tabs defaultValue="orientacao" className="w-full">
                  <TabsList className="mb-5 grid w-full grid-cols-4 bg-muted/40">
                    <TabsTrigger value="orientacao" className="gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" />
                      Orientação Jurídica
                    </TabsTrigger>
                    <TabsTrigger value="estrategia" className="gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Estratégia
                    </TabsTrigger>
                    <TabsTrigger value="perguntas" className="gap-1.5">
                      <ListOrdered className="h-3.5 w-3.5" />
                      Perguntas Prováveis
                    </TabsTrigger>
                    <TabsTrigger value="jurisprudencia" className="gap-1.5">
                      <Library className="h-3.5 w-3.5" />
                      Jurisprudência
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="orientacao" className="mt-0 space-y-5">
                    <Card className="border-primary/20 bg-gradient-to-r from-primary/10 to-card p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <AudioLines className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold text-foreground">🎧 Resumo em Áudio</h3>
                      </div>
                      {audioUrl ? (
                        <audio
                          controls
                          preload="metadata"
                          style={{ width: "100%" }}
                          onLoadedMetadata={() =>
                            console.log("Audio loadedmetadata:", audioUrl)
                          }
                          onCanPlay={() => console.log("Audio canplay:", audioUrl)}
                          onPlay={() => console.log("Audio play:", audioUrl)}
                          onError={(e) => {
                            const el = e.currentTarget;
                            console.error("Audio error:", {
                              url: audioUrl,
                              error: el.error,
                              networkState: el.networkState,
                              readyState: el.readyState,
                            });
                          }}
                        >
                          <source src={audioUrl} type="audio/mpeg" />
                          O seu navegador não suporta o elemento de áudio.
                        </audio>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Resumo em áudio ainda não disponível.
                        </p>
                      )}
                    </Card>

                    <Card className="border-border/60 bg-card/80 p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold text-foreground">Orientação Jurídica</h3>
                      </div>
                      <div className="text-sm leading-relaxed text-muted-foreground">
                        {summaryText ? (
                          <p className="whitespace-pre-line">{summaryText}</p>
                         ) : (
                           <p>{t("none")}</p>
                         )}
                      </div>
                    </Card>
                  </TabsContent>

                  <TabsContent value="estrategia" className="mt-0">
                    <Card className="border-border/60 bg-card/80 p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold text-foreground">Estratégia</h3>
                      </div>
                      <div className="text-sm leading-relaxed text-muted-foreground">
                        {strategyText ? (
                          <p className="whitespace-pre-line">{strategyText}</p>
                        ) : (
                          <p>Estratégia ainda não disponível.</p>
                        )}
                      </div>
                    </Card>
                  </TabsContent>

                  <TabsContent value="perguntas" className="mt-0">
                    <Card className="border-border/60 bg-card/80 p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <ListOrdered className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold text-foreground">Perguntas Prováveis</h3>
                      </div>
                      <div className="text-sm leading-relaxed text-muted-foreground">
                        {probableQuestions != null ? (
                          renderRichText(probableQuestions)
                        ) : (
                          <p>Perguntas prováveis ainda não disponíveis.</p>
                        )}
                      </div>
                    </Card>
                  </TabsContent>

                  <TabsContent value="jurisprudencia" className="mt-0">
                    <Card className="border-border/60 bg-card/80 p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <Library className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold text-foreground">Jurisprudência</h3>
                      </div>
                      <div className="text-sm leading-relaxed text-muted-foreground">
                        {jurisprudence != null ? (
                          renderRichText(jurisprudence)
                        ) : (
                          <p>Jurisprudência ainda não disponível.</p>
                        )}
                      </div>
                    </Card>
                  </TabsContent>
                </Tabs>

                <div className="mt-5 flex flex-wrap gap-2">
                  {guidance.model_used && (
                    <Badge variant="outline" className="gap-1 border-border/60 text-muted-foreground">
                      <Cpu className="h-3 w-3 text-primary" />
                      {guidance.model_used}
                    </Badge>
                  )}
                  {guidance.generation_time != null && (
                    <Badge variant="outline" className="gap-1 border-border/60 text-muted-foreground">
                      <Timer className="h-3 w-3 text-primary" />
                      {guidance.generation_time}s
                    </Badge>
                  )}
                  {guidance.tokens_used != null && (
                    <Badge variant="outline" className="gap-1 border-border/60 text-muted-foreground">
                      <Coins className="h-3 w-3 text-primary" />
                      {guidance.tokens_used} tokens
                    </Badge>
                  )}
                  {guidance.generated_by && (
                    <Badge variant="outline" className="gap-1 border-border/60 text-muted-foreground">
                      <UserCog className="h-3 w-3 text-primary" />
                      {guidance.generated_by}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
