import { useAuth } from "@/hooks/use-auth";

/**
 * Centralized helper for financial document visibility permissions.
 *
 * Professionals (role !== "admin") can only see documents they created.
 * Admins can see all documents in the company.
 *
 * Usage:
 *   const { canViewDocument, filterQuery } = useFinancialPermissions();
 *
 * Future sharing support:
 *   When document sharing between professionals is implemented,
 *   extend this hook to also check shared document access.
 *   See TODO markers below for integration points.
 */
export function useFinancialPermissions() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  /**
   * Returns true if the current user can view a document.
   * For professionals, only documents they created are visible.
   * For admins, all documents are visible.
   */
  const canViewDocument = (createdBy: string | null | undefined): boolean => {
    if (isAdmin) return true;
    if (!createdBy) return false;
    return createdBy === profile?.id;
  };

  /**
   * Returns a Supabase query modifier that filters by created_by
   * for professionals, or returns the query unchanged for admins.
   *
   * Usage:
   *   let query = supabase.from("fee_notes").select("*").eq("company_id", companyId);
   *   query = filterByCreatedBy(query, profile);
   */
  const filterByCreatedBy = <T extends { eq: (col: string, val: string) => T }>(
    query: T,
    profileId: string | null | undefined,
  ): T => {
    if (isAdmin || !profileId) return query;
    return query.eq("created_by", profileId);
  };

  /**
   * Returns the created_by filter value for a professional,
   * or null for admins (meaning no filter).
   */
  const getCreatedByFilter = (): string | null => {
    if (isAdmin) return null;
    return profile?.id ?? null;
  };

  return {
    isAdmin,
    canViewDocument,
    filterByCreatedBy,
    getCreatedByFilter,
  };
}

/**
 * Future sharing integration point:
 *
 * When implementing document sharing between professionals,
 * add a new table `document_shares` with columns:
 *   - document_id (UUID, references fee_notes.id)
 *   - shared_by (UUID, references profiles.id)
 *   - shared_with (UUID, references profiles.id)
 *   - permission (enum: "view", "edit")
 *   - created_at (timestamp)
 *
 * Then extend `canViewDocument` to also check:
 *   created_by = profile.id OR document_id IN (shared document_ids)
 *
 * And extend `filterByCreatedBy` to include a subquery for shared documents.
 */