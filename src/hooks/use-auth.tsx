import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: "super_admin" | "admin" | "professional";
  company_id: string | null;
  status: "pending" | "active" | "suspended";
  contacto: string | null;
  phone_country_code: string | null;
  phone_number: string | null;
  professional_role:
    | "lawyer"
    | "assistant"
    | "receptionist"
    | "accountant"
    | "secretary"
    | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

type AuthContextValue = {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    full_name: string,
    contacto?: string,
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  reloadProfile: () => Promise<void>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isProfessional: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_TIMEOUT_MS = 15_000;

const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
};

const toError = (error: unknown) => {
  if (error instanceof Error) return error;
  return new Error("Erro inesperado de autenticaï¿½ï¿½o");
};

const formatSessionDebug = (session: { user?: { id: string }; expires_at?: number; access_token?: string } | null) => {
  if (!session) return "null";
  const token = session.access_token || "";
  const tokenPreview = token ? `${token.slice(0, 8)}...${token.slice(-8)}` : "no-token";
  const expiresAt = session.expires_at;
  const remaining = expiresAt ? `${Math.max(0, Math.round((expiresAt * 1000 - Date.now()) / 1000))}s` : "unknown";
  return {
    userId: session.user?.id,
    expiresAt,
    remaining,
    tokenPreview,
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const mountedRef = useRef(false);
  const syncingSessionRef = useRef(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (
    userId: string,
    email: string,
    session?: { user?: { id: string; email?: string | null } } | null,
    retry = true,
  ) => {
    const currentSession = session ?? (await supabase.auth.getSession()).data.session;
    const { data, error } = await withTimeout(
      supabase
        .from("profiles")
        .select("id, company_id, role, professional_role, email, full_name, avatar_url, status, phone_country_code, phone_number")
        .eq("id", userId)
        .maybeSingle(),
      AUTH_TIMEOUT_MS,
      "fetchProfile",
    );

    if (!mountedRef.current) return;

    if (error) {
      console.error("[Auth] fetch profile error:", error);

      const errRecord = error as unknown as Record<string, unknown>;
      const status = typeof errRecord.status === "number" ? errRecord.status : undefined;
      const message = String(errRecord.message ?? "").toLowerCase();
      const code = typeof errRecord.code === "string" ? errRecord.code : "";
      const isAuthError =
        status === 401 ||
        status === 403 ||
        code === "PGRST301" ||
        code === "PGRST303" ||
        /jwt|expired|invalid token|bad_jwt/.test(message);

      if (isAuthError && retry) {
        const { data: refreshed, error: refreshErr } = await supabase.auth
          .refreshSession()
          .catch(() => ({ data: { session: null }, error: null as unknown }));
        if (!refreshErr && refreshed?.session) {
          return fetchProfile(userId, email, refreshed.session, false);
        }
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
        setUser(null);
        setProfile(null);
        return;
      }

      setProfile(null);
      return;
    }

    if (data && data.company_id && data.role !== "super_admin") {
      const { data: company } = await supabase
        .from("companies")
        .select("status")
        .eq("id", data.company_id)
        .single();

      if (company?.status === "suspended") {
        await supabase.auth.signOut({ scope: "local" });
        setProfile(null);
        setUser(null);
        toast.error("Esta empresa encontra-se suspensa. Contacte o administrador.");
        return;
      }
    }

    if (data && data.status === "suspended") {
      await supabase.auth.signOut({ scope: "local" });
      setProfile(null);
      setUser(null);
      toast.error("Esta conta foi removida por um administrador.");
      return;
    }

    setProfile(data ? (data as Profile) : null);
  };

  const syncSession = async () => {
    if (syncingSessionRef.current) {
      return;
    }

    syncingSessionRef.current = true;

    try {
      const {
        data: { session },
        error,
      } = await withTimeout(supabase.auth.getSession(), AUTH_TIMEOUT_MS, "getSession");

      if (!mountedRef.current) return;

      if (error) {
        console.error("[Auth] getSession error:", error);
        setUser(null);
        setProfile(null);
        return;
      }

      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? undefined });

        if (session.access_token) {
          const {
            data: { user },
            error: userError,
          } = await withTimeout(
            supabase.auth.getUser(session.access_token),
            AUTH_TIMEOUT_MS,
            "getUser",
          );

          if (userError || !user) {
            console.error("[Auth] getUser error:", userError);
            await supabase.auth.signOut({ scope: "local" }).catch((signOutError) => {
              console.error("[Auth] signOut after getUser error:", signOutError);
            });
            setUser(null);
            setProfile(null);
            return;
          }
        }

        await fetchProfile(session.user.id, session.user.email ?? "", session);
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch (error) {
      console.error("[Auth] syncSession error:", error);
      if (mountedRef.current) {
        setUser(null);
        setProfile(null);
      }
    } finally {
      syncingSessionRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    mountedRef.current = true;

    void syncSession();

    const timeoutId = setTimeout(() => {
      if (mountedRef.current && loading) {
        setLoading(false);
      }
    }, 8000);

    const handleAuthStateChange = (_event: unknown, session: unknown) => {
      if (!mountedRef.current) {
        return;
      }

      const authSession = session as {
        user?: { id: string; email?: string | null };
      } | null;

      if (authSession?.user) {
        setUser({ id: authSession.user.id, email: authSession.user.email ?? undefined });
        void fetchProfile(authSession.user.id, authSession.user.email ?? "", authSession);
      } else {
        setUser(null);
        setProfile(null);
      }

      setLoading(false);
    };

    let subscription: { unsubscribe: () => void } | undefined;
    try {
      const result = (
        supabase.auth as unknown as {
          onAuthStateChange: (fn: (_event: unknown, session: unknown) => void) => {
            data: { subscription: { unsubscribe: () => void } };
          };
        }
      ).onAuthStateChange(handleAuthStateChange);
      subscription = result?.data?.subscription;
    } catch (authChangeError) {
      console.error("[Auth] onAuthStateChange subscription error:", authChangeError);
    }

    return () => {
      mountedRef.current = false;
      subscription?.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);

    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        AUTH_TIMEOUT_MS,
        "signInWithPassword",
      );

      if (error) {
        console.error("[Auth] signInWithPassword error:", error);
        const message = (error as Error)?.message || "";
        if (message.includes("Invalid login credentials") || message.includes("invalid_grant")) {
          return { error: new Error("invalid_credentials") };
        }
        return { error: new Error(message || "invalid_credentials") };
      }

      await syncSession();
      return { error: null };
    } catch (error) {
      console.error("[Auth] signIn error:", error);
      return { error: toError(error) };
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const signUp = async (email: string, password: string, full_name: string, contacto?: string, phoneCountryCode?: string, phoneNumber?: string) => {
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      // PASSO 1: Verificar se o email ja existe em profiles (qualquer status)
      const { data: existingProfile, error: profileError } = await withTimeout(
        supabase
          .from("profiles")
          .select("id, status")
          .eq("email", normalizedEmail)
          .maybeSingle(),
        AUTH_TIMEOUT_MS,
        "existing profile lookup",
      );

      if (profileError) {
        console.error("[Auth] existing profile lookup error:", profileError);
        return { error: new Error("Erro ao verificar email. Tente novamente.") };
      }

      if (existingProfile) {
        if (existingProfile.status === "pending") {
          // Perfil pending existe -> fluxo normal de ativacao de convite
        } else {
          // Perfil ja existe e esta ativo/suspenso -> impedir cadastro duplicado
          return { error: new Error("Este email ja esta cadastrado. Faca login ou recupere a sua conta.") };
        }
      }

      // PASSO 2: Se nao existir profile -> cadastro direto
      // Se existir pending -> continua fluxo normal de convite
      let pendingProfile = existingProfile;
      if (!pendingProfile) {
        const { data: signUpData, error } = await withTimeout(
          supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: { data: { name: full_name, full_name } },
          }),
          AUTH_TIMEOUT_MS,
          "signUp",
        );

        if (error) {
          console.error("[Auth] signUp error:", error);
          return { error: new Error(error.message || "Erro ao criar conta.") };
        }

        if (!signUpData?.user?.id) {
          await supabase.auth.signOut({ scope: "local" });
          return { error: new Error("Erro interno: utilizador criado sem identificador. Tente novamente.") };
        }

        if (signUpData?.user?.id && (contacto || phoneCountryCode || phoneNumber)) {
          const updateData: Record<string, string | null> = {};
          if (contacto && contacto.trim()) updateData.contacto = contacto.trim();
          if (phoneCountryCode) updateData.phone_country_code = phoneCountryCode;
          if (phoneNumber !== undefined) updateData.phone_number = phoneNumber || null;

          if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
              .from("profiles")
              .update(updateData)
              .eq("id", signUpData.user.id);

            if (updateError) {
              console.error("[Auth] Update profile contact/phone error:", updateError);
            }
          }
        }

        await syncSession();
        return { error: null };
      }

      // PASSO 3: Fluxo de convite (pending profile existe)
      const { data: signUpData, error } = await withTimeout(
        supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { name: full_name, full_name } },
        }),
        AUTH_TIMEOUT_MS,
        "signUp",
      );

      if (error) {
        console.error("[Auth] signUp error:", error);
        return { error: new Error(error.message || "Erro ao criar conta.") };
      }

      // PASSO 4: Ativar profile via RPC atomico (DELETE pending + INSERT definitivo)
      if (signUpData?.user?.id) {
        try {
          const { error: rpcError } = await withTimeout(
            supabase.rpc("activate_profile", {
              pending_id: pendingProfile.id,
              auth_user_id: signUpData.user.id,
              user_full_name: full_name,
            }),
            AUTH_TIMEOUT_MS,
            "activate_profile",
          );

          if (rpcError) {
            console.error("[Auth] activate_profile RPC error:", rpcError);
            await supabase.auth.signOut({ scope: "local" });
            return {
              error: new Error(
                "Erro ao ativar conta. O utilizador foi criado mas a ativacao falhou. Contacte o administrador.",
              ),
            };
          }

          if (contacto && contacto.trim()) {
            const { error: updateError } = await supabase
              .from("profiles")
              .update({ contacto: contacto.trim() })
              .eq("id", signUpData.user.id);

            if (updateError) {
              console.error("[Auth] Update contacto error:", updateError);
            }
          }

          if (phoneCountryCode || phoneNumber !== undefined) {
            const phoneData: Record<string, string | null> = {};
            if (phoneCountryCode) phoneData.phone_country_code = phoneCountryCode;
            if (phoneNumber !== undefined) phoneData.phone_number = phoneNumber || null;

            const { error: phoneUpdateError } = await supabase
              .from("profiles")
              .update(phoneData)
              .eq("id", signUpData.user.id);

            if (phoneUpdateError) {
              console.error("[Auth] Update phone error:", phoneUpdateError);
            }
          }

          if (pendingProfile?.professional_role) {
            const { error: roleError } = await supabase
              .from("profiles")
              .update({ professional_role: pendingProfile.professional_role })
              .eq("id", signUpData.user.id);

            if (roleError) {
              console.error("[Auth] Update professional_role error:", roleError);
            }
          }
        } catch (rpcErr) {
          console.error("[Auth] activate_profile RPC exception:", rpcErr);
          await supabase.auth.signOut({ scope: "local" });
          return {
            error: new Error(
              "Erro ao ativar conta. O utilizador foi criado mas a ativacao falhou. Contacte o administrador.",
            ),
          };
        }
      } else {
        await supabase.auth.signOut({ scope: "local" });
        return {
          error: new Error("Erro interno: utilizador criado sem identificador. Tente novamente."),
        };
      }

      // PASSO 5: Efetuar login automaticamente apos cadastro/ativacao
      await syncSession();
      return { error: null };
    } catch (error) {
      console.error("[Auth] signUp error:", error);
      return { error: toError(error) };
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await withTimeout(supabase.auth.signOut({ scope: "local" }), AUTH_TIMEOUT_MS, "signOut");
    } catch (error) {
      console.error("[Auth] signOut error:", error);
    } finally {
      // Invalidate all auth-related queries
      qc.invalidateQueries({ queryKey: ["profile-company"] });
      qc.invalidateQueries({ queryKey: ["processos"] });
      qc.invalidateQueries({ queryKey: ["tarefas"] });
      qc.invalidateQueries({ queryKey: ["financial-receitas"] });
      qc.invalidateQueries({ queryKey: ["financial-despesas"] });
      qc.invalidateQueries({ queryKey: ["admin-companies"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-profiles"] });

      // Redirect to login (always, even on error)
      navigate({ to: "/login" });
    }
  };

  const reloadProfile = async () => {
    if (!user?.id) return;
    await fetchProfile(user.id, user.email ?? "", null, true);
  };

  const value: AuthContextValue = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    reloadProfile,
    isSuperAdmin: profile?.role === "super_admin",
    isAdmin: profile?.role === "admin",
    isProfessional: profile?.role === "professional",
  };


  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

