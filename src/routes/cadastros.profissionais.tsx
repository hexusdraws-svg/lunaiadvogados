import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/use-company";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { ProtectedRoute, SuperAdminRedirect } from "@/components/protected-route";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { canPerform } from "@/lib/permissions";
import { useSupabaseErrorHandler } from "@/lib/supabase-error-handler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2, Pencil, UserCircle, Send, XCircle, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/cadastros/profissionais")({
  head: () => ({ meta: [{ title: "Equipa" }] }),
  component: () => <ProtectedRoute><SuperAdminRedirect><EquipaPage /></SuperAdminRedirect></ProtectedRoute>,
});

type ProfessionalType = "lawyer" | "assistant" | "receptionist" | "accountant" | "secretary";

const PROFESSIONAL_TYPES: { value: ProfessionalType; label: string }[] = [
  { value: "lawyer", label: "Advogado" },
  { value: "assistant", label: "Assistente" },
  { value: "receptionist", label: "Rececionista" },
  { value: "accountant", label: "Contabilista" },
  { value: "secretary", label: "Secretária" },
];

const ROLE_LABELS: Record<ProfessionalType, string> = {
  lawyer: "Advogado",
  assistant: "Assistente",
  receptionist: "Rececionista",
  accountant: "Contabilista",
  secretary: "Secretária",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  active: "Ativo",
  suspended: "Suspenso",
  inactive: "Inativo",
};

function EquipaPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: company } = useActiveCompany();
  const { profile } = useAuth();
  const companyId = company?.id ?? null;
  const handleError = useSupabaseErrorHandler();

  const canAdd = canPerform(profile, "add_user");
  const canEdit = canPerform(profile, "edit_user");
  const canRemove = canPerform(profile, "remove_user");

  const profilesQ = useQuery({
    queryKey: ["team-profiles", companyId, canAdd],
    queryFn: async () => {
      let q = supabase
        .from("profiles")
        .select("id, email, full_name, role, professional_role, company_id, status, contacto, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (companyId && profile?.role !== "super_admin") {
        q = q.eq("company_id", companyId);
      }

      const { data, error } = await q;
      if (error) return [];
      return (data ?? []).filter((d: any) => d.status !== "suspended");
    },
    enabled: !!companyId || profile?.role === "super_admin",
    staleTime: 30_000,
  });

  const [open, setOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [contacto, setContacto] = useState("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "professional">("professional");
  const [professionalType, setProfessionalType] = useState<ProfessionalType>("lawyer");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  // For editing existing profiles
  const [editContacto, setEditContacto] = useState("");
  const [editSelectedRole, setEditSelectedRole] = useState<"admin" | "professional">("professional");
  const [editProfessionalType, setEditProfessionalType] = useState<ProfessionalType>("lawyer");
  const [editFullName, setEditFullName] = useState("");

  const openAddDialog = () => {
    setEditProfile(null);
    setEmail("");
    setContacto("");
    setSelectedRole("professional");
    setProfessionalType("lawyer");
    setOpen(true);
  };

  const openEditDialog = (p: any) => {
    setEditProfile(p);
    setEditFullName(p.full_name ?? "");
    setEditContacto(p.contacto ?? "");
    setEditSelectedRole(p.role === "admin" ? "admin" : "professional");
     setEditProfessionalType((p.professional_role ?? p.role) as ProfessionalType);
    setOpen(true);
  };

  const save = async () => {
    if (!editProfile) {
      // CREATE new pending profile
      if (!email.trim()) return toast.error(t("team.emailRequiredToast", { defaultValue: "Email obrigatório" }));
      if (!companyId) return toast.error(t("team.companyNotFound", { defaultValue: "Empresa não identificada" }));

      setSaving(true);
      const profileId = crypto.randomUUID();
      const role = selectedRole;
      const professionalRole = professionalType;

      const { error } = await supabase
        .from("profiles")
        .insert({
          id: profileId,
          email: email.trim().toLowerCase(),
          status: "pending",
          role,
          company_id: companyId,
          full_name: null,
          professional_role: professionalRole,
          contacto: contacto.trim() || null,
        });

      setSaving(false);
      if (error) {
        handleError(error, { operation: "INSERT", table: "profiles" });
        return;
      }

      toast.success(t("team.inviteSent", { defaultValue: "Convite enviado com sucesso!" }));
      setEmail("");
      setContacto("");
      setSelectedRole("professional");
      setProfessionalType("lawyer");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["team-profiles"] });
    } else {
      // UPDATE existing profile
      setSaving(true);
      const role = editSelectedRole;
      const professionalRole = editProfessionalType;

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editFullName || null,
          contacto: editContacto.trim() || null,
          role,
          professional_role: professionalRole,
        })
        .eq("id", editProfile.id);

      setSaving(false);
      if (error) {
        handleError(error, { operation: "UPDATE", table: "profiles" });
        return;
      }

      toast.success(t("team.professionalUpdated", { defaultValue: "Profissional atualizado" }));
      setOpen(false);
      setEditProfile(null);
      qc.invalidateQueries({ queryKey: ["team-profiles"] });
    }
  };

  const remove = async (p: any) => {
    const name = p.full_name ?? p.email;
    if (!confirm(t("team.confirmRemove", { defaultValue: `Remover utilizador "${name}"? Esta ação irá suspender a conta.` }))) return;

    const { error } = await supabase
      .from("profiles")
      .update({ status: "suspended" })
      .eq("id", p.id);

    if (error) {
      handleError(error, { operation: "UPDATE", table: "profiles" });
      return;
    }

    toast.success(t("team.userRemoved", { defaultValue: "Utilizador removido" }));
    qc.invalidateQueries({ queryKey: ["team-profiles"] });
  };

  const cancelInvite = async (p: any) => {
    const email = p.email;
    if (!confirm(t("team.confirmCancelInvite", { defaultValue: `Cancelar convite para "${email}"? O perfil pendente será removido.` }))) return;

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", p.id);

    if (error) {
      handleError(error, { operation: "DELETE", table: "profiles" });
      return;
    }

      toast.success(t("team.inviteCancelled", { defaultValue: "Convite cancelado" }));
    qc.invalidateQueries({ queryKey: ["team-profiles"] });
  };

  const resendInvite = async (p: any) => {
    const { error } = await supabase
      .from("profiles")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", p.id);

    if (error) {
      handleError(error, { operation: "UPDATE", table: "profiles" });
      return;
    }

      toast.success(t("team.inviteResent", { defaultValue: "Convite reenviado (simulação)" }));
    qc.invalidateQueries({ queryKey: ["team-profiles"] });
  };

  const data = profilesQ.data ?? [];
  const isLoading = profilesQ.isLoading;

  const filteredData = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return data;
    return data.filter(
      (p) =>
        (p.full_name ?? "").toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q) ||
        (p.contacto ?? "").toLowerCase().includes(q),
    );
  }, [data, search]);

  const getRoleLabel = (role: string | null, professionalRole: string | null) => {
    if (!role) return "—";
    if (role === "admin" || role === "professional") {
      if (professionalRole && ROLE_LABELS[professionalRole as ProfessionalType]) {
        return t("team.types." + professionalRole, { defaultValue: ROLE_LABELS[professionalRole as ProfessionalType] });
      }
      return role === "admin" ? t("profile.roles.admin", { defaultValue: "Administrador" }) : t("professional");
    }
    return role;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-warning/15 text-warning",
      active: "bg-success/15 text-success",
      suspended: "bg-destructive/15 text-destructive",
      inactive: "bg-muted text-muted-foreground",
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.active}`}>
        {t("team.status." + status, { defaultValue: STATUS_LABELS[status] ?? status })}
      </span>
    );
  };

   return (
     <div className="flex h-screen bg-background">
       <AppSidebar />
       <main className="flex-1 overflow-auto">
         <PageHeader title={t("nav.profissionais")} subtitle={company ? `${company.nome}` : ""} />
         <div className="p-6 lg:p-8 space-y-6">
           <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
             <div className="relative max-w-sm">
               <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
               <Input
                 placeholder={t("search") + "..."}
                 className="h-9 pl-9"
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
               />
             </div>
              {canAdd ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5" onClick={openAddDialog}>
                <Plus className="h-4 w-4" /> {t("team.addProfessional", { defaultValue: "Adicionar Profissional" })}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editProfile ? t("team.editMember", { defaultValue: "Editar membro" }) : t("team.newTeamMember", { defaultValue: "Novo membro da equipa" })}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                {editProfile ? (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{t("fullName")}</Label>
                       <Input
                          value={editFullName}
                          onChange={(e) => setEditFullName(e.target.value)}
                          placeholder={t("fullName")}
                        />
                     </div>
                     <div className="space-y-1.5">
                       <Label className="text-xs text-muted-foreground">{t("phone")}</Label>
                        <Input
                          value={editContacto}
                          onChange={(e) => setEditContacto(e.target.value)}
                          placeholder={t("phone")}
                        />
                     </div>
                  </>
                ) : (
                  <>
                     <div className="space-y-1.5">
                       <Label className="text-xs text-muted-foreground">{t("team.emailRequired", { defaultValue: "Email *" })}</Label>
                       <Input
                         type="email"
                         value={email}
                         onChange={(e) => setEmail(e.target.value)}
                         placeholder={t("email")}
                       />
                     </div>
                     <div className="space-y-1.5">
                       <Label className="text-xs text-muted-foreground">{t("phone")}</Label>
                        <Input
                          value={contacto}
                          onChange={(e) => setContacto(e.target.value)}
                          placeholder={t("phone")}
                        />
                     </div>
                  </>
                )}
                 <div className="space-y-1.5">
                   <Label className="text-xs text-muted-foreground">{t("team.userType", { defaultValue: "Tipo de Utilizador" })}</Label>
                   <Select
                     value={editProfile ? editSelectedRole : selectedRole}
                     onValueChange={(v) => editProfile ? setEditSelectedRole(v as "admin" | "professional") : setSelectedRole(v as "admin" | "professional")}
                   >
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="admin">{t("profile.roles.admin", { defaultValue: "Administrador" })}</SelectItem>
                       <SelectItem value="professional">{t("professional")}</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("team.position", { defaultValue: "Cargo" })}</Label>
                    <Select
                      value={editProfile ? editProfessionalType : professionalType}
                      onValueChange={(v) => editProfile ? setEditProfessionalType(v as ProfessionalType) : setProfessionalType(v as ProfessionalType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROFESSIONAL_TYPES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {t("team.types." + r.value, { defaultValue: r.label })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setOpen(false); setEditProfile(null); }}>{t("cancel")}</Button>
                <Button onClick={save} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editProfile ? t("team.saveChanges", { defaultValue: "Guardar alterações" }) : t("team.sendInvite", { defaultValue: "Enviar Convite" })}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <div className="text-xs text-muted-foreground">{t("team.noPermissionAddMembers", { defaultValue: "Sem permissão para adicionar membros" })}</div>
        )}
      </header>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/40 backdrop-blur">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium w-12">{t("team.table.photo", { defaultValue: "Foto" })}</th>
                  <th className="px-4 py-3 font-medium">{t("team.table.name", { defaultValue: "Nome" })}</th>
                  <th className="px-4 py-3 font-medium">{t("team.table.email", { defaultValue: "Email" })}</th>
                  <th className="px-4 py-3 font-medium">{t("team.table.contact", { defaultValue: "Contacto" })}</th>
                  <th className="px-4 py-3 font-medium">{t("team.table.position", { defaultValue: "Cargo" })}</th>
                  {(canEdit || canRemove) && <th className="w-20" />}
                </tr>
              </thead>
               <tbody>
                 {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={canEdit || canRemove ? 6 : 5} className="px-4 py-10 text-center text-muted-foreground">
                        {t("team.noProfessionalsYet", { defaultValue: "Nenhum profissional cadastrado ainda." })}
                      </td>
                    </tr>
                 ) : (
                   filteredData.map((p) => (
                    <tr key={p.id} className="border-t border-border/60 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="h-10 w-10 overflow-hidden rounded-full bg-muted flex items-center justify-center">
                          <UserCircle className="h-6 w-6 text-muted-foreground" />
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{p.full_name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.email || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.contacto || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{getRoleLabel(p.role, p.professional_role)}</td>
                      {(canEdit || canRemove) && (
                        <td className="px-2 py-3">
                          <div className="flex gap-1">
                            {p.status === "pending" ? (
                              <>
                                <Button size="icon" variant="ghost" className="text-info" onClick={() => resendInvite(p)} title={t("resendInvite")}>
                                  <Send className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => cancelInvite(p)} title={t("cancelInvite")}>
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                {canEdit && p.status !== "inactive" && (
                                  <Button size="icon" variant="ghost" onClick={() => openEditDialog(p)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {canRemove && p.status !== "inactive" && (
                                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(p)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
       </Card>
      </div>
    </main>
  </div>
  );
}
