import { dashboardPathByRole } from "@/lib/constants";

export function getDashboardPath(role) {
  if (!role) return "/login";
  return dashboardPathByRole[role] ?? "/unauthorized";
}

export function getHomePath(isAuthenticated, role) {
  if (!isAuthenticated) return "/";
  return getDashboardPath(role);
}
