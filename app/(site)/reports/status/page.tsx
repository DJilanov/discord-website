import { Breadcrumbs, PageHeader } from "@/components/ui";
import { CaseStatus } from "@/components/case-status";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "Private Case Status",
  "Check the status of your private report or appeal.",
  "/reports/status",
  true,
);
export default function Page(): React.JSX.Element {
  return (
    <div className="container narrow">
      <Breadcrumbs
        items={[{ label: "Case status", href: "/reports/status" }]}
      />
      <PageHeader
        eyebrow="PRIVATE MODERATION"
        title="Check your case"
        description="Use the reference and private access key from your receipt. Neither is included in the page URL."
      />
      <section className="section" style={{ paddingTop: 0 }}>
        <CaseStatus />
      </section>
    </div>
  );
}
