import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SuperAdminOnly } from "@/components/protected-route";
import { SuperAdminSidebar } from "@/components/super-admin-sidebar";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
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
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { createCompanyAndPendingProfile } from "@/lib/company";

export const Route = createFileRoute("/super-admin/empresas/nova")({
  head: () => ({ meta: [{ title: "Super Admin · Criar Empresa" }] }),
  component: () => (
    <SuperAdminOnly>
      <CreateCompanyPage />
    </SuperAdminOnly>
  ),
});

function CreateCompanyPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    nuit: "",
    endereco: "",
    cidade: "",
    pais: "",
    adminEmail: "",
    adminName: "",
    adminPhone: "",
    companyType: "office" as "office" | "freelancer",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.nome.trim()) return toast.error("O nome da empresa é obrigatório.");
    if (!form.adminEmail.trim()) return toast.error("O email do administrador é obrigatório.");
    setSaving(true);
    try {
      await createCompanyAndPendingProfile({
        nome: form.nome.trim(),
        email: form.email.trim() || null,
        telefone: form.telefone.trim() || null,
        nuit: form.nuit.trim() || null,
        endereco: form.endereco.trim() || null,
        cidade: form.cidade.trim() || null,
        pais: form.pais.trim() || null,
        adminEmail: form.adminEmail.trim(),
        adminName: form.adminName.trim() || null,
        adminPhone: form.adminPhone.trim() || null,
        adminRole: "admin",
        companyType: form.companyType,
      });
      qc.invalidateQueries({ queryKey: ["super-admin-companies"] });
      qc.invalidateQueries({ queryKey: ["super-admin-stats"] });
      toast.success("Empresa criada com sucesso");
      setForm({ nome: "", email: "", telefone: "", nuit: "", endereco: "", cidade: "", pais: "", adminEmail: "", adminName: "", adminPhone: "", companyType: "office" });
    } catch (e) {
      toast.error("Erro ao criar empresa: " + (e instanceof Error ? e.message : ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <SuperAdminSidebar />
      <main className="flex-1 overflow-auto">
        <PageHeader title="Criar Empresa" subtitle="Nova empresa na plataforma" showSearch={false} />

        <div className="space-y-6 p-6 lg:p-8">
          <Button asChild variant="ghost" size="sm">
            <Link to="/super-admin/empresas">
              <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
            </Link>
          </Button>

          <Card className="max-w-2xl p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nome da Empresa *</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={form.companyType} onValueChange={(v) => setForm({ ...form, companyType: v as "office" | "freelancer" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office">Escritório</SelectItem>
                    <SelectItem value="freelancer">Freelancer</SelectItem>
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
                <Label>NUIT</Label>
                <Input value={form.nuit} onChange={(e) => setForm({ ...form, nuit: e.target.value })} />
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
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Nome do Administrador *</Label>
                <Input value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} placeholder="João Silva" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Email do Administrador *</Label>
                <Input value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} placeholder="admin@empresa.com" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Telefone do Administrador</Label>
                <Input value={form.adminPhone} onChange={(e) => setForm({ ...form, adminPhone: e.target.value })} placeholder="+258 84 000 0000" />
              </div>
            </div>

            <div className="mt-5">
              <Button onClick={submit} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Criar Empresa
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
