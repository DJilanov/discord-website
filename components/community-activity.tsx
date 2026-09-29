import Link from "next/link";
import { ArrowUpRight, CalendarDays, Users } from "lucide-react";
import { db } from "@/lib/db";
import { groupFilter, guildFilter } from "@/lib/directory";

export interface CommunityScope {
  region?: string;
  faction?: string;
  ruleset?: string;
}

export async function CommunityActivity({
  scope = {},
}: {
  scope?: CommunityScope;
}): Promise<React.JSX.Element> {
  const query = { ...scope };
  const activities: Record<string, string[]> = {
    PvE: ["Dungeon", "Raid", "Questing"],
    PvP: ["PvP premade"],
    RP: ["RP event"],
  };
  const activity = scope.ruleset ? activities[scope.ruleset] : undefined;
  const [groups, guilds] = await Promise.all([
    db.foreverGroup.findMany({
      where: {
        ...groupFilter(query),
        ...(activity ? { activity: { in: activity } } : {}),
      },
      take: 3,
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        title: true,
        region: true,
        faction: true,
        activity: true,
        startsAt: true,
      },
    }),
    db.foreverGuild.findMany({
      where: guildFilter(query),
      take: 3,
      orderBy: [{ lastVerifiedAt: "desc" }, { name: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        region: true,
        faction: true,
        language: true,
        raidDays: true,
        raidTime: true,
      },
    }),
  ]);
  const params = new URLSearchParams(
    Object.entries(scope).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
  );
  const guildHref = `/guild-recruitment${params.size ? `?${params}` : ""}`;
  const groupParams = new URLSearchParams();
  if (scope.region) groupParams.set("region", scope.region);
  if (scope.faction) groupParams.set("faction", scope.faction);
  const groupHref = `/lfg${groupParams.size ? `?${groupParams}` : ""}`;
  return (
    <section
      className="community-activity section"
      aria-label="Guilds and upcoming groups"
    >
      <div>
        <div className="section-heading">
          <h2>Coming up</h2>
          <Link className="text-link" href={groupHref}>
            All groups <ArrowUpRight size={16} />
          </Link>
        </div>
        {groups.length ? (
          <div className="activity-list">
            {groups.map((group) => (
              <article key={group.id} className="activity-entry">
                <p className="eyebrow">
                  {group.region} / {group.faction} / {group.activity}
                </p>
                <h3>
                  <Link
                    href={`/lfg?${new URLSearchParams({ ...Object.fromEntries(groupParams), activity: group.activity })}#group-${group.id}`}
                  >
                    {group.title}
                  </Link>
                </h3>
                <p className="activity-time">
                  <CalendarDays size={16} />
                  <time dateTime={group.startsAt.toISOString()}>
                    {group.startsAt.toLocaleString("en-GB", {
                      timeZone: "UTC",
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}{" "}
                    UTC
                  </time>
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="activity-empty">
            <CalendarDays size={24} />
            <p>No upcoming groups are listed here yet.</p>
            <Link href="/lfg/new" className="text-link">
              Post a group <ArrowUpRight size={16} />
            </Link>
          </div>
        )}
      </div>
      <div>
        <div className="section-heading">
          <h2>Guilds in the community</h2>
          <Link className="text-link" href={guildHref}>
            All guilds <ArrowUpRight size={16} />
          </Link>
        </div>
        {guilds.length ? (
          <div className="activity-list">
            {guilds.map((guild) => (
              <article key={guild.id} className="activity-entry">
                <p className="eyebrow">
                  {guild.region} / {guild.faction} / {guild.language}
                </p>
                <h3>
                  <Link href={`/guilds/${guild.slug}`}>{guild.name}</Link>
                </h3>
                <p>
                  {guild.raidDays.join(", ")}
                  {guild.raidDays.length > 0 && guild.raidTime ? " / " : ""}
                  {guild.raidTime}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="activity-empty">
            <Users size={24} />
            <p>Bring your guild to the community.</p>
            <Link href="/guild-recruitment/new" className="text-link">
              Submit a guild <ArrowUpRight size={16} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
