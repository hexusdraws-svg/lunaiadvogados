"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SuperAdminOnly } from "@/components/protected-route";
import { SuperAdminSidebar } from "@/components/super-admin-sidebar";
import { PageHeader } from "@/components/page-header";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/hooks/use-i18n";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  Eye,
  Ban,
  CheckCircle,
  Trash2,
  Building2,
  Briefcase,
  User as UserIcon,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { useSupabaseErrorHandler } from "@/lib/supabase-error-handler";
import { deleteCompany } from "@/lib/company";

export const Route = createFileRoute("/admin/empresas")({
  head: () => ({ meta: [{ title: "Empresas" }] }),
  component: () => (
    <SuperAdminOnly>
      <AdminEmpresasPage />
    </SuperAdminOnly>
  ),
});

type CompanyRow = {
  id: string;
  nome: string;
  status: "active" | "suspended" | "cancelled";
  company_type: "office" | "freelancer";
  created_at: string;
  [key: string]: unknown;
};

function AdminEmpresasPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const handleError = useSupabaseErrorHandler();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: companies, isLoading: loadingCompanies } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CompanyRow[];
    },
  });

  // Contagens por empresa: clientes, processos, profissionais, audiências, último acesso.
  const { data: metrics } = useQuery({
    queryKey: ["admin-company-metrics"],
    queryFn: async () => {
      const [profilesRes, processosRes, clientesRes, hearingsRes] = await Promise.all([
        supabase.from("profiles").select("company_id, role, updated_at"),
        supabase.from("processos").select("company_id"),
        supabase.from("clientes").select("company_id"),
        supabase.from("hearings").select("company_id"),
      ]);

      const counts: Record<
        string,
        {
          clientes: number;
          processos: number;
          profissionais: number;
          audiencias: number;
          ultimoAcesso: string | null;
        }
      > = {};

      const ensure = (id: string | null | undefined) => {
        if (!id) return null;
        if (!counts[id]) {
          counts[id] = {
            clientes: 0,
            processos: 0,
            profissionais: 0,
            audiencias: 0,
            ultimoAcesso: null,
          };
        }
        return counts[id];
      };

      (profilesRes.data ?? []).forEach((p) => {
        const c = ensure(p.company_id as string | null);
        if (!c) return;
        if (p.role !== "super_admin") c.profissionais += 1;
        const ua = p.updated_at as string | null;
        if (ua && (!c.ultimoAcesso || ua > c.ultimoAcesso)) c.ultimoAcesso = ua;
      });
      (processosRes.data ?? []).forEach((p) => {
        const c = ensure(p.company_id as string | null);
        if (c) c.processos += 1;
      });
      (clientesRes.data ?? []).forEach((p) => {
        const c = ensure(p.company_id as string | null);
        if (c) c.clientes += 1;
      });
      (hearingsRes.data ?? []).forEach((p) => {
        const c = ensure(p.company_id as string | null);
        if (c) c.audiencias += 1;
      });

      return counts;
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase
        .from("companies")
        .update({ status: "suspended" })
        .eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      toast.success("Empresa suspensa com sucesso");
    },
    onError: (e: Error) => handleError(e, { operation: "UPDATE", table: "companies" }),
  });

  const reactivateMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase
        .from("companies")
        .update({ status: "active" })
        .eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      toast.success("Empresa reativada com sucesso");
    },
    onError: (e: Error) => handleError(e, { operation: "UPDATE", table: "companies" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (companyId: string) => {
      await deleteCompany(companyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      queryClient.invalidateQueries({ queryKey: ["admin-company-metrics"] });
      toast.success("Empresa eliminada. Acesso desativado.");
    },
    onError: (e: Error) => handleError(e, { operation: "DELETE", table: "companies" }),
  });

  const filtered = useMemo(() => {
    return (companies ?? []).filter((c) => {
      if (search && !c.nome.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (typeFilter !== "all" && c.company_type !== typeFilter) return false;
      return true;
    });
  }, [companies, search, statusFilter, typeFilter]);

  const statusBadge = (status: string) => {
    if (status === "active") return <Badge>Activa</Badge>;
    if (status === "suspended") return <Badge variant="destructive">Suspensa</Badge>;
    return <Badge variant="secondary">Cancelada</Badge>;
  };

  const typeBadge = (type: string) =>
    type === "freelancer" ? (
      <Badge variant="outline" className="gap-1">
        <UserIcon className="h-3 w-3" /> Freelancer
      </Badge>
    ) : (
      <Badge variant="outline" className="gap-1">
        <Briefcase className="h-3 w-3" /> Escritório
      </Badge>
    );

  const planLabel = (c: CompanyRow) =>
    (c.plan as string | undefined) ?? (c.subscription_tier as string | undefined) ?? "—";

  if (loadingCompanies) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <SuperAdminSidebar />

      <main className="flex-1 overflow-auto">
        <PageHeader title={t("admin.companies")} subtitle={t("admin.companiesSubtitle")} />

        <div className="space-y-6 p-6 lg:p-8">
          {/* RESUMO */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">{t("admin.totalCompanies")}</p>
              <p className="text-2xl font-bold">{companies?.length || 0}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">{t("admin.activeCompanies")}</p>
              <p className="text-2xl font-bold text-success">
                {companies?.filter((c) => c.status === "active").length || 0}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Escritórios</p>
              <p className="text-2xl font-bold">
                {companies?.filter((c) => c.company_type === "office").length || 0}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Freelancers</p>
              <p className="text-2xl font-bold">
                {companies?.filter((c) => c.company_type === "freelancer").length || 0}
              </p>
            </Card>
          </div>

          {/* FILTROS */}
          <div className="flex flex-wrap items-center gap-2">
            <Input
               placeholder={t("search") + "..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 max-w-xs"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estados</SelectItem>
                <SelectItem value="active">Activa</SelectItem>
                <SelectItem value="suspended">Suspensa</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="office">Escritório</SelectItem>
                <SelectItem value="freelancer">Freelancer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* LISTA */}
          <div className="grid gap-4">
            {filtered.length === 0 ? (
              <Card className="p-10 text-center">
                <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">Nenhuma empresa encontrada.</p>
              </Card>
            ) : (
              filtered.map((company) => {
                const m = metrics?.[company.id];
                return (
                  <Card key={company.id} className="p-4">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{company.nome}</p>
                          {statusBadge(company.status)}
                          {typeBadge(company.company_type)}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Plano: {planLabel(company)} · Criado em{" "}
                          {format(new Date(company.created_at), "dd/MM/yyyy", { locale: pt })}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>Clientes: {m?.clientes ?? 0}</span>
                          <span>Processos: {m?.processos ?? 0}</span>
                          <span>Profissionais: {m?.profissionais ?? 0}</span>
                          <span>Audiências: {m?.audiencias ?? 0}</span>
                          <span>
                            Último acesso:{" "}
                            {m?.ultimoAcesso
                              ? format(new Date(m.ultimoAcesso), "dd/MM/yyyy HH:mm", { locale: pt })
                              : "—"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link to="/admin/empresas/$companyId" params={{ companyId: company.id }}>
                            <Eye className="mr-1 h-4 w-4" /> Ver detalhes
                          </Link>
                        </Button>
                        {company.status === "active" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => suspendMutation.mutate(company.id)}
                          >
                            <Ban className="mr-1 h-4 w-4" /> Suspender
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => reactivateMutation.mutate(company.id)}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" /> Reativar
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setConfirmDeleteId(company.id)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" /> Eliminar
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* CONFIRMAÇÃO DE ELIMINAÇÃO */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar empresa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza? Ao eliminar, o acesso da empresa é completamente desativado e nenhum
              utilizador conseguirá mais usar o sistema. Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDeleteId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!confirmDeleteId) return;
                try {
                  await deleteMutation.mutateAsync(confirmDeleteId);
                } finally {
                  setConfirmDeleteId(null);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
