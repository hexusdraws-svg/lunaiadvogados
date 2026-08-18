import type { Profile } from "@/hooks/use-auth";

// ============================================================
// ROLE CONSTANTS
// ============================================================
// "role" column: only admin or professional for company users.
// Super admin is a separate architecture handled outside this model.

export const ROLES = {
  ADMIN: "admin",
  PROFESSIONAL: "professional",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// ============================================================
// PROFESSIONAL ROLE CONSTANTS
// ============================================================
// These define the professional function within a company.
// All fine-grained permissions derive from this field.

export const PROFESSIONAL_ROLES = {
  LAWYER: "lawyer",
  ASSISTANT: "assistant",
  RECEPTIONIST: "receptionist",
  ACCOUNTANT: "accountant",
  SECRETARY: "secretary",
} as const;

export type ProfessionalRole =
  (typeof PROFESSIONAL_ROLES)[keyof typeof PROFESSIONAL_ROLES];

// ============================================================
// CAPABILITY MODEL
// ============================================================
// Every action in the system maps to a capability. The
// can() function checks whether a profile has that capability.

export type Capability =
  // Company / team
  | "manage_company"
  | "manage_team"
  | "view_exec_dashboard"
  // Core features
  | "view_processes"
  | "create_process"
  | "edit_process"
  | "delete_process"
  | "conclude_process"
  | "create_hearing"
  | "edit_hearing"
  | "cancel_hearing"
  | "create_contract"
  | "edit_contract"
  | "delete_contract"
  | "create_client"
  | "edit_client"
  | "delete_client"
  | "create_task"
  | "edit_task"
  | "delete_task"
  | "complete_task"
  | "manage_finances"
  | "manage_expenses"
  // Collaboration
  | "invite_collaborators"
  | "manage_process_stages"
  | "upload_documents"
  | "add_comments"
  // Scoped views
  | "view_own_processes_only";

// ============================================================
// ROLE HIERARCHY
// ============================================================

const ROLE_HIERARCHY: Record<Role, number> = {
  [ROLES.ADMIN]: 2,
  [ROLES.PROFESSIONAL]: 1,
};

export function hasMinimumRole(
  profile: Profile | null,
  minimumRole: Role,
): boolean {
  if (!profile || profile.status !== "active") return false;
  return (ROLE_HIERARCHY[profile.role] ?? 0) >= (ROLE_HIERARCHY[minimumRole] ?? 0);
}

// ============================================================
// CAPABILITY MATRIX
// ============================================================
// Admins receive all capabilities by default, plus the
// capabilities of their professional_role.
// Professionals receive only the capabilities of their
// professional_role.

function capabilitiesForProfessionalRole(
  professionalRole: ProfessionalRole | null,
): Set<Capability> {
  const caps = new Set<Capability>();

  switch (professionalRole) {
    case PROFESSIONAL_ROLES.LAWYER:
      caps.add("view_processes");
      caps.add("create_process");
      caps.add("edit_process");
      caps.add("delete_process");
      caps.add("conclude_process");
      caps.add("create_hearing");
      caps.add("edit_hearing");
      caps.add("cancel_hearing");
      caps.add("create_contract");
      caps.add("edit_contract");
      caps.add("delete_contract");
      caps.add("create_client");
      caps.add("edit_client");
      caps.add("delete_client");
      caps.add("create_task");
      caps.add("edit_task");
      caps.add("delete_task");
      caps.add("complete_task");
      caps.add("manage_finances");
      caps.add("manage_process_stages");
      caps.add("upload_documents");
      caps.add("add_comments");
      break;

    case PROFESSIONAL_ROLES.ASSISTANT:
      caps.add("view_processes");
      caps.add("edit_process");
      caps.add("create_hearing");
      caps.add("edit_hearing");
      caps.add("cancel_hearing");
      caps.add("create_contract");
      caps.add("edit_contract");
      caps.add("create_client");
      caps.add("create_task");
      caps.add("edit_task");
      caps.add("complete_task");
      caps.add("manage_process_stages");
      caps.add("upload_documents");
      caps.add("add_comments");
      break;

    case PROFESSIONAL_ROLES.RECEPTIONIST:
      caps.add("view_processes");
      caps.add("create_client");
      caps.add("edit_client");
      caps.add("create_hearing");
      caps.add("edit_hearing");
      caps.add("cancel_hearing");
      caps.add("create_task");
      caps.add("complete_task");
      caps.add("upload_documents");
      caps.add("add_comments");
      break;

    case PROFESSIONAL_ROLES.ACCOUNTANT:
      caps.add("view_processes");
      caps.add("create_client");
      caps.add("create_task");
      caps.add("complete_task");
      caps.add("manage_finances");
      caps.add("manage_expenses");
      caps.add("upload_documents");
      caps.add("add_comments");
      break;

    case PROFESSIONAL_ROLES.SECRETARY:
      caps.add("view_processes");
      caps.add("create_client");
      caps.add("edit_client");
      caps.add("create_hearing");
      caps.add("edit_hearing");
      caps.add("cancel_hearing");
      caps.add("upload_documents");
      caps.add("add_comments");
      break;

    default:
      break;
  }

  return caps;
}

function capabilitiesForAdmin(profile: Profile | null): Set<Capability> {
  const caps = new Set<Capability>([
    "manage_company",
    "manage_team",
    "view_exec_dashboard",
    "view_processes",
    "create_process",
    "edit_process",
    "delete_process",
    "conclude_process",
    "create_hearing",
    "edit_hearing",
    "cancel_hearing",
    "create_contract",
    "edit_contract",
    "delete_contract",
    "create_client",
    "edit_client",
    "delete_client",
    "create_task",
    "edit_task",
    "delete_task",
    "complete_task",
    "manage_finances",
    "manage_expenses",
    "invite_collaborators",
    "manage_process_stages",
    "upload_documents",
    "add_comments",
  ]);

  // Admins also get capabilities from their professional_role
  if (profile?.professional_role) {
    const roleCaps = capabilitiesForProfessionalRole(profile.professional_role);
    roleCaps.forEach((c) => caps.add(c));
  }

  return caps;
}

function capabilitiesForProfessional(profile: Profile | null): Set<Capability> {
  if (!profile?.professional_role) {
    return new Set<Capability>();
  }
  return capabilitiesForProfessionalRole(profile.professional_role);
}

export function capabilitiesFor(profile: Profile | null): Set<Capability> {
  const result = new Set<Capability>();

  if (!profile || profile.status !== "active") return result;

  if (profile.role === ROLES.ADMIN) {
    capabilitiesForAdmin(profile).forEach((c) => result.add(c));
  } else if (profile.role === ROLES.PROFESSIONAL) {
    capabilitiesForProfessional(profile).forEach((c) => result.add(c));
  }

  return result;
}

export function can(profile: Profile | null, capability: Capability): boolean {
  return capabilitiesFor(profile).has(capability);
}

// ============================================================
// LEGACY COMPATIBILITY
// ============================================================

export type PermissionAction =
  | "view_team"
  | "add_user"
  | "edit_user"
  | "remove_user"
  | "edit_company"
  | "edit_company_logo"
  | "edit_own_profile"
  | "view_dashboard"
  | "view_processes"
  | "create_etapas"
  | "attach_documents"
  | "manage_tasks"
  | "manage_finances";

const ACTION_TO_CAPABILITY: Record<PermissionAction, Capability> = {
  view_team: "manage_team",
  add_user: "manage_team",
  edit_user: "manage_team",
  remove_user: "manage_team",
  edit_company: "manage_company",
  edit_company_logo: "manage_company",
  edit_own_profile: "view_processes",
  view_dashboard: "view_processes",
  view_processes: "view_processes",
  create_etapas: "manage_process_stages",
  attach_documents: "upload_documents",
  manage_tasks: "create_task",
  manage_finances: "manage_finances",
};

export function canPerform(profile: Profile | null, action: PermissionAction): boolean {
  if (!profile || profile.status !== "active") return false;
  if (action === "edit_own_profile") return true;
  const cap = ACTION_TO_CAPABILITY[action];
  return capabilitiesFor(profile).has(cap);
}

// ============================================================
// ROUTE PERMISSION MAPPING
// ============================================================

export const ROUTE_PERMISSIONS: Record<string, Capability> = {
  "/cadastros/profissionais": "manage_team",
  "/empresa": "manage_company",
  "/financas": "manage_finances",
  "/financas/recebimentos": "manage_finances",
  "/financas/despesas": "manage_expenses",
  "/admin/painel-executivo": "view_exec_dashboard",
  "/processos": "view_processes",
  "/processos/$id": "view_processes",
};

export function getRoutePermission(path: string): Capability | null {
  const cleanPath = path.split("?")[0].replace(/\/$/, "") || "/";
  if (ROUTE_PERMISSIONS[cleanPath]) return ROUTE_PERMISSIONS[cleanPath];
  const basePath = cleanPath.split("/")[1] ? `/${cleanPath.split("/")[1]}` : cleanPath;
  return ROUTE_PERMISSIONS[basePath] ?? null;
}

export function canAccessRoute(profile: Profile | null, path: string): boolean {
  const required = getRoutePermission(path);
  if (!required) return true;
  return can(profile, required);
}