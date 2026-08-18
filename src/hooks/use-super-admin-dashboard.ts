import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * PARTE — ARQUITETURA SUPER ADMIN (separada da empresa).
 *
 * Este hook agrega dados GLOBAIS de TODAS as empresas (sem company_id),
 * exclusivamente para o Super Admin. Nunca consulta dados de uma empresa
 * específica do utilizador logado — o Super Admin não pertence a nenhuma
 * empresa (profile.company_id é null).
 */

export interface SuperAdminStats {
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  offices: number;
  freelancers: number;
  createdThisMonth: number;
  createdThisWeek: number;
  createdToday: number;
  totalProfessionals: number;
  totalClients: number;
  totalProcessos: number;
  totalAudiencias: number;
  totalContratos: number;
  estimatedRevenue: number | null;
}

export interface SuperAdminCompanySummary {
  id: string;
  nome: string;
  status: "active" | "suspended" | "cancelled";
  company_type: "office" | "freelancer";
  plan: string | null;
  created_at: string;
  administrador: string | null;
  clientes: number;
  processos: number;
  profissionais: number;
  audiencias: number;
  ultimo_login: string | null;
  dias_licenca: number | null;
}

export function useSuperAdminStats() {
  return useQuery({
    queryKey: ["super-admin-stats"],
    queryFn: async (): Promise<SuperAdminStats> => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      let totalClients = 0;
      let totalProcessos = 0;
      let totalAudiencias = 0;
      let totalContratos = 0;

      const { data: companies, error: companiesError } = await supabase
        .from("companies")
        .select("id, status, company_type, created_at", { count: "exact" });

      if (companiesError) {
        console.error("[useSuperAdminStats] companies error:", companiesError);
        throw companiesError;
      }

      try {
        const { count } = await supabase.from("clientes").select("id", { count: "exact" });
        totalClients = count ?? 0;
      } catch (e) {
        console.error("[useSuperAdminStats] clientes error:", e);
      }

      try {
        const { count } = await supabase.from("processos").select("id", { count: "exact" });
        totalProcessos = count ?? 0;
      } catch (e) {
        console.error("[useSuperAdminStats] processos error:", e);
      }

      try {
        const { count } = await supabase.from("hearings").select("id", { count: "exact" });
        totalAudiencias = count ?? 0;
      } catch (e) {
        console.error("[useSuperAdminStats] hearings error:", e);
      }

      try {
        const { count } = await supabase.from("contracts").select("id", { count: "exact" });
        totalContratos = count ?? 0;
      } catch (e) {
        console.error("[useSuperAdminStats] contracts error:", e);
      }

      const companyIds = (companies ?? []).map((c) => c.id);
      const companySet = new Set(companyIds);

      let profs: { role: string; company_id: string | null }[] = [];
      try {
        const { data: profiles } = await supabase.from("profiles").select("id, role, company_id");
        profs = profiles ?? [];
      } catch (e) {
        console.error("[useSuperAdminStats] profiles error:", e);
      }

      const totalCompanies = companies.length;
      const activeCompanies = companies.filter((c) => c.status === "active").length;
      const suspendedCompanies = companies.filter((c) => c.status === "suspended").length;
      const offices = companies.filter((c) => c.company_type === "office").length;
      const freelancers = companies.filter((c) => c.company_type === "freelancer").length;
      const createdThisMonth = companies.filter((c) => c.created_at && c.created_at >= startOfMonth).length;
      const createdThisWeek = companies.filter((c) => c.created_at && c.created_at >= startOfWeek.toISOString()).length;
      const createdToday = companies.filter((c) => c.created_at && c.created_at >= startOfDay).length;

      const validProfiles = profs.filter(
        (p) => p.role !== "super_admin" && p.company_id && companySet.has(p.company_id),
      );

      return {
        totalCompanies,
        activeCompanies,
        suspendedCompanies,
        offices,
        freelancers,
        createdThisMonth,
        createdThisWeek,
        createdToday,
        totalProfessionals: validProfiles.length,
        totalClients,
        totalProcessos,
        totalAudiencias,
        totalContratos,
        estimatedRevenue: null,
      };
    },
  });
}

