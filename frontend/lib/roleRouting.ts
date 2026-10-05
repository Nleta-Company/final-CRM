export type CrmRole =
  | "ADMIN"
  | "BDE_SALES"
  | "OWNER"
  | "SUB_ADMIN";

export function normalizeRole(
  role?: string | null
): CrmRole | null {
  if (!role) return null;

  const normalized = role.trim().toUpperCase();

  /*
   * ==================================================
   * ADMIN
   * ==================================================
   */
  if (normalized === "ADMIN") {
    return "ADMIN";
  }

  /*
   * ==================================================
   * BDE / SALES
   * ==================================================
   */
  if (
    normalized === "BDE" ||
    normalized === "SALES" ||
    normalized === "BDE/SALES" ||
    normalized === "BDE_SALES" ||
    normalized === "BDE / SALES"
  ) {
    return "BDE_SALES";
  }

  /*
   * ==================================================
   * OWNER / CLIENT
   * ==================================================
   */
  if (
    normalized === "OWNER" ||
    normalized === "CLIENT"
  ) {
    return "OWNER";
  }

  /*
   * ==================================================
   * SUB ADMIN
   * ==================================================
   *
   * Supports:
   * SUB_ADMIN
   * SUB ADMIN
   * SUB-ADMIN
   * SUBADMIN
   */
  if (
    normalized === "SUB_ADMIN" ||
    normalized === "SUB ADMIN" ||
    normalized === "SUB-ADMIN" ||
    normalized === "SUBADMIN"
  ) {
    return "SUB_ADMIN";
  }

  /*
   * ==================================================
   * OLD / UNSUPPORTED ROLES
   * ==================================================
   *
   * Technician / Inspector / any other old CRM role
   * is intentionally not supported.
   */
  return null;
}

export function getDashboardPath(
  role?: string | null
): string {
  switch (normalizeRole(role)) {
    case "ADMIN":
      return "/dashboard";

    case "BDE_SALES":
      return "/bde/dashboard";

    case "OWNER":
      return "/owner/dashboard";

    case "SUB_ADMIN":
      return "/sub-admin/dashboard";

    default:
      return "/signin";
  }
}