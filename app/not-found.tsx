import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound(): React.JSX.Element {
  return (
    <main className="container error-page" id="main-content">
      <Compass size={48} />
      <p className="eyebrow">404 / Off the beaten path</p>
      <h1>This page isn&apos;t here.</h1>
      <p>The link may have changed, or the page is no longer published.</p>
      <Link className="button primary" href="/">
        Back to the community
      </Link>
    </main>
  );
}
