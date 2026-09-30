import Link from "next/link";
import { Brand } from "@/components/ui";

export function Footer(): React.JSX.Element {
  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <div className="footer-brand">
          <Brand />
          <p>
            A place for your next adventure.
            <br />
            The community Discord for WoW Forever.
          </p>
          <Link className="text-link" href="/about">
            Meet the community team
          </Link>
        </div>
        <div>
          <h3>Find your people</h3>
          <Link href="/discord">Join the Discord</Link>
          <Link href="/guild-recruitment">Guild recruitment</Link>
          <Link href="/lfg">Looking for group</Link>
          <Link href="/discord/eu">European community</Link>
          <Link href="/discord/na">North American community</Link>
        </div>
        <div>
          <h3>Explore</h3>
          <Link href="/servers/pve">PvE community</Link>
          <Link href="/servers/pvp">PvP community</Link>
          <Link href="/servers/rp">Roleplay community</Link>
          <Link href="/guides">Guides &amp; resources</Link>
          <Link href="/addons">Addons &amp; tools</Link>
          <Link href="/contribute">Community testing</Link>
        </div>
        <div>
          <h3>Community first</h3>
          <Link href="/about">About the hub</Link>
          <Link href="/rules">Community rules</Link>
          <Link href="/reports">Report an incident</Link>
          <Link href="/appeals">Appeal a decision</Link>
          <Link href="/transparency">Transparency</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <p>
          Unofficial fan community. Not affiliated with or endorsed by Blizzard
          Entertainment. Warcraft imagery belongs to Blizzard Entertainment.
        </p>
        <div>
          <Link href="/privacy">Privacy</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/admin">Staff login</Link>
        </div>
      </div>
    </footer>
  );
}
