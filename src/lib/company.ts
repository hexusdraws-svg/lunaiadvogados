import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type CompanyInput = Database["public"]["Tables"]["companies"]["Insert"];

export type CompanyStatus = "active" | "suspended" | "cancelled";

export interface ProfileRecord {
  id: string;
  email: string;
  full_name: string | null;
  role: "super_admin" | "admin" | "professional";
  company_id: string | null;
  status: "pending" | "active" | "suspended";
  profissional_role:
    | "admin"
    | "lawyer"
    | "receptionist"
    | "secretary"
    | "manager"
    | "intern"
    | "other"
    | null;
  avatar_url: string | null;
  contacto: string | null;
  created_at: string;
  updated_at: string;
}

export async function uploadCompanyAsset(file: File, kind: "logo" | "assinatura") {
  const bucket = "company-assets";
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${kind}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    contentType: file.type,
  });
  if (error) {
    console.error("[uploadCompanyAsset] storage error:", error);
    throw error;
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function buildCompanyVars(c: Company | null): Record<string, string> {
  if (!c) return {};
  return {
    empresa_nome: c.nome,
    empresa_endereco: c.endereco ?? "",
    empresa_telefone: c.telefone ?? "",
    empresa_email: c.email ?? "",
    empresa_nuit: c.nuit ?? "",
    empresa_cidade: c.cidade ?? "",
    empresa_pais: c.pais ?? "",
  };
}

// Admin functions for company management
interface CreateCompanyParams {
  nome: string;
  email: string | null;
  telefone: string | null;
  nuit: string | null;
  endereco: string | null;
  cidade?: string | null;
  pais?: string | null;
  adminEmail: string;
  adminName?: string | null;
  adminPhone?: string | null;
  adminRole: "admin" | "professional";
  companyType?: "office" | "freelancer";
}

export async function createCompanyAndPendingProfile(
  params: CreateCompanyParams,
): Promise<boolean> {
  const { error: companyError } = await supabase
    .from("companies")
    .insert({
      nome: params.nome,
      email: params.email,
      telefone: params.telefone,
      nuit: params.nuit,
      endereco: params.endereco,
      cidade: params.cidade ?? null,
      pais: params.pais ?? null,
      status: "active" as const,
      company_type: params.companyType ?? "office",
    })
    .select()
    .single();

  if (companyError) {
    throw new Error(companyError.message);
  }

  // Get the created company ID
  const { data: companies } = await supabase
    .from("companies")
    .select("id")
    .eq("nome", params.nome)
    .order("created_at", { ascending: false })
    .limit(1);

  const companyId = companies?.[0]?.id;
  if (!companyId) {
    throw new Error("Empresa criada mas ID não encontrado");
  }

  // Create pending profile
  const { error: profileError } = await supabase.from("profiles").insert({
    email: params.adminEmail,
    full_name: params.adminName ?? null,
    contacto: params.adminPhone ?? null,
    role: params.adminRole,
    company_id: companyId,
    status: "pending" as const,
  });

  if (profileError) {
    throw new Error(profileError.message);
  }

  return true;
}

export async function createCompanyWithAdmin(params: {
  nome: string;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade?: string | null;
  pais?: string | null;
  status?: "active" | "suspended";
  companyType: "office" | "freelancer";
  adminEmail: string;
  adminPassword: string;
  adminName?: string | null;
  adminPhone?: string | null;
  adminRole?: "admin" | "professional";
  adminCargo?: "lawyer" | "assistant" | "receptionist" | "accountant" | "secretary" | null;
}): Promise<{ companyId: string; userId: string }> {
  const { data: authData, error: authError } = await (supabase as any).auth.admin.createUser({
    email: params.adminEmail,
    password: params.adminPassword,
    email_confirm: true,
  });
  if (authError) {
    throw new Error(authError.message || "Erro ao criar utilizador");
  }

  const userId = authData.user.id;

  const { data: companyData, error: companyError } = await supabase
    .from("companies")
    .insert({
      nome: params.nome,
      email: params.email,
      telefone: params.telefone,
      endereco: params.endereco,
      cidade: params.cidade ?? null,
      pais: params.pais ?? null,
      status: params.status ?? "active",
      company_type: params.companyType,
    })
    .select()
    .single();

  if (companyError) {
    try {
      await (supabase as any).auth.admin.deleteUser(userId);
    } catch {
      // ignore cleanup error
    }
    throw new Error(companyError.message || "Erro ao criar empresa");
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    email: params.adminEmail,
    full_name: params.adminName ?? null,
    contacto: params.adminPhone ?? null,
    role: params.adminRole ?? "admin",
    company_id: companyData.id,
    status: "active" as const,
    professional_role: params.adminCargo ?? null,
  });

  if (profileError) {
    try {
      await supabase.from("companies").delete().eq("id", companyData.id);
      await (supabase as any).auth.admin.deleteUser(userId);
    } catch {
      // ignore cleanup error
    }
    throw new Error(profileError.message || "Erro ao criar perfil do administrador");
  }

  return { companyId: companyData.id, userId };
}

export async function fetchPendingAdminProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, companies:company_id(nome)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function suspendCompany(companyId: string) {
  const { error } = await supabase
    .from("companies")
    .update({ status: "suspended" })
    .eq("id", companyId);

  if (error) throw error;
}

export async function reactivateCompany(companyId: string) {
  const { error } = await supabase
    .from("companies")
    .update({ status: "active" })
    .eq("id", companyId);

  if (error) throw error;
}

export async function cancelCompany(companyId: string) {
  const { error } = await supabase
    .from("companies")
    .update({ status: "cancelled" })
    .eq("id", companyId);

  if (error) throw error;
}

/**
 * PARTE 10 — Eliminar empresa (Super Admin).
 * Ao eliminar, o acesso é completamente desativado: usa a função
 * delete_company_cascade (SECURITY DEFINER) que remove profiles + empresa.
 * Fallback: se a RPC não existir, marca a empresa como cancelled para
 * garantir que ninguém consegue mais usar o sistema.
 */
export async function deleteCompany(companyId: string) {
  const { error } = await supabase.rpc("delete_company_cascade", {
    company_id: companyId,
  } as never);

  if (error) {
    // Fallback: bloquear acesso definitivamente mesmo que a RPC falhe.
    const { error: cancelErr } = await supabase
      .from("companies")
      .update({ status: "cancelled" })
      .eq("id", companyId);
    if (cancelErr) throw error;
  }
}

/** PARTE 6 — Atualizar o tipo da empresa (office | freelancer). */
export async function updateCompanyType(
  companyId: string,
  companyType: "office" | "freelancer",
) {
  const { error } = await supabase
    .from("companies")
    .update({ company_type: companyType })
    .eq("id", companyId);

  if (error) throw error;
}
