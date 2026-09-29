import { AddonDetail } from "@/components/addon-detail";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "ForeverGuard Changelog & Downloads",
  "Published ForeverGuard addon releases, test notes, changes, file integrity checks and downloads.",
  "/addons/foreverguard/changelog",
);
export default function Page(): React.JSX.Element {
  return <AddonDetail changelog />;
}
