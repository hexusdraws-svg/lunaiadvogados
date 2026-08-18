import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RefreshCw, Loader2, LayoutDashboard, FolderKanban, Gavel, UserCog, Wallet } from "lucide-react";
import { useExecutiveDashboard } from "@/hooks/use-executive-dashboard";
import { useExecI18n } from "./executive-utils";
import { DashboardTab } from "./executive-dashboard-tab";
import { ProcessosTab } from "./executive-processos-tab";
import { AudienciasTab } from "./executive-audiencias-tab";
import { ProfissionaisTab } from "./executive-profissionais-tab";
import { FinanceiroTab } from "./executive-financeiro-tab";
import { useAuth } from "@/hooks/use-auth";

type TabKey = "dashboard" | "processos" | "audiencias" | "profissionais" | "financeiro";
type ProcSub = "todos" | "ativos" | "arquivados" | "sem";

export function ExecutivePanel() {
   const { t } = useExecI18n();
   const dash = useExecutiveDashboard();
   const { profile } = useAuth();
   const companyId = profile?.company_id ?? null;
   const [tab, setTab] = useState<TabKey>("dashboard");
   const [procSub, setProcSub] = useState<ProcSub>("todos");

   if (dash.isLoading) {
     return (
       <div className="flex h-[60vh] items-center justify-center">
         <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
       </div>
     );
   }

   const goProcessos = (sub?: string) => {
     setProcSub((sub as ProcSub) ?? "todos");
     setTab("processos");
   };
   const goAudiencias = () => setTab("audiencias");

   return (
     <div className="space-y-4">
       <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="w-full">
         <TabsList className="grid w-full grid-cols-2 gap-1 sm:grid-cols-5">
           <TabsTrigger value="dashboard" className="gap-2">
             <LayoutDashboard className="h-4 w-4" />
             {t("nav.dashboard")}
           </TabsTrigger>
           <TabsTrigger value="processos" className="gap-2">
             <FolderKanban className="h-4 w-4" />
             {t("nav.processos")}
           </TabsTrigger>
           <TabsTrigger value="audiencias" className="gap-2">
             <Gavel className="h-4 w-4" />
             {t("nav.audiencias")}
           </TabsTrigger>
           <TabsTrigger value="profissionais" className="gap-2">
             <UserCog className="h-4 w-4" />
             {t("nav.profissionais")}
           </TabsTrigger>
            <TabsTrigger value="financeiro" className="gap-2">
              <Wallet className="h-4 w-4" />
              {t("finance.title", { defaultValue: "Finanças" })}
            </TabsTrigger>
         </TabsList>

         <TabsContent value="dashboard" className="mt-4">
           <DashboardTab
             kpis={dash.kpis}
             idleProcesses={dash.idleProcesses}
             onGoProcessos={goProcessos}
             onGoAudiencias={goAudiencias}
           />
         </TabsContent>

         <TabsContent value="processos" className="mt-4">
           <ProcessosTab
             processos={dash.processos}
             idleProcesses={dash.idleProcesses}
             profiles={dash.profiles}
             initialSub={procSub}
           />
         </TabsContent>

         <TabsContent value="audiencias" className="mt-4">
           <AudienciasTab
             hearings={dash.hearingsFuturas}
             kpis={dash.kpis}
             profiles={dash.profiles}
             processos={dash.processos}
           />
         </TabsContent>

         <TabsContent value="profissionais" className="mt-4">
           <ProfissionaisTab
             professionals={dash.professionals}
             processos={dash.processos}
             clientes={dash.clientes}
             hearings={dash.hearings}
           />
         </TabsContent>

         <TabsContent value="financeiro" className="mt-4">
           <FinanceiroTab companyId={companyId} />
         </TabsContent>
       </Tabs>
     </div>
   );
}

export function ExecutiveRefreshButton() {
   const { t } = useExecI18n();
   const dash = useExecutiveDashboard();
   return (
     <button
       type="button"
       onClick={() => dash.refetchAll()}
       className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10"
     >
       <RefreshCw className="h-3.5 w-3.5" />
       {t("refresh")}
     </button>
   );
}
