import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronRight, Compass, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import { jsonLd } from "@/lib/seo";
import { SITE_URL } from "@/lib/config";

export function Brand({
  small = false,
}: {
  small?: boolean;
}): React.JSX.Element {
  return (
    <Link
      className={`brand ${small ? "brand-small" : ""}`}
      href="/"
      aria-label="WoW Forever Discord home"
    >
      <Image
        src="/images/wow-forever-logo.png"
        alt="World of Warcraft Forever"
        width={76}
        height={62}
        className="brand-logo"
      />
      <span>
        <strong>WoW Forever</strong>
        <span>Community Discord</span>
      </span>
    </Link>
  );
}
export function JoinButton({
  available,
  label = "Join the Discord",
  secondary = false,
}: {
  available: boolean;
  label?: string;
  secondary?: boolean;
}): React.JSX.Element {
  return (
    <Link
      href={available ? "/join" : "/discord#invite"}
      prefetch={false}
      className={`button ${secondary ? "secondary" : "primary"}`}
    >
      <MessageCircle size={18} />
      {label}
      <ArrowRight size={16} />
    </Link>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}): React.JSX.Element {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {description && <p className="muted">{description}</p>}
      </div>
      {href && (
        <Link className="text-link" href={href}>
          {linkLabel || "Explore"}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function Breadcrumbs({
  items,
}: {
  items: { label: string; href: string }[];
}): React.JSX.Element {
  const all = [{ label: "Home", href: "/" }, ...items];
  return (
    <>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        {all.map((item, index) => (
          <span key={item.href}>
            {index > 0 && <ChevronRight size={12} />}
            {index === all.length - 1 ? (
              <span aria-current="page">{item.label}</span>
            ) : (
              <Link href={item.href}>{item.label}</Link>
            )}
          </span>
        ))}
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.label,
            item: `${SITE_URL}${item.href}`,
          })),
        }}
      />
    </>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}): React.JSX.Element {
  return (
    <header className="page-header">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      <p className="page-lead">{description}</p>
      {children && <div className="button-row">{children}</div>}
    </header>
  );
}
export function JsonLd({ data }: { data: unknown }): React.JSX.Element {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd(data) }}
    />
  );
}
export interface FaqItem {
  question: string;
  answer: string;
}
export function FAQ({
  items,
}: {
  items: readonly FaqItem[];
}): React.JSX.Element {
  return (
    <>
      <div className="faq-list">
        {items.map((item) => (
          <details key={item.question}>
            <summary>
              {item.question}
              <span aria-hidden="true">+</span>
            </summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }}
      />
    </>
  );
}
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}): React.JSX.Element {
  return (
    <div className="empty-state">
      <Compass size={32} strokeWidth={1.25} />
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function StatusBadge({ value }: { value: string }): React.JSX.Element {
  return (
    <span className={`badge status-${value}`}>{value.replace(/_/g, " ")}</span>
  );
}
