import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Breadcrumbs, PageHeader } from "@/components/ui";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "WoW Forever Addons & Community Tools",
  "ForeverGuard community tools for WoW Forever: private player notes, group checks and reviewed safety context with an appeal process.",
  "/addons",
);
export default function AddonsPage(): React.JSX.Element {
  return (
    <div className="container">
      <Breadcrumbs items={[{ label: "Addons", href: "/addons" }]} />
      <PageHeader
        eyebrow="USEFUL TOOLS. RESPECT FOR THE PLAYER."
        title="WoW Forever community addons"
        description="A little help for your next group, built around transparency and player choice."
      />
      <section className="addon-layout">
        <div>
          <div className="addon-emblem">
            <ShieldCheck size={45} strokeWidth={1.3} />
          </div>
          <h2>ForeverGuard</h2>
          <p className="section-lead">
            Keep your own player notes. Check your group against reviewed
            community context. Stay in control of what you see.
          </p>
          <p className="muted">
            Optional, with no gameplay automation and no automatic messages or
            reports.
          </p>
          <Link className="button primary" href="/addons/foreverguard">
            Explore ForeverGuard
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <div>
          <div className="editorial-cover">
            <Image
              src="/images/rp.webp"
              alt="A quiet path through Azeroth"
              fill
              sizes="(max-width: 700px) 100vw, 50vw"
            />
          </div>
          <div className="prose" style={{ marginTop: 24 }}>
            <h3>Choose your tools carefully</h3>
            <p>
              Only download addons from a source you trust. Check the version,
              active game client, and release notes. A community tool is
              context, not a guarantee of another player&apos;s conduct.
            </p>
            <p>
              Read our <Link href="/safety">review and appeal standards</Link>{" "}
              before using public alerts.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
