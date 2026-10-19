import Link from "next/link";
import { Brand } from "@/components/ui";
import { getMember, memberSignOut } from "@/lib/member-auth";
import "@/components/raids/raids.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Event planner | WoW Forever Discord",
  robots: { index: false, follow: false },
};
export default async function PilotLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const member = await getMember();
  return (
    <div className="raid-shell">
      <header className="raid-nav">
        <Brand />
        <nav aria-label="Event planner">
          <Link href="/raids">Events</Link>
          <Link href="/account/characters">Characters</Link>
          {member && (
            <form
              action={async () => {
                "use server";
                await memberSignOut({ redirectTo: "/raids" });
              }}
            >
              <button className="button secondary">Sign out</button>
            </form>
          )}
        </nav>
      </header>
      <main id="main-content" className="raid-main">
        {children}
      </main>
      <footer className="raid-footer">
        WoW Forever Discord &middot; Open source contributors
      </footer>
    </div>
  );
}
