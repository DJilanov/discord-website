import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ClipboardCheck,
  Download,
  LockKeyhole,
} from "lucide-react";
import { Breadcrumbs, PageHeader } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";
import {
  contributorTasks,
  testerReportTemplate,
} from "@/content/contributor-tasks";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "WoW Forever Community Testing: Tasks & Feedback",
  "Pick a concrete WoW Trader, guide or organizer check. Copy a useful report and see which addon tests require maintainer approval.",
  "/contribute",
);

export default function ContributePage(): React.JSX.Element {
  return (
    <div className="container tools-page">
      <Breadcrumbs
        items={[{ label: "Community testing", href: "/contribute" }]}
      />
      <PageHeader
        eyebrow="COMMUNITY TEST DESK"
        title="Make the next visit better"
        description="Already invited to test? Start with one short assignment and return one result we can reproduce."
      />
      <div className="tester-intro">
        <div>
          <h2>A small check goes a long way</h2>
          <p>
            Web and guide checks need only a browser. In-game and collector
            tests need an agreed package and maintainer approval. Nobody needs
            to spend gold, buy beta access or install a desktop app to help.
          </p>
          <p>
            These are suggested assignments, not a live claim queue. Tell the
            team which task you are taking in <strong>help-support</strong>,
            then use the report below. Maintainers review results manually.
          </p>
          <a href="#assignments" className="text-link">
            Choose a task <ArrowRight size={16} />
          </a>
        </div>
        <Image
          src="/images/forever-adventure.webp"
          alt="A dwarf shaman among totems in Blizzard's Forever preview"
          width={1400}
          height={788}
          sizes="(max-width: 700px) 100vw, 450px"
        />
      </div>
      <section
        className="section"
        id="assignments"
        aria-labelledby="assignments-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">FIVE WAYS TO CONTRIBUTE</p>
            <h2 id="assignments-title">Pick one assignment</h2>
          </div>
          <a href="#report" className="text-link">
            Report template <ArrowRight size={16} />
          </a>
        </div>
        <div className="task-list">
          {contributorTasks.map((task) => (
            <article className="test-task" key={task.id} id={task.id}>
              <div className="task-heading">
                <div>
                  <span
                    className={
                      task.status === "Open browser check"
                        ? "tool-status available"
                        : "tool-status caution"
                    }
                  >
                    {task.status === "Open browser check" ? (
                      <ClipboardCheck size={14} />
                    ) : (
                      <LockKeyhole size={14} />
                    )}
                    {task.status}
                  </span>
                  <h3>{task.title}</h3>
                </div>
                <span className="fine-print">{task.time}</span>
              </div>
              <p>{task.purpose}</p>
              <details>
                <summary>Assignment steps</summary>
                <ol>
                  {task.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p>
                  <strong>A useful result:</strong> {task.completion}
                </p>
              </details>
              <div className="task-footer">
                <code>{task.id}</code>
                <Link className="text-link" href={task.target}>
                  {task.targetLabel}
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section
        className="tester-report section"
        id="report"
        aria-labelledby="report-title"
      >
        <div>
          <p className="eyebrow">ONE RESULT PER REPORT</p>
          <h2 id="report-title">Leave a useful trail</h2>
          <p>
            For a non-sensitive browser or guide result, use{" "}
            <strong>help-support</strong> in our Discord and include the task
            ID. Check for an existing report first, then keep follow-up in the
            same conversation.
          </p>
          <p>
            <strong>
              Ordinary channels and report forums are member-readable.
            </strong>{" "}
            Do not post credentials, account details, private chat, raw scan
            files or app diagnostics. For collector results or security
            concerns, ask a maintainer for a private route before sharing
            details.
          </p>
          <p>
            Posting feedback does not automatically create a website record or
            compatibility badge. Maintainers review, reproduce and request a
            retest where needed. Public credit is optional and requires your
            approval.
          </p>
          <Link href="/discord" className="button primary">
            Open the Discord page <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="article-template">
          <div className="template-toolbar">
            <CopyButton
              text={testerReportTemplate.text}
              label="Copy report template"
              errorMessage="Clipboard unavailable. Select the template below or download the text file."
            />
            <Link
              href="/templates/tester-report"
              className="text-link"
              download
              prefetch={false}
            >
              <Download size={16} />
              Download text
            </Link>
          </div>
          <pre>{testerReportTemplate.text}</pre>
        </div>
      </section>
    </div>
  );
}
