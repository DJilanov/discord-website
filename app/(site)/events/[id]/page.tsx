import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicEvent } from "@/lib/raids/public-events";
import { eventArtwork } from "@/lib/raids/event-artwork";
import { pageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/config";
import { PublicEventSummary } from "@/components/public-event";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getPublicEvent((await params).id);
  if (!event) notFound();
  const description =
    `${event.activity} · ${event.region} ${event.faction} ${event.ruleset} · ${event.capacity}-player group. ${event.description}`
      .replace(/\s+/g, " ")
      .slice(0, 180);
  const metadata = pageMetadata(
    event.title,
    description,
    `/events/${event.id}`,
    event.endsAt <= new Date(),
  );
  const artwork = eventArtwork("forever", event.eventType, event.raidName);
  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      images: [
        {
          url: `${SITE_URL}${artwork.file}`,
          width: artwork.width,
          height: artwork.height,
          alt: artwork.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
      images: [`${SITE_URL}${artwork.file}`],
    },
  };
}

export default async function PublicEventPage({
  params,
}: Props): Promise<React.JSX.Element> {
  const event = await getPublicEvent((await params).id);
  if (!event) notFound();
  return <PublicEventSummary event={event} />;
}
