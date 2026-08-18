import { createFileRoute, Link } from "@tanstack/react-router";
import { ProtectedRoute, SuperAdminRedirect } from "@/components/protected-route";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/hooks/use-i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, Lightbulb } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/sugestoes")({
  head: () => ({ meta: [{ title: "Sugestões" }] }),
  component: () => (
    <ProtectedRoute>
      <SuperAdminRedirect>
        <SugestoesPage />
      </SuperAdminRedirect>
    </ProtectedRoute>
  ),
});

function SugestoesPage() {
  const { t } = useI18n();
  const [suggestion, setSuggestion] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!suggestion.trim()) return;
    setSending(true);
    try {
      // Prepared for future n8n integration.
      // TODO: Send to n8n webhook when available.
      console.log("[Sugestões] Sugestão enviada:", suggestion.trim());
      toast.success(t("suggestions.sent", { defaultValue: "Sugestão enviada com sucesso!" }));
      setSuggestion("");
    } catch {
      toast.error(t("suggestions.error", { defaultValue: "Erro ao enviar sugestão. Tenta novamente." }));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <PageHeader title={t("settings.suggestions")} subtitle={t("suggestions.subtitle", { defaultValue: "Envie a sua sugestão" })} />
        <div className="p-6 lg:p-8">
          <Card className="max-w-2xl mx-auto p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t("settings.suggestions")}</h2>
                <p className="text-xs text-muted-foreground">
                  {t("suggestions.placeholder", { defaultValue: "Partilhe ideias para melhorar o LunAI Jury." })}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t("suggestions.label", { defaultValue: "A sua sugestão" })}</Label>
              <Textarea
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                placeholder={t("suggestions.placeholder", { defaultValue: "Descreva a sua sugestão aqui..." })}
                className="min-h-[160px] text-sm"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!suggestion.trim() || sending} className="gap-1.5">
                {sending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                <Send className="h-4 w-4" />
                {t("suggestions.send", { defaultValue: "Enviar" })}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              {t("suggestions.futureNote", { defaultValue: "Em breve será integrado com o nosso sistema de automatização." })}
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
