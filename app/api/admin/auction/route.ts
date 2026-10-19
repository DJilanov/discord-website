import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
import {
  readJson,
  requireSameOrigin,
  rateLimit,
  HttpError,
} from "@/lib/security";
import {
  auctionSettingsSchema,
  auctionConfigurationLock,
} from "@/lib/auction/contracts";
import { auctionSnapshot } from "@/lib/auction/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
};
function failure(error: unknown): Response {
  const response = apiError(error);
  for (const [key, value] of Object.entries(headers))
    response.headers.set(key, value);
  return response;
}
export async function GET(): Promise<Response> {
  try {
    await requireStaff(["owner", "admin", "moderator"]);
    return Response.json(await auctionSnapshot(), { headers });
  } catch (error: unknown) {
    return failure(error);
  }
}
export async function POST(request: Request): Promise<Response> {
  try {
    requireSameOrigin(request);
    const staff = await requireStaff(["owner", "admin"]);
    await rateLimit(`auction-admin:${staff.id}`, 20, 60);
    const input = z
      .object({
        version: z.number().int().nonnegative(),
        settings: auctionSettingsSchema,
      })
      .strict()
      .parse(await readJson(request, 16000));
    try {
      await db.$transaction(async (transaction): Promise<void> => {
        await transaction.$queryRaw`SELECT pg_advisory_xact_lock(${auctionConfigurationLock})::text`;
        if (input.version === 0)
          await transaction.foreverAuctionConfig.create({
            data: { id: "auction", settings: input.settings, version: 1 },
          });
        else {
          const result = await transaction.foreverAuctionConfig.updateMany({
            where: { id: "auction", version: input.version },
            data: { settings: input.settings, version: { increment: 1 } },
          });
          if (result.count !== 1)
            throw new HttpError(
              409,
              "Configuration changed. Refresh before saving.",
            );
        }
        await transaction.foreverAuditLog.create({
          data: {
            actorId: staff.id,
            action: "auction.configure",
            entityType: "auction",
            entityId: "auction",
            details: { version: input.version + 1, settings: input.settings },
          },
        });
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new HttpError(
          409,
          "Configuration changed. Refresh before saving.",
        );
      throw error;
    }
    return Response.json(await auctionSnapshot(), { headers });
  } catch (error: unknown) {
    return failure(error);
  }
}