/**
 * Lista resumida de todas as empresas com métricas por empresa.
 * "Receita estimada" não existe como coluna — omitida (null) por design.
 */
export function useSuperAdminCompanies() {
  return useQuery({
    queryKey: ["super-admin-companies"],
    queryFn: async (): Promise<SuperAdminCompanySummary[]> => {
      const { data: companies, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!companies || companies.length === 0) return [];

      const ids = companies.map((c) => c.id);

      const [profiles, clientes, processos, hearings, authLog] = await Promise.all([
        supabase.from("profiles").select("id, role, company_id, full_name, email, updated_at").in("company_id", ids),
        supabase.from("clientes").select("company_id").in("company_id", ids),
        supabase.from("processos").select("company_id").in("company_id", ids),
        supabase.from("hearings").select("company_id").in("company_id", ids),
        supabase.from("profiles").select("company_id, updated_at").in("company_id", ids),
      ]);

      let alerts: { data: { company_id: string; days_remaining: number; created_at: string; is_active: boolean }[] | null; error: unknown } = { data: null, error: null };
      try {
        const result = await supabase.from("company_license_alerts").select("company_id, days_remaining, created_at, is_active").eq("is_active", true);
        alerts = { data: result.data, error: result.error };
      } catch (e) {
        alerts = { data: null, error: e };
      }

      const byCompany = (rows: { company_id: string | null }[] | null) => {
        const map: Record<string, number> = {};
        (rows ?? []).forEach((r) => {
          if (r.company_id) map[r.company_id] = (map[r.company_id] ?? 0) + 1;
        });
        return map;
      };

      const clientsCount = byCompany(clientes.data);
      const processosCount = byCompany(processos.data);
      const audienciasCount = byCompany(hearings.data);

      const profs = profiles.data ?? [];
      const adminsByCompany: Record<string, string | null> = {};
      const profesCount: Record<string, number> = {};
      const lastLogin: Record<string, string | null> = {};
      profs.forEach((p) => {
        if (!p.company_id) return;
        if (p.role !== "super_admin") {
          profesCount[p.company_id] = (profesCount[p.company_id] ?? 0) + 1;
        }
        if (p.role === "admin") {
          adminsByCompany[p.company_id] = p.full_name || p.email;
        }
        const ua = p.updated_at as string | null;
        if (ua && (!lastLogin[p.company_id] || ua > lastLogin[p.company_id]!)) {
          lastLogin[p.company_id] = ua;
        }
      });

      const licenseByCompany: Record<string, number> = {};
      (alerts.data ?? []).forEach((a) => {
        if (!a.company_id) return;
        const created = new Date(a.created_at as string);
        const elapsed = Math.floor(
          (Date.now() - new Date(created.getFullYear(), created.getMonth(), created.getDate()).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        const remaining = Math.max(0, (a.days_remaining as number) - elapsed);
        // mantém o menor (mais urgente) se houver vários
        licenseByCompany[a.company_id] =
          licenseByCompany[a.company_id] == null
            ? remaining
            : Math.min(licenseByCompany[a.company_id], remaining);
      });

      void authLog; // updated_at dos profiles já cobre "último login"

      return companies.map((c) => {
        const row = c as Record<string, unknown>;
        return {
        id: c.id,
        nome: c.nome,
        status: c.status,
        company_type: (c.company_type as "office" | "freelancer") ?? "office",
        plan: (row.plan as string | undefined) ?? (row.subscription_tier as string | undefined) ?? null,
        created_at: c.created_at,
        administrador: adminsByCompany[c.id] ?? null,
        clientes: clientsCount[c.id] ?? 0,
        processos: processosCount[c.id] ?? 0,
        profissionais: profesCount[c.id] ?? 0,
        audiencias: audienciasCount[c.id] ?? 0,
        ultimo_login: lastLogin[c.id] ?? null,
        dias_licenca: licenseByCompany[c.id] ?? null,
        };
      });
    },
  });
}
