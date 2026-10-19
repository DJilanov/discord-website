import { notFound } from "next/navigation";
import { getMember } from "@/lib/member-auth";
import { raids, serverRaidTime } from "@/lib/raids/service";
import { HttpError } from "@/lib/security";
import { RaidAccess } from "@/components/raids/access";
import { SoftReserves } from "@/components/raids/soft-reserves";
import type { EventView } from "@/lib/raids/contracts";

export default async function ReservesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const member = await getMember();
  if (!member) return <RaidAccess returnTo={`/raids/${id}/reserves`} />;
  let event: EventView;
  try {
    event = await raids.get(member, id);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }
  if (event.eventType !== "raid") notFound();
  return (
    <SoftReserves
      key={event.id}
      event={event}
      initialNow={await serverRaidTime()}
    />
  );
}
