import { z } from "zod";
import { db } from "@/lib/db";
import type { Staff } from "@/lib/auth";
import { guideSchema, guildSchema, settingsSchema } from "@/lib/validation";
import { HttpError } from "@/lib/security";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getDiscordPreview } from "@/lib/discord";

export async function saveSettings(raw: unknown, staff: Staff): Promise<void> {
  const data = settingsSchema.parse(raw);
  if (data.discordInvite && data.backupInvite) {
    const primary = await getDiscordPreview(data.discordInvite);
    const backup = await getDiscordPreview(data.backupInvite);
    if (
      primary?.serverId &&
      backup?.serverId &&
      primary.serverId !== backup.serverId
    )
      throw new HttpError(
        400,
        "The primary and backup invitations belong to different Discord servers.",
      );
  }
  await db.$transaction(async (tx) => {
    await tx.foreverSiteSetting.upsert({
      where: { key: "site" },
      create: { key: "site", value: data },
      update: { value: data },
    });
    await tx.foreverAuditLog.create({
      data: {
        actorId: staff.id,
        action: "updated",
        entityType: "settings",
        entityId: "site",
        details: { fields: Object.keys(data) },
      },
    });
  });
  revalidatePath("/", "layout");
}

export async function saveGuide(
  id: string | undefined,
  raw: unknown,
  staff: Staff,
): Promise<string> {
  const data = guideSchema.parse(raw);
  const savedId = await db.$transaction(async (tx) => {
    const existing = id
      ? await tx.foreverGuide.findUnique({ where: { id } })
      : null;
    if (id && !existing) throw new HttpError(404, "Guide not found.");
    const values = {
      ...data,
      metaTitle: data.metaTitle || null,
      metaDescription: data.metaDescription || null,
      publishedAt: data.published
        ? existing?.publishedAt || new Date()
        : existing?.publishedAt || null,
    };
    const guide = id
      ? await tx.foreverGuide.update({ where: { id }, data: values })
      : await tx.foreverGuide.create({ data: values });
    await tx.foreverAuditLog.create({
      data: {
        actorId: staff.id,
        action: existing ? "updated" : "created",
        entityType: "guide",
        entityId: guide.id,
        details: {
          title: guide.title,
          published: guide.published,
          slug: guide.slug,
        },
      },
    });
    return guide.id;
  });
  revalidatePath("/", "layout");
  return savedId;
}

export async function saveGuild(
  id: string,
  raw: unknown,
  staff: Staff,
): Promise<void> {
  const data = guildSchema
    .extend({
      status: z.enum(["pending", "approved", "hidden", "rejected"]),
      featured: z.boolean(),
    })
    .parse(raw);
  await db.$transaction(async (tx) => {
    const existing = await tx.foreverGuild.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Guild not found.");
    await tx.foreverGuild.update({
      where: { id },
      data: {
        ...data,
        lastVerifiedAt:
          data.status === "approved" ? new Date() : existing.lastVerifiedAt,
        inviteUrl: data.inviteUrl || null,
        websiteUrl: data.websiteUrl || null,
      },
    });
    await tx.foreverAuditLog.create({
      data: {
        actorId: staff.id,
        action: "updated",
        entityType: "guild",
        entityId: id,
        details: {
          previousStatus: existing.status,
          status: data.status,
          featured: data.featured,
        },
      },
    });
  });
}

export async function reviewGroup(
  id: string,
  raw: unknown,
  staff: Staff,
): Promise<void> {
  const data = z
    .object({
      status: z.enum(["approved", "hidden", "rejected"]),
      reason: z.string().trim().min(5).max(500),
    })
    .parse(raw);
  await db.$transaction(async (tx) => {
    const group = await tx.foreverGroup.findUnique({ where: { id } });
    if (!group) throw new HttpError(404, "Group not found.");
    if (data.status === "approved" && group.expiresAt <= new Date())
      throw new HttpError(409, "This event has expired.");
    await tx.foreverGroup.update({
      where: { id },
      data: { status: data.status },
    });
    await tx.foreverAuditLog.create({
      data: {
        actorId: staff.id,
        action: data.status,
        entityType: "group",
        entityId: id,
        details: { reason: data.reason },
      },
    });
  });
}

export async function saveStaff(
  id: string | undefined,
  raw: unknown,
  staff: Staff,
): Promise<void> {
  const input = z
    .object({
      email: z.email(),
      name: z.string().trim().min(2).max(100),
      role: z.enum(["owner", "admin", "moderator", "editor"]),
      password: z.string().max(200).default(""),
      active: z.boolean(),
    })
    .parse(raw);
  if (!id && input.password.length < 16)
    throw new HttpError(
      400,
      "New staff passwords must have at least 16 characters.",
    );
  if (input.password && input.password.length < 16)
    throw new HttpError(400, "Passwords must have at least 16 characters.");
  const passwordHash = input.password
    ? await hash(input.password, 12)
    : undefined;
  await db.$transaction(async (tx) => {
    if (id === staff.id && (!input.active || input.role !== "owner"))
      throw new HttpError(
        400,
        "You cannot deactivate or demote your own owner account.",
      );
    const data = {
      email: input.email.toLowerCase(),
      name: input.name,
      role: input.role,
      active: input.active,
      ...(passwordHash ? { passwordHash } : {}),
    };
    const user = id
      ? await tx.foreverUser.update({ where: { id }, data })
      : await tx.foreverUser.create({
          data: { ...data, passwordHash: passwordHash! },
        });
    await tx.foreverAuditLog.create({
      data: {
        actorId: staff.id,
        entityType: "staff",
        entityId: user.id,
        action: id ? "updated" : "created",
        details: {
          role: input.role,
          active: input.active,
          passwordChanged: Boolean(passwordHash),
        },
      },
    });
  });
}
