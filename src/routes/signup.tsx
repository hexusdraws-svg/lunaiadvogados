import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
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
import { Eye, EyeOff, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppBranding } from "@/components/branding/app-branding";
import { PhoneInput } from "@/components/ui/phone-input";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Registar" }] }),
  component: SignupPage,
});

function SignupPage() {
  const { signUp } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+258");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return;
    }
    setLoading(true);
    try {
      const contacto = phoneNumber ? `${phoneCountryCode}${phoneNumber}`.replace(/\s/g, "") : undefined;
      const result = await signUp(email, password, fullName, contacto);
      if (result.error) {
        toast.error(result.error.message || t("registerError", { defaultValue: "Erro ao criar conta." }));
        return;
      }
      setSuccess(true);
    } catch {
      toast.error(t("registerError", { defaultValue: "Erro ao criar conta." }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        navigate({ to: "/" });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
       <div className="w-full max-w-sm space-y-6">
         <div className="flex justify-center pt-4">
           <AppBranding />
         </div>

         <div className="space-y-2 text-center">
           <h1 className="text-2xl font-semibold tracking-tight">{t("register")}</h1>
           <p className="text-sm text-muted-foreground">{t("signupSubtitle", { defaultValue: "Crie a sua conta para aceder ao sistema." })}</p>
         </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">{t("fullName")}</Label>
            <Input
              id="fullName"
              placeholder="João Silva"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="joao@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label={showPassword ? "Ocultar password" : "Mostrar password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
                aria-label={showConfirmPassword ? "Ocultar password" : "Mostrar password"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("phone", { defaultValue: "Telefone" })}</Label>
            <PhoneInput
              countryCode={phoneCountryCode}
              onCountryCodeChange={setPhoneCountryCode}
              value={phoneNumber}
              onChange={setPhoneNumber}
              placeholder="84 607 8509"
              className="w-full"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || success}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {success ? t("registerSuccess", { defaultValue: "Conta criada com sucesso!" }) : t("register")}
          </Button>
        </form>

        {success && (
          <p className="text-center text-xs text-muted-foreground">
            {t("registerRedirect", { defaultValue: "A redirecionar para o painel..." })}
          </p>
        )}

        <p className="text-center text-sm">
          {t("haveAccount")}{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            {t("signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
