"use client";

import { createFileRoute } from "@tanstack/react-router";
import { SuperAdminOnly } from "@/components/protected-route";
import { SuperAdminSidebar } from "@/components/super-admin-sidebar";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card } from "@/components/ui/card";
import { useSuperAdminStats } from "@/hooks/use-super-admin-dashboard";
import {
  Building2,
  CheckCircle2,
  Ban,
  Briefcase,
  UserCircle2,
  Loader2,
  TrendingUp,
  CalendarDays,
  CalendarClock,
} from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";

export const Route = createFileRoute("/super-admin/")({
  head: () => ({ meta: [{ title: "Super Admin · Dashboard Geral" }] }),
  component: () => (
    <SuperAdminOnly>
      <SuperAdminDashboardPage />
    </SuperAdminOnly>
  ),
});

function SuperAdminDashboardPage() {
  const { t } = useI18n();
  const { data: stats, isLoading, error } = useSuperAdminStats();

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <SuperAdminSidebar />
        <main className="flex-1 overflow-auto">
          <PageHeader title={t("superAdmin.dashboard")} subtitle={t("superAdmin.dashboardSubtitle")} />
          <div className="p-6 lg:p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-background">
        <SuperAdminSidebar />
        <main className="flex-1 overflow-auto">
          <PageHeader title={t("superAdmin.dashboard")} subtitle={t("superAdmin.dashboardSubtitle")} />
          <div className="p-6 lg:p-8">
            <Card className="p-6 text-center text-sm text-destructive">
              {t("superAdmin.loadError")}
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <SuperAdminSidebar />

      <main className="flex-1 overflow-auto">
        <PageHeader title={t("superAdmin.dashboard")} subtitle={t("superAdmin.dashboardSubtitle")} showSearch={false} />

        <div className="p-6 lg:p-8 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard label={t("superAdmin.dashboardStats.totalCompanies")} value={stats?.totalCompanies ?? 0} icon={Building2} accent="primary" />
                <StatCard label={t("superAdmin.dashboardStats.activeCompanies")} value={stats?.activeCompanies ?? 0} icon={CheckCircle2} accent="success" />
                <StatCard label={t("superAdmin.dashboardStats.suspendedCompanies")} value={stats?.suspendedCompanies ?? 0} icon={Ban} accent="destructive" />
                <StatCard label={t("superAdmin.dashboardStats.createdToday")} value={stats?.createdToday ?? 0} icon={CalendarDays} accent="info" />
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard label={t("superAdmin.dashboardStats.createdThisWeek")} value={stats?.createdThisWeek ?? 0} icon={CalendarClock} accent="info" />
                <StatCard label={t("superAdmin.dashboardStats.createdThisMonth")} value={stats?.createdThisMonth ?? 0} icon={TrendingUp} accent="primary" />
                <StatCard label={t("superAdmin.dashboardStats.offices")} value={stats?.offices ?? 0} icon={Briefcase} accent="primary" />
                <StatCard label={t("superAdmin.dashboardStats.freelancers")} value={stats?.freelancers ?? 0} icon={UserCircle2} accent="warning" />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
