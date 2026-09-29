import { SubmissionPage } from "@/components/submission-page";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "Submit a Private Community Report",
  "Privately submit evidence for moderator review.",
  "/reports/new",
  true,
);
export default function Page(): React.JSX.Element {
  return <SubmissionPage kind="report" />;
}
