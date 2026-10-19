import { getMember } from "@/lib/member-auth";
import { raids, serverRaidTime } from "@/lib/raids/service";
import { RaidAccess } from "@/components/raids/access";
import { RaidList } from "@/components/raids/workspace";

export default async function RaidsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}): Promise<React.JSX.Element> {
  const member = await getMember();
  const { error } = await searchParams;
  return member ? (
    <RaidList
      events={await raids.list(member)}
      initialNow={await serverRaidTime()}
    />
  ) : (
    <RaidAccess error={typeof error === "string" ? error : undefined} />
  );
}
