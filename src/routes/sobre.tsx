import { createFileRoute, Link } from "@tanstack/react-router";
import { ProtectedRoute, SuperAdminRedirect } from "@/components/protected-route";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/hooks/use-i18n";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_VERSION, APP_NAME } from "@/lib/version";
import { Shield, Mail } from "lucide-react";
import { LogoImage } from "@/components/branding/app-branding";

export const Route = createFileRoute("/sobre")({
  head: () => ({ meta: [{ title: "Sobre" }] }),
  component: () => (
    <ProtectedRoute>
      <SuperAdminRedirect>
        <SobrePage />
      </SuperAdminRedirect>
    </ProtectedRoute>
  ),
});

function SobrePage() {
  const { t } = useI18n();

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <PageHeader title={t("settings.about")} subtitle={APP_NAME} />
        <div className="p-6 lg:p-8 space-y-6 max-w-3xl">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gradient-primary)] glow-ring overflow-hidden">
                <LogoImage className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{APP_NAME}</h2>
                <Badge variant="outline">{APP_VERSION}</Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("about.description", {
                defaultValue:
                  "O LunAI Jury é uma plataforma jurídica empresarial desenvolvida pela LunAI Automation. O objetivo é simplificar a gestão de escritórios de advocacia e equipas jurídicas, reunindo processos, clientes, audiências, contratos e finanças num só lugar.",
              })}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("about.beta", {
                defaultValue:
                  "Atualmente em fase Beta. Estamos a melhorar continuamente a experiência com base no feedback dos utilizadores.",
              })}
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("about.developer", { defaultValue: "Desenvolvedor" })}
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Shield className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Clésio Bata</p>
                <p className="text-xs text-muted-foreground">LunAI Automation</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span>lunaiautomation@gmail.com</span>
            </div>
          </Card>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} LunAI Automation</span>
            <Badge variant="outline" className="gap-1">
              {APP_VERSION}
            </Badge>
          </div>
        </div>
      </main>
    </div>
  );
}
