import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export interface SessionConversion {
  label: string;
  sessions: number;
  clicked: number;
}

export function conversionRate(sessions: number, clicked: number): number {
  return sessions > 0 ? (100 * clicked) / sessions : 0;
}

export async function sessionConversions(since: Date): Promise<{
  sources: SessionConversion[];
  landingPages: SessionConversion[];
}> {
  // One entry and one conversion per observed session, never per page view.
  const sessions = Prisma.sql`
    WITH entry AS (
      SELECT DISTINCT ON ("sessionId") "sessionId", "source", "path"
      FROM "ForeverAnalyticsEvent"
      WHERE "createdAt" >= ${since} AND NOT "bot" AND "event" = 'page_view' AND "sessionId" IS NOT NULL
      ORDER BY "sessionId", "createdAt", "id"
    ), clicked AS (
      SELECT DISTINCT "sessionId" FROM "ForeverAnalyticsEvent"
      WHERE "createdAt" >= ${since} AND NOT "bot" AND "event" = 'discord_click' AND "sessionId" IS NOT NULL
    )`;
  const [sources, landingPages] = await Promise.all([
    db.$queryRaw<SessionConversion[]>(Prisma.sql`${sessions}
      SELECT entry."source" AS label, COUNT(*)::int AS sessions, COUNT(clicked."sessionId")::int AS clicked
      FROM entry LEFT JOIN clicked USING ("sessionId") GROUP BY entry."source" ORDER BY sessions DESC, label`),
    db.$queryRaw<SessionConversion[]>(Prisma.sql`${sessions}
      SELECT entry."path" AS label, COUNT(*)::int AS sessions, COUNT(clicked."sessionId")::int AS clicked
      FROM entry LEFT JOIN clicked USING ("sessionId") GROUP BY entry."path" ORDER BY sessions DESC, label LIMIT 20`),
  ]);
  return { sources, landingPages };
}
