import Link from "next/link";
import { Breadcrumbs, PageHeader } from "@/components/ui";
import {
  SubmissionForm,
  type SubmissionKind,
} from "@/components/submission-form";

const copy = {
  guild: {
    title: "Introduce your guild",
    description:
      "Tell players who you are, when you play, and what makes your community a good place to be.",
    path: "/guild-recruitment/new",
    aside: "A clear invitation",
    points: [
      "Be specific about times and time zones.",
      "Share your loot and attendance expectations.",
      "Only post a guild you are authorized to represent.",
      "Listings are reviewed before publication.",
    ],
  },
  group: {
    title: "Put a group together",
    description:
      "A time, a plan, and the right people. Share the details for your next adventure.",
    path: "/lfg/new",
    aside: "Make it easy to join",
    points: [
      "Include roles needed and your meeting point.",
      "State loot rules and voice expectations.",
      "Posts expire six hours after the start time.",
      "Allow time for staff to review your post.",
    ],
  },
  report: {
    title: "Submit a private report",
    description:
      "Share the facts and supporting evidence. Only authorized moderators can see your report.",
    path: "/reports/new",
    aside: "Context comes first",
    points: [
      "Include character, realm, and region.",
      "Show the full sequence, not only one message.",
      "For loot disputes, include the original rules.",
      "Do not include unrelated personal information.",
      "A report is not automatically a public alert.",
    ],
  },
  appeal: {
    title: "Appeal a decision",
    description:
      "Missing context, mistaken identity, or a decision you disagree with. Every player deserves a fair review.",
    path: "/appeals",
    aside: "A second look",
    points: [
      "Use the FG reference from the alert or case.",
      "Explain which detail should change and why.",
      "Include new evidence when available.",
      "Public alerts are suspended during review.",
      "Keep your receipt to check the outcome.",
    ],
  },
} satisfies Record<
  SubmissionKind,
  {
    title: string;
    description: string;
    path: string;
    aside: string;
    points: string[];
  }
>;

export function SubmissionPage({
  kind,
  reference,
}: {
  kind: SubmissionKind;
  reference?: string;
}): React.JSX.Element {
  const data = copy[kind];
  return (
    <div className="container">
      <Breadcrumbs items={[{ label: data.title, href: data.path }]} />
      <PageHeader
        eyebrow="COMMUNITY FIRST"
        title={data.title}
        description={data.description}
      />
      <div className="form-layout">
        <SubmissionForm
          kind={kind}
          enabled={Boolean(process.env.AUTH_SECRET)}
          reference={reference}
        />
        <aside className="form-aside">
          <h3>{data.aside}</h3>
          <ul>
            {data.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p>
            Read our <Link href="/safety">evidence standards</Link> and{" "}
            <Link href="/privacy">privacy notice</Link>.
          </p>
          {["report", "appeal"].includes(kind) && (
            <p>
              Already submitted?{" "}
              <Link href="/reports/status">Check your case status</Link>.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
