import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SuperAdminOnly } from "@/components/protected-route";
import { SuperAdminSidebar } from "@/components/super-admin-sidebar";
import { PageHeader } from "@/components/page-header";
import { useSuperAdminCompanies } from "@/hooks/use-super-admin-dashboard";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, Ban, CheckCircle, Trash2, Building2, Briefcase, User as UserIcon, Loader2, PlusCircle, Save } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { useSupabaseErrorHandler } from "@/lib/supabase-error-handler";
import { deleteCompany, createCompanyWithAdmin } from "@/lib/company";
import type { SuperAdminCompanySummary } from "@/hooks/use-super-admin-dashboard";

export const Route = createFileRoute("/super-admin/empresas")({
  head: () => ({ meta: [{ title: "Super Admin · Empresas" }] }),
  component: () => (
    <SuperAdminOnly>
      <EmpresasPage />
    </SuperAdminOnly>
  ),
});

function EmpresasPage() {
  const queryClient = useQueryClient();
  const handleError = useSupabaseErrorHandler();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    endereco: "",
    cidade: "",
    pais: "",
    companyType: "office" as "office" | "freelancer",
    status: "active" as "active" | "suspended",
    adminName: "",
    adminEmail: "",
    adminPhone: "",
    adminCargo: "admin" as "admin" | "lawyer" | "receptionist" | "secretary" | "manager" | "intern" | "other",
    adminPassword: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("O nome da empresa é obrigatório.");
      if (!form.companyType) throw new Error("O tipo da empresa é obrigatório.");
      if (!form.adminName.trim()) throw new Error("O nome do administrador é obrigatório.");
      if (!form.adminEmail.trim()) throw new Error("O email do administrador é obrigatório.");
      if (!form.adminPassword.trim()) throw new Error("A senha temporária é obrigatória.");

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.adminEmail.trim())) throw new Error("Email do administrador inválido.");

      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", form.adminEmail.trim())
        .maybeSingle();
      if (existingProfile) throw new Error("Email do administrador já utilizado.");

      await createCompanyWithAdmin({
        nome: form.nome.trim(),
        email: form.email.trim() || null,
        telefone: form.telefone.trim() || null,
        endereco: form.endereco.trim() || null,
        cidade: form.cidade.trim() || null,
        pais: form.pais.trim() || null,
        status: form.status,
        companyType: form.companyType,
        adminEmail: form.adminEmail.trim(),
        adminPassword: form.adminPassword,
        adminName: form.adminName.trim() || null,
        adminPhone: form.adminPhone.trim() || null,
        adminRole: "admin",
        adminCargo: form.adminCargo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-companies"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-stats"] });
      toast.success("Empresa e administrador criados com sucesso.");
      setCreateDialogOpen(false);
      setForm({
        nome: "",
        email: "",
        telefone: "",
        endereco: "",
        cidade: "",
        pais: "",
        companyType: "office",
        status: "active",
        adminName: "",
        adminEmail: "",
        adminPhone: "",
        adminCargo: "admin",
        adminPassword: "",
      });
    },
    onError: (e: Error) => {
      const message = e.message;
      if (message.toLowerCase().includes("email") && message.toLowerCase().includes("já")) {
        toast.error(message);
      } else if (message.toLowerCase().includes("utilizador") || message.toLowerCase().includes("auth")) {
        toast.error("Erro ao criar utilizador: " + message);
      } else if (message.toLowerCase().includes("empresa")) {
        toast.error("Erro ao criar empresa: " + message);
      } else if (message.toLowerCase().includes("perfil")) {
        toast.error("Erro ao criar perfil: " + message);
      } else {
        toast.error(message || "Erro ao criar empresa.");
      }
    },
  });

  const { data: companies, isLoading } = useSuperAdminCompanies();

  const suspendMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").update({ status: "suspended" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-companies"] });
      toast.success("Empresa suspensa com sucesso");
    },
    onError: (e: Error) => handleError(e, { operation: "UPDATE", table: "companies" }),
  });

  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").update({ status: "active" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-companies"] });
      toast.success("Empresa reativada com sucesso");
    },
    onError: (e: Error) => handleError(e, { operation: "UPDATE", table: "companies" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteCompany(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-companies"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-stats"] });
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

  if (isLoading) {
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
        <PageHeader title="Empresas" subtitle="Todas as empresas da plataforma" showSearch={false} />

        <div className="space-y-6 p-6 lg:p-8">
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Total Empresas</p>
              <p className="text-2xl font-bold">{companies?.length || 0}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Ativas</p>
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

          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Pesquisar empresa..."
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
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-1 h-4 w-4" /> Criar Empresa
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Criar Empresa</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Nome da Empresa *</Label>
                    <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo *</Label>
                    <Select value={form.companyType} onValueChange={(v) => setForm({ ...form, companyType: v as "office" | "freelancer" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="office">Escritório</SelectItem>
                        <SelectItem value="freelancer">Freelancer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Estado Inicial</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "active" | "suspended" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Activa</SelectItem>
                        <SelectItem value="suspended">Suspensa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email da Empresa</Label>
                    <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Telefone</Label>
                    <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Endereço</Label>
                    <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cidade</Label>
                    <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>País</Label>
                    <Input value={form.pais} onChange={(e) => setForm({ ...form, pais: e.target.value })} />
                  </div>

                  <div className="sm:col-span-2 mt-2 mb-1 text-sm font-semibold text-muted-foreground border-t pt-3">Dados do Administrador</div>

                  <div className="space-y-1.5">
                    <Label>Nome Completo *</Label>
                    <Input value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email *</Label>
                    <Input type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Telefone</Label>
                    <Input value={form.adminPhone} onChange={(e) => setForm({ ...form, adminPhone: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cargo</Label>
                    <Select value={form.adminCargo} onValueChange={(v) => setForm({ ...form, adminCargo: v as typeof form.adminCargo })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="lawyer">Advogado</SelectItem>
                        <SelectItem value="receptionist">Recepcionista</SelectItem>
                        <SelectItem value="secretary">Secretária</SelectItem>
                        <SelectItem value="manager">Gestor</SelectItem>
                        <SelectItem value="intern">Estagiário</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Senha Temporária *</Label>
                    <Input type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={createMutation.isPending}>Cancelar</Button>
                  <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {filtered.length === 0 ? (
              <Card className="p-10 text-center">
                <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">Nenhuma empresa encontrada.</p>
              </Card>
            ) : (
              filtered.map((c) => <EmpresaCard key={c.id} company={c} onDelete={(id) => setConfirmDeleteId(id)} onSuspend={(id) => suspendMutation.mutate(id)} onReactivate={(id) => reactivateMutation.mutate(id)} />)
            )}
          </div>
        </div>
      </main>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar empresa</AlertDialogTitle>
            <AlertDialogDescription>
              Ao eliminar, o acesso da empresa é completamente desativado e nenhum utilizador
              conseguirá mais usar o sistema. Esta ação não pode ser revertida.
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

function EmpresaCard({
  company,
  onDelete,
  onSuspend,
  onReactivate,
}: {
  company: SuperAdminCompanySummary;
  onDelete: (id: string) => void;
  onSuspend: (id: string) => void;
  onReactivate: (id: string) => void;
}) {
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

  return (
    <Card className="p-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{company.nome}</p>
            {statusBadge(company.status)}
            {typeBadge(company.company_type)}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Admin: {company.administrador || "—"} · Plano: {company.plan || "—"} · Criado em{" "}
            {format(new Date(company.created_at), "dd/MM/yyyy", { locale: pt })}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Clientes: {company.clientes}</span>
            <span>Processos: {company.processos}</span>
            <span>Profissionais: {company.profissionais}</span>
            <span>Audiências: {company.audiencias}</span>
            <span>
              Último Login: {company.ultimo_login ? format(new Date(company.ultimo_login), "dd/MM/yyyy HH:mm", { locale: pt }) : "—"}
            </span>
            <span>Dias Licença: {company.dias_licenca != null ? company.dias_licenca : "—"}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/super-admin/empresas/$companyId" params={{ companyId: company.id }}>
              <Eye className="mr-1 h-4 w-4" /> Ver detalhes
            </Link>
          </Button>
          {company.status === "active" ? (
            <Button variant="outline" size="sm" onClick={() => onSuspend(company.id)}>
              <Ban className="mr-1 h-4 w-4" /> Suspender
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => onReactivate(company.id)}>
              <CheckCircle className="mr-1 h-4 w-4" /> Reativar
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={() => onDelete(company.id)}>
            <Trash2 className="mr-1 h-4 w-4" /> Eliminar
          </Button>
        </div>
      </div>
    </Card>
  );
}
