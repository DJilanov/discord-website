import type { StaffRole } from "@/lib/auth";

export const adminSections: {
  path: string;
  label: string;
  icon: string;
  roles: readonly StaffRole[];
}[] = [
  {
    path: "/admin",
    label: "Overview",
    icon: "home",
    roles: ["owner", "admin", "moderator", "editor"],
  },
  {
    path: "/admin/settings",
    label: "Site settings",
    icon: "settings",
    roles: ["owner", "admin"],
  },
  {
    path: "/admin/guides",
    label: "Guides & news",
    icon: "book",
    roles: ["owner", "admin", "editor"],
  },
  {
    path: "/admin/guilds",
    label: "Guild directory",
    icon: "users",
    roles: ["owner", "admin", "moderator"],
  },
  {
    path: "/admin/groups",
    label: "Group posts",
    icon: "swords",
    roles: ["owner", "admin", "moderator"],
  },
  {
    path: "/admin/reports",
    label: "Reports",
    icon: "shield",
    roles: ["owner", "admin", "moderator"],
  },
  {
    path: "/admin/appeals",
    label: "Appeals",
    icon: "scale",
    roles: ["owner", "admin", "moderator"],
  },
  {
    path: "/admin/safety-alerts",
    label: "Safety alerts",
    icon: "alert",
    roles: ["owner", "admin", "moderator"],
  },
  {
    path: "/admin/addons",
    label: "Addon releases",
    icon: "download",
    roles: ["owner", "admin", "editor"],
  },
  {
    path: "/admin/analytics",
    label: "Traffic & growth",
    icon: "chart",
    roles: ["owner", "admin"],
  },
  {
    path: "/admin/search",
    label: "Search visibility",
    icon: "chart",
    roles: ["owner", "admin"],
  },
  {
    path: "/admin/audit",
    label: "Audit log",
    icon: "list",
    roles: ["owner", "admin"],
  },
  {
    path: "/admin/staff",
    label: "Staff access",
    icon: "key",
    roles: ["owner"],
  },
];
