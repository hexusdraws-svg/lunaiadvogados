import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/use-auth";
import { I18nProvider } from "@/hooks/use-i18n";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotificationProvider } from "@/components/notification-provider";
import { LicenseAlertBanner } from "@/components/license-alert-banner";
import { Toaster } from "@/components/ui/sonner";
import { queryClient } from "@/lib/query-client";
import "../styles.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lunai Advocacia" },
    ],
    links: [{ rel: "icon", href: "/favicon.svg" }],
  }),
  component: () => {
    return (
      <html lang="pt">
        <head>
          <HeadContent />
        </head>
        <body>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <I18nProvider>
                <TooltipProvider>
                  <NotificationProvider>
                    <LicenseAlertBanner />
                    <Outlet />
                    <Toaster />
                  </NotificationProvider>
                </TooltipProvider>
              </I18nProvider>
            </AuthProvider>
          </QueryClientProvider>
          <Scripts />
        </body>
      </html>
    );
  },
});
