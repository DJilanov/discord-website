import { SubmissionPage } from "@/components/submission-page";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "WoW Forever Community Appeals",
  "Appeal a community moderation decision with new evidence, context or identity corrections.",
  "/appeals",
);
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}): Promise<React.JSX.Element> {
  const query = await searchParams;
  return (
    <SubmissionPage
      kind="appeal"
      reference={
        /^FG-[A-Z0-9]{12}$/.test(query.reference || "") ? query.reference : ""
      }
    />
  );
}
