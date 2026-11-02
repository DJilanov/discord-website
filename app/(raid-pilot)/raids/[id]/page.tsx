import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRaidShareMetadata } from "@/lib/raids/share-metadata";
import { getMember } from "@/lib/member-auth";
import { raids, serverRaidTime } from "@/lib/raids/service";
import { HttpError } from "@/lib/security";
import { RaidAccess } from "@/components/raids/access";
import { RaidDetail } from "@/components/raids/workspace";
import type { EventView } from "@/lib/raids/contracts";
import { publishedCatalogs } from "@/lib/raids/catalog-store";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  return getRaidShareMetadata((await params).id, "signup");
}

export default async function RaidPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const member = await getMember();
  const { id } = await params;
  if (!member) return <RaidAccess returnTo={`/raids/${id}`} />;
  let event: EventView;
  try {
    event = await raids.get(member, id);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }
  return (
    <RaidDetail
      key={event.version}
      event={event}
      initialNow={await serverRaidTime()}
      characters={await raids.characters(member)}
      catalogs={event.isOrganizer ? await publishedCatalogs() : []}
      history={await raids.history(member, id)}
    />
  );
}
