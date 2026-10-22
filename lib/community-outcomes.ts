import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { participatingStatuses } from "@/lib/raids/contracts";
import { publicEventWhere } from "@/lib/raids/publication";

export interface CommunityOutcomes {
  approvedEventsCreated: number;
  nativeSignups: number;
  signupMembers: number;
  repeatSignupMembers: number;
  toolOpens: number;
  eventStarts: number;
  guildContacts: number;
  calendarDownloads: number;
}

export async function communityOutcomes(
  since: Date,
  database: PrismaClient = db,
): Promise<CommunityOutcomes> {
  const publication = publicEventWhere();
  const [events, members, actions] = await Promise.all([
    publication
      ? database.foreverRaidEvent.count({
          where: { ...publication, createdAt: { gte: since } },
        })
      : 0,
    publication
      ? database.foreverRaidSignup.groupBy({
          by: ["memberId"],
          where: {
            createdAt: { gte: since },
            event: publication,
            member: { active: true },
            status: { in: [...participatingStatuses] },
            importSource: { equals: Prisma.DbNull },
          },
          _count: { _all: true },
        })
      : [],
    database.foreverAnalyticsEvent.groupBy({
      by: ["event"],
      where: {
        createdAt: { gte: since },
        bot: false,
        event: {
          in: [
            "tool_open",
            "event_start",
            "guild_contact",
            "calendar_download",
          ],
        },
      },
      _count: { _all: true },
    }),
  ]);
  const count = (event: string): number =>
    actions.find((row) => row.event === event)?._count._all ?? 0;
  return {
    approvedEventsCreated: events,
    nativeSignups: members.reduce(
      (total, member) => total + member._count._all,
      0,
    ),
    signupMembers: members.length,
    repeatSignupMembers: members.filter((member) => member._count._all > 1)
      .length,
    toolOpens: count("tool_open"),
    eventStarts: count("event_start"),
    guildContacts: count("guild_contact"),
    calendarDownloads: count("calendar_download"),
  };
}
