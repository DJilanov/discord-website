import { SubmissionPage } from "@/components/submission-page";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "List Your WoW Forever Guild",
  "Submit your guild for the WoW Forever recruitment directory.",
  "/guild-recruitment/new",
  true,
);
export default function Page(): React.JSX.Element {
  return <SubmissionPage kind="guild" />;
}
