import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { StatusBadge } from "@/components/ui";

export interface TableRow {
  id: string;
  title: string;
  detail: string;
  status: string;
  date: Date;
  href: string;
}
export function AdminList({
  rows,
  createHref,
  createLabel = "Create new",
}: {
  rows: TableRow[];
  createHref?: string;
  createLabel?: string;
}): React.JSX.Element {
  return (
    <>
      {createHref && (
        <p>
          <Link className="button primary" href={createHref}>
            <Plus size={16} />
            {createLabel}
          </Link>
        </p>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Name / reference</th>
              <th scope="col">Details</th>
              <th scope="col">Status</th>
              <th scope="col">Updated (UTC)</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.title}</td>
                  <td>{row.detail}</td>
                  <td>
                    <StatusBadge value={row.status} />
                  </td>
                  <td>
                    <time dateTime={row.date.toISOString()}>
                      {row.date.toLocaleDateString("en-GB", {
                        timeZone: "UTC",
                      })}
                    </time>
                  </td>
                  <td>
                    <Link href={row.href}>Review</Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>No records in this section yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="fine-print">Showing up to 100 most recent records.</p>
    </>
  );
}

export function EditorHeader({
  title,
  backHref,
  children,
}: {
  title: string;
  backHref: string;
  children?: ReactNode;
}): React.JSX.Element {
  return (
    <>
      <Link className="text-link" href={backHref}>
        <ArrowLeft size={14} />
        Back to list
      </Link>
      <h1 style={{ marginTop: 22 }}>{title}</h1>
      {children}
    </>
  );
}
