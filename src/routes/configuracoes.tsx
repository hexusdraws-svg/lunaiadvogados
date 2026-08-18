import { createFileRoute, Link } from "@tanstack/react-router";
import { ProtectedRoute, SuperAdminRedirect } from "@/components/protected-route";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/hooks/use-i18n";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateProfile } from "@/hooks/use-update-profile";
import { uploadAvatar, deleteAvatar } from "@/lib/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  User,
  UserCircle,
  Building2,
  Shield,
  Lightbulb,
  Info,
  ChevronRight,
  Lock,
  Camera,
  Mail,
  Phone,
  Briefcase,
  Loader2,
} from "lucide-react";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações" }] }),
  component: () => (
    <ProtectedRoute>
      <SuperAdminRedirect>
        <ConfiguracoesPage />
      </SuperAdminRedirect>
    </ProtectedRoute>
  ),
});

type SettingItem = {
  icon: typeof User;
  label: string;
  description: string;
  section?: string;
  to?: string;
  badge?: string;
  adminOnly?: boolean;
  disabled?: boolean;
};

function ConfiguracoesPage() {
  const { t } = useI18n();
  const { isAdmin } = useAuth();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const items: SettingItem[] = [
    {
      icon: User,
      label: t("settings.profile"),
      description: t("settings.profileDesc", { defaultValue: "Edite o seu perfil, foto e contacto." }),
      section: "profile",
    },
    {
      icon: Building2,
      label: t("settings.company"),
      description: t("settings.companyDesc", { defaultValue: "Dados da empresa, logo e internacionalização." }),
      to: "/empresa",
      adminOnly: true,
    },
    {
      icon: Shield,
      label: t("settings.security"),
      description: t("settings.securityDesc", { defaultValue: "Palavra-passe e segurança da conta." }),
      section: "security",
    },
    {
      icon: Lightbulb,
      label: t("settings.suggestions"),
      description: t("settings.suggestionsDesc", { defaultValue: "Envie sugestões para melhorar o sistema." }),
      to: "/sugestoes",
    },
    {
      icon: Info,
      label: t("settings.about"),
      description: t("settings.aboutDesc", { defaultValue: "Informações sobre o LunAI Jury." }),
      to: "/sobre",
    },
  ];

  const visibleItems = items.filter((item) => !item.adminOnly || isAdmin);

  const handleCardClick = (item: SettingItem) => {
    if (item.disabled) return;
    if (item.to) {
      window.location.href = item.to;
      return;
    }
    if (item.section) {
      setActiveSection(activeSection === item.section ? null : item.section);
    }
  };

  const isLink = (item: SettingItem) => !!item.to && !item.section;

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <PageHeader title={t("settings.title")} subtitle={t("nav.sistema")} />
        <div className="p-6 lg:p-8">
          <div className="max-w-2xl mx-auto space-y-2">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.section;
              const isClickable = !item.disabled;
              return (
                <Card
                  key={item.section || item.label}
                  className={`p-4 transition-colors ${item.disabled ? "opacity-60" : isLink(item) ? "hover:bg-accent/30 cursor-pointer" : "cursor-pointer"}`}
                  onClick={() => handleCardClick(item)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${item.disabled ? "bg-muted text-muted-foreground border-border" : "bg-primary/10 text-primary border-primary/25"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    </div>
                    {item.badge && (
                      <Badge variant="outline" className="text-[10px]">
                        {item.badge}
                      </Badge>
                    )}
                    {item.disabled ? <Lock className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isActive ? "rotate-90" : ""}`} />}
                  </div>
                </Card>
              );
            })}
          </div>

          {activeSection === "profile" && <ProfileSection onClose={() => setActiveSection(null)} />}
          {activeSection === "security" && <SecuritySection onClose={() => setActiveSection(null)} />}
          {activeSection === "notifications" && <NotificationsSection onClose={() => setActiveSection(null)} />}
        </div>
      </main>
    </div>
  );
}

function ProfileSection({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { user, profile } = useAuth();
  const updateProfile = useUpdateProfile();

  const initials = useMemo(() => {
    const name = profile?.full_name || user?.email || "U";
    return name
      .split(" ")
      .map((n) => (n || "")[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [profile?.full_name, user?.email]);

  const roleLabels: Record<string, string> = {
    super_admin: t("profile.roles.superAdmin", { defaultValue: "Super Admin" }),
    admin: t("profile.roles.admin", { defaultValue: "Administrador" }),
    professional: t("profile.roles.professional", { defaultValue: "Profissional" }),
  };

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phoneCountryCode, setPhoneCountryCode] = useState(profile?.phone_country_code || "+258");
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const avatarUrl = avatarPreview || profile?.avatar_url || null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let newAvatarUrl = profile?.avatar_url;

      if (avatarFile) {
        if (profile?.avatar_url) {
          await deleteAvatar(profile.avatar_url);
        }
        newAvatarUrl = await uploadAvatar(avatarFile);
      }

      await updateProfile.mutateAsync({
        full_name: fullName.trim(),
        phone_country_code: phoneCountryCode,
        phone_number: phoneNumber.trim() || null,
        avatar_url: newAvatarUrl,
      });

      setAvatarFile(null);
      setAvatarPreview(null);
      onClose();
    } catch {
      // handled by hook
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto mt-4 space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-16 w-16">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            )}
          </Avatar>
          <label className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
            <Camera className="h-3 w-3" />
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </label>
        </div>
        <div>
          <p className="text-lg font-semibold">
            {profile?.full_name || user?.email || t("profile.user", { defaultValue: "Utilizador" })}
          </p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <Badge variant="outline" className="mt-1">
            {roleLabels[profile?.role || ""] || profile?.role || "—"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("fullName")}</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("profile.yourName", { defaultValue: "Seu nome" })} />
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{t("email")}</p>
            <p className="text-sm font-medium truncate">{user?.email || "—"}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("profile.whatsappContact", { defaultValue: "Contacto WhatsApp" })}</Label>
          <PhoneInput
            countryCode={phoneCountryCode}
            onCountryCodeChange={setPhoneCountryCode}
            value={phoneNumber}
            onChange={setPhoneNumber}
            placeholder={t("profile.phonePlaceholder", { defaultValue: "84 607 8509" })}
          />
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">{t("profile.role", { defaultValue: "Função" })}</p>
            <p className="text-sm font-medium">
              {profile?.professional_role || roleLabels[profile?.role || ""] || "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
          <UserCircle className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">{t("profile.status", { defaultValue: "Estado" })}</p>
            <p className="text-sm font-medium capitalize">{profile?.status || "—"}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>{t("cancel", { defaultValue: "Cancelar" })}</Button>
        <Button onClick={handleSave} disabled={saving || updateProfile.isPending}>
          {(saving || updateProfile.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("saveChanges", { defaultValue: "Guardar Alterações" })}
        </Button>
      </div>
    </Card>
  );
}

function SecuritySection({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Card className="p-6 max-w-2xl mx-auto mt-4">
      <p className="text-sm text-muted-foreground">{t("settings.securityDesc", { defaultValue: "Palavra-passe e segurança da conta." })}</p>
      <p className="text-xs text-muted-foreground mt-2">{t("settings.comingSoon", { defaultValue: "Em breve" })}</p>
      <div className="flex justify-end mt-4">
        <Button variant="outline" onClick={onClose}>{t("close", { defaultValue: "Fechar" })}</Button>
      </div>
    </Card>
  );
}

function NotificationsSection({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Card className="p-6 max-w-2xl mx-auto mt-4">
      <p className="text-sm text-muted-foreground">{t("settings.notificationsDesc", { defaultValue: "Preferências de notificações." })}</p>
      <p className="text-xs text-muted-foreground mt-2">{t("settings.comingSoon", { defaultValue: "Em breve" })}</p>
      <div className="flex justify-end mt-4">
        <Button variant="outline" onClick={onClose}>{t("close", { defaultValue: "Fechar" })}</Button>
      </div>
    </Card>
  );
}
