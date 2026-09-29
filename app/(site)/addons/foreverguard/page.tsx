import { AddonDetail } from "@/components/addon-detail";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "ForeverGuard - WoW Forever Player Notes & Safety Addon",
  "ForeverGuard adds private player notes, group checks and moderator-reviewed context. View releases, installation, limitations, data updates and appeals.",
  "/addons/foreverguard",
);
export default function Page(): React.JSX.Element {
  return <AddonDetail />;
}
