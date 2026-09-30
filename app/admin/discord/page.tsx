import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { snapshot, serializeSnapshot } from "@/lib/discord-bridge/admin";
import { webBridgeStore } from "@/lib/discord-bridge/web-store";
import { DiscordBridgeAdmin } from "@/components/discord-bridge-admin";
import "./bridge.css";

export const dynamic = "force-dynamic";
export default async function DiscordAdmin(): Promise<React.JSX.Element> {
  const staff = await requireStaff();
  if (staff.role === "editor") redirect("/admin");
  let initial: Awaited<ReturnType<typeof serializeSnapshot>> | null = null;
  try {
    initial = serializeSnapshot(await snapshot(webBridgeStore, staff));
  } catch {
    /* The setup view remains available before the additive migration is installed. */
  }
  if (!initial) {
    return (
      <section>
        <h1>Discord bridge</h1>
        <p role="alert">
          Bridge storage is unavailable. Check the database connection and apply
          the bridge migration before continuing. No live configuration has
          changed.
        </p>
      </section>
    );
  }
  return <DiscordBridgeAdmin initial={initial} />;
}
