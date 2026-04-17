import {
  Bell,
  BookOpenCheck,
  ClipboardList,
  CreditCard,
  Home,
  LayoutDashboard,
  ShieldCheck,
  UtensilsCrossed,
  UserRound,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

export const USER_ROLES = {
  STUDENT: "student",
  STAFF: "staff",
  PROVOST: "provost",
};

export const roleLabels = {
  [USER_ROLES.STUDENT]: "Student",
  [USER_ROLES.STAFF]: "Staff",
  [USER_ROLES.PROVOST]: "Provost",
};

export const appMeta = {
  shortName: "JUST",
  fullName: "Shaheed Mashiur Rahman Hall",
  hallName: "Shaheed Mashiur Rahman Hall",
  universityName: "Jashore University of Science and Technology",
  systemLabel: "JUST Hall Management System",
  pageTitle: "Shaheed Mashiur Rahman Hall | JUST",
  logoPath: "/assets/university-logo.png",
};

export const dashboardPathByRole = {
  [USER_ROLES.STUDENT]: "/student/dashboard",
  [USER_ROLES.STAFF]: "/staff/dashboard",
  [USER_ROLES.PROVOST]: "/provost/dashboard",
};

export const roleNavigationGroups = {
  [USER_ROLES.STUDENT]: [
    {
      id: "general",
      label: "General",
      items: [
        { label: "Dashboard", path: "/student/dashboard", icon: LayoutDashboard },
        { label: "Profile", path: "/student/profile", icon: UserRound },
      ],
    },
    {
      id: "hall",
      label: "Hall Management",
      items: [
        { label: "General Application", path: "/student/general-application", icon: BookOpenCheck },
        { label: "Room Availability", path: "/student/room-availability", icon: Home },
        { label: "Allocation Application", path: "/student/room-allocation", icon: Home },
      ],
    },
    {
      id: "dining",
      label: "Dining",
      items: [
        { label: "Meals", path: "/menu", icon: UtensilsCrossed },
        { label: "My Meal Tokens", path: "/my-meal-orders", icon: UtensilsCrossed },
        { label: "Wallet", path: "/student/wallet", icon: Wallet },
      ],
    },
    {
      id: "services",
      label: "Services",
      items: [
        { label: "Complaints", path: "/student/complaints", icon: Bell },
        { label: "Maintenance Requests", path: "/student/maintenance-requests", icon: Wrench },
        { label: "Support Tickets", path: "/student/support-tickets", icon: Bell },
      ],
    },
    {
      id: "system",
      label: "System",
      items: [{ label: "Notices", path: "/student/notices", icon: Bell }],
    },
  ],
  [USER_ROLES.STAFF]: [
    {
      id: "general",
      label: "General",
      items: [
        { label: "Dashboard", path: "/staff/dashboard", icon: LayoutDashboard },
        { label: "Profile", path: "/staff/profile", icon: UserRound },
      ],
    },
    {
      id: "dining",
      label: "Dining",
      items: [
        { label: "Meal Management", path: "/staff/meals", icon: UtensilsCrossed },
        { label: "Token Check", path: "/staff/orders", icon: UtensilsCrossed },
        { label: "Dining Summary", path: "/staff/orders/stats", icon: UtensilsCrossed },
      ],
    },
    {
      id: "services",
      label: "Services",
      items: [
        { label: "Assigned Tasks", path: "/staff/assigned-tasks", icon: ClipboardList },
        { label: "Complaints", path: "/staff/complaints", icon: Bell },
        { label: "Maintenance", path: "/staff/maintenance", icon: Wrench },
        { label: "Support Tickets", path: "/staff/support-tickets", icon: Bell },
      ],
    },
    {
      id: "system",
      label: "System",
      items: [{ label: "Notices", path: "/staff/notices", icon: Bell }],
    },
  ],
  [USER_ROLES.PROVOST]: [
    {
      id: "general",
      label: "General",
      items: [{ label: "Dashboard", path: "/provost/dashboard", icon: ShieldCheck }],
    },
    {
      id: "hall",
      label: "Hall Management",
      items: [
        { label: "Student Management", path: "/provost/student-management", icon: Users },
        { label: "Staff Management", path: "/provost/staff-management", icon: Users },
        { label: "General Application", path: "/provost/general-applications", icon: ClipboardList },
        { label: "Room Management", path: "/provost/room-management", icon: Home },
        { label: "Allocation Application", path: "/provost/room-allocation", icon: Home },
      ],
    },
    {
      id: "dining",
      label: "Dining",
      items: [
        { label: "Meal Reports", path: "/provost/meal-reports", icon: UtensilsCrossed },
        { label: "Payments", path: "/provost/payments", icon: CreditCard },
      ],
    },
    {
      id: "services",
      label: "Services",
      items: [
        { label: "Staff Tasks", path: "/provost/staff-tasks", icon: ClipboardList },
        { label: "Complaints", path: "/provost/complaints", icon: Bell },
        { label: "Maintenance", path: "/provost/maintenance", icon: Wrench },
        { label: "Support Tickets", path: "/provost/support-tickets", icon: Bell },
      ],
    },
    {
      id: "system",
      label: "System",
      items: [
        { label: "Notices", path: "/provost/notices", icon: Bell },
        { label: "Analytics / Reports", path: "/provost/analytics-reports", icon: BookOpenCheck },
      ],
    },
  ],
};

export const roleNavigation = Object.fromEntries(
  Object.entries(roleNavigationGroups).map(([role, groups]) => [role, groups.flatMap((group) => group.items)])
);

export function getRoleNavigation(role) {
  return roleNavigation[role] ?? [];
}

export function getRoleNavigationGroups(role) {
  return roleNavigationGroups[role] ?? [];
}

export function shouldUseExactNavMatch(role, path) {
  return getRoleNavigation(role).some(
    (item) => item.path !== path && item.path.startsWith(`${path}/`)
  );
}

export function findNavigationItem(role, pathname) {
  return getRoleNavigation(role).find((item) => item.path === pathname) ?? null;
}

export function findNavigationItemByPrefix(role, pathname) {
  const matches = getRoleNavigation(role).filter(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`)
  );

  if (!matches.length) return null;

  return matches.sort((a, b) => b.path.length - a.path.length)[0];
}

export function findNavigationItemByPath(pathname) {
  return Object.values(roleNavigation).flat().find((item) => item.path === pathname) ?? null;
}
