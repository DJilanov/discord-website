import { SubmissionPage } from "@/components/submission-page";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "Post a WoW Forever Group",
  "Submit a dungeon, raid, PvP, questing or RP group.",
  "/lfg/new",
  true,
);
export default function Page(): React.JSX.Element {
  return <SubmissionPage kind="group" />;
}
