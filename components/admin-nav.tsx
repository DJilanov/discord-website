"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BarChart3,
  BookOpen,
  Download,
  House,
  KeyRound,
  List,
  LogOut,
  Scale,
  Settings,
  ShieldCheck,
  Swords,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Brand } from "@/components/ui";
import { adminSections } from "@/lib/admin-nav";
import type { Staff } from "@/lib/auth";

const icons: Record<string, LucideIcon> = {
  home: House,
  settings: Settings,
  book: BookOpen,
  users: Users,
  swords: Swords,
  shield: ShieldCheck,
  scale: Scale,
  alert: TriangleAlert,
  download: Download,
  chart: BarChart3,
  list: List,
  key: KeyRound,
};
export function AdminNav({
  staff,
  mobile = false,
}: {
  staff: Staff;
  mobile?: boolean;
}): React.JSX.Element {
  const pathname = usePathname();
  const links = adminSections.filter((section) =>
    section.roles.includes(staff.role),
  );
  const navigation = links.map((section) => {
    const Icon = icons[section.icon];
    return (
      <Link
        key={section.path}
        href={section.path}
        className={pathname === section.path ? "active" : ""}
        aria-current={pathname === section.path ? "page" : undefined}
      >
        {!mobile && <Icon size={16} />}
        {section.label}
      </Link>
    );
  });
  if (mobile)
    return (
      <nav className="admin-mobile-nav" aria-label="Admin navigation">
        {navigation}
      </nav>
    );
  return (
    <aside className="admin-sidebar">
      <Brand />
      <nav aria-label="Admin navigation">{navigation}</nav>
      <div className="admin-sidebar-bottom">
        <p>
          {staff.name}
          <br />
          <span className="badge">{staff.role}</span>
        </p>
        <button
          type="button"
          className="button secondary"
          onClick={() => void signOut({ callbackUrl: "/login" })}
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
}

export function SignOutButton(): React.JSX.Element {
  return (
    <button
      type="button"
      className="button secondary"
      onClick={() => void signOut({ callbackUrl: "/login" })}
    >
      <LogOut size={14} />
      Sign out
    </button>
  );
}
