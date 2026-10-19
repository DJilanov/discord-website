import { randomUUID } from "node:crypto";
import { z } from "zod";
import type {
  ForeverRaidNativeDraft,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { HttpError } from "@/lib/security";
import { checkServerMembership } from "@/lib/member-discord";
import { decryptToken } from "@/lib/discord-bridge/crypto";
import { raidDiscordSettings } from "./discord-settings";
import { reserveQuota } from "./loot-policy";
import { nativeRaidsEnabled } from "./discord-format";
import {
  nativeInputSchema,
  nativeMessageSchema,
  nativeStateSchema,
  nativeTarget,
  type NativeInput,
  type NativeState,
} from "./native-contracts";
import { nativeTokenKey, validateNativeSource } from "./native-interactions";
import {
  nativeError,
  nativeSignupStatus,
  renderNativePanel,
} from "./native-ui";
import type {
  NativeDraftView,
  NativeMessage,
  NativeTarget,
} from "./native-contracts";
import { raidService } from "./service";
import {
  characterSchema,
  rosterStatuses,
  participatingStatuses,
  attendanceChoices,
  type EventView,
  type CharacterView,
  type MemberIdentity,
} from "./contracts";
import { characterCanJoin } from "./policy";
import {
  classes,
  specializationMatchesClass,
  specializationNames,
  suggestedRole,
} from "./specializations";
import { eventTypeDefinitions } from "./event-types";
import { jsonChecksum } from "./json";
import { eventPolicyChecksum } from "./event-policy";
import { raidAccountAllowed } from "./config";
import { raidAudienceIncludes } from "./access";
import { raidDestinationForPost } from "./discord-settings";

type Transaction = Prisma.TransactionClient;
export interface NativeWorkerTransport {
  membership: (
    discordId: string,
  ) => Promise<"member" | "not_member" | "unavailable">;
  respond: (token: string, message: NativeMessage) => Promise<void>;
}
export class NativeResponseError extends Error {
  constructor(
    public readonly status: number,
    public readonly retryAfter: number = 5,
  ) {
    super("Native Discord response unavailable");
  }
}
export function nativeWorkerTransport(): NativeWorkerTransport {
  const settings = raidDiscordSettings();
  if (!settings) throw new Error("Discord event settings are unavailable.");
  return {
    membership: (
      id: string,
    ): Promise<"member" | "not_member" | "unavailable"> =>
      checkServerMembership(id, settings.guildId, settings.token),
    async respond(token: string, message: NativeMessage): Promise<void> {
      if (!/^[A-Za-z0-9_.-]{10,1024}$/.test(token))
        throw new Error("Invalid interaction continuation");
      const response = await fetch(
        `https://discord.com/api/v10/webhooks/${settings.applicationId}/${token}/messages/@original`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message),
          signal: AbortSignal.timeout(10000),
          redirect: "error",
        },
      );
      if (!response.ok) {
        const retryAfter = Math.min(
          120,
          Math.max(1, Number(response.headers.get("retry-after")) || 5),
        );
        await response.body?.cancel();
        throw new NativeResponseError(response.status, retryAfter);
      }
      await response.body?.cancel();
    },
  };
}
function signupChecksum(value: unknown): string {
  return jsonChecksum(value);
}
async function ownSignup(
  client: Transaction,
  eventId: string,
  memberId: string,
): Promise<string> {
  const record = await client.foreverRaidSignup.findUnique({
    where: { eventId_memberId: { eventId, memberId } },
  });
  return signupChecksum(
    record
      ? {
          id: record.id,
          characterId: record.characterId,
          character: record.character,
          role: record.role,
          status: record.status,
          reserves: record.reserves,
          policyChecksum: record.policyChecksum,
          acknowledgedAt: record.acknowledgedAt?.toISOString() ?? null,
        }
      : null,
  );
}
async function policyChecksum(
  client: Transaction,
  eventId: string,
): Promise<string> {
  const event = await client.foreverRaidEvent.findUniqueOrThrow({
    where: { id: eventId },
    include: { catalog: true },
  });
  return eventPolicyChecksum(event);
}
async function initialState(
  client: Transaction,
  event: EventView,
  member: MemberIdentity,
  characters: CharacterView[],
  mode: NativeState["mode"],
): Promise<NativeState> {
  const mine = event.signups.find((signup) => signup.isMine);
  const saved = await client.foreverRaidSignup.findUnique({
    where: { eventId_memberId: { eventId: event.id, memberId: member.id } },
  });
  const selected =
    characters.find((character) => character.id === saved?.characterId) ??
    characters[0];
  return nativeStateSchema.parse({
    mode,
    characterId: selected?.id ?? null,
    className: selected?.className ?? null,
    specialization:
      mine?.character.specialization ?? selected?.specialization ?? null,
    role: eventTypeDefinitions[event.eventType].combatRoles
      ? (mine?.role ?? suggestedRole(selected?.specialization ?? null))
      : "participant",
    attendance:
      mine?.status === "absent" || mine?.status === "tentative"
        ? mine.status
        : "joining",
    itemIds: mine?.reserves ?? [],
    eventVersion: event.version,
    filter:
      event.admission === "open"
        ? "registered"
        : mode === "manage"
          ? "pending"
          : "accepted",
  });
}
function singleValue(input: NativeInput): string {
  if (input.type !== 3 || input.data.values?.length !== 1)
    throw new HttpError(400, "Choose one option.");
  return input.data.values[0];
}
function modalValue(input: NativeInput, name: string): string {
  const components = input.data.components;
  if (
    input.type !== 5 ||
    components?.length !== 1 ||
    components[0].component?.custom_id !== name
  )
    throw new HttpError(400, "Reopen the input from your private event panel.");
  return components[0].component.value.trim();
}
function requireMode(
  state: NativeState,
  ...modes: NativeState["mode"][]
): void {
  if (!modes.includes(state.mode))
    throw new HttpError(
      409,
      "That action is unavailable in this view. Reopen My signup.",
    );
}
async function requireUnchanged(
  client: Transaction,
  draft: ForeverRaidNativeDraft,
  member: MemberIdentity,
  reviewPolicy = true,
): Promise<void> {
  if (
    reviewPolicy &&
    draft.policyChecksum !== (await policyChecksum(client, draft.eventId))
  )
    throw new HttpError(
      409,
      "Event rules changed. Reopen Sign up and review them again.",
    );
  if (
    draft.signupChecksum !== (await ownSignup(client, draft.eventId, member.id))
  )
    throw new HttpError(
      409,
      "Your signup changed elsewhere. Reopen My signup before making another change.",
    );
}
async function makeDraft(
  client: Transaction,
  input: NativeInput,
  event: EventView,
  member: MemberIdentity,
  characters: CharacterView[],
  mode: NativeState["mode"],
  attendance?: NativeState["attendance"],
): Promise<ForeverRaidNativeDraft> {
  const post = await client.foreverRaidDiscordPost.findUniqueOrThrow({
    where: { eventId: event.id },
  });
  return client.foreverRaidNativeDraft.create({
    data: {
      actorId: input.member.user.id,
      eventId: event.id,
      guildId: post.guildId,
      channelId: post.channelId,
      sourceMessageId: post.messageId!,
      state: {
        ...(await initialState(client, event, member, characters, mode)),
        ...(attendance ? { attendance } : {}),
      },
      policyChecksum: await policyChecksum(client, event.id),
      signupChecksum: await ownSignup(client, event.id, member.id),
      expiresAt: new Date(Date.now() + 10 * 60000),
    },
  });
}
function viewDraft(draft: ForeverRaidNativeDraft): NativeDraftView {
  return {
    id: draft.id,
    revision: draft.revision,
    completed: draft.completedAt !== null,
    state: nativeStateSchema.parse(draft.state),
  };
}
async function processInput(
  client: Transaction,
  input: NativeInput,
): Promise<NativeMessage> {
  const target: NativeTarget = nativeTarget(input.data.custom_id);
  const eventId = await validateNativeSource(client, input, target);
  // Lock the canonical event before comparing a draft or changing any participation.
  await client.$queryRaw`SELECT "id" FROM "ForeverRaidEvent" WHERE "id" = ${eventId} FOR UPDATE`;
  const member = await client.foreverMember.upsert({
    where: { discordId: input.member.user.id },
    create: {
      discordId: input.member.user.id,
      displayName: "Community member",
    },
    update: {},
  });
  const service = raidService(undefined, client);
  let event = await service.get(member, eventId);
  let characters = (await service.characters(member)).filter((character) =>
    characterCanJoin(character, event),
  );
  let draft: ForeverRaidNativeDraft;
  let notice = "";
  let terminal = false;
  if (target.kind === "event") {
    const mode =
      target.action === "join"
        ? event.signups.some(
            (signup) =>
              signup.isMine &&
              participatingStatuses.some((status) => status === signup.status),
          )
          ? "mine"
          : "signup"
        : target.action === "tentative" || target.action === "absent"
          ? "signup"
          : target.action === "reserves"
            ? "reserves"
            : target.action === "roster"
              ? "roster"
              : target.action === "manage"
                ? "manage"
                : "mine";
    if (mode === "manage" && !event.isOrganizer)
      throw new HttpError(
        403,
        "Only the event organizer can manage this roster.",
      );
    draft = await makeDraft(
      client,
      input,
      event,
      member,
      characters,
      mode,
      target.action === "join"
        ? "joining"
        : target.action === "tentative" || target.action === "absent"
          ? target.action
          : undefined,
    );
  } else {
    await client.$queryRaw`SELECT "id" FROM "ForeverRaidNativeDraft" WHERE "id" = ${target.id} FOR UPDATE`;
    await validateNativeSource(client, input, target);
    draft = await client.foreverRaidNativeDraft.findUniqueOrThrow({
      where: { id: target.id },
    });
    const state = nativeStateSchema.parse(draft.state);
    const action = target.action;
    const selected = characters.find(
      (character) => character.id === state.characterId,
    );
    if (
      [
        "join",
        "tentative",
        "absent",
        "mine",
        "roster",
        "manage",
        "reserves",
        "leave",
      ].includes(action)
    ) {
      const mode =
        action === "join" || action === "tentative" || action === "absent"
          ? "signup"
          : action === "leave"
            ? "leave"
            : action === "roster"
              ? "roster"
              : action === "manage"
                ? "manage"
                : action === "reserves"
                  ? "reserves"
                  : "mine";
      if (mode === "manage" && !event.isOrganizer)
        throw new HttpError(
          403,
          "Only the event organizer can manage this roster.",
        );
      Object.assign(
        state,
        await initialState(client, event, member, characters, mode),
      );
      if (action === "join") state.attendance = "joining";
      else if (action === "tentative" || action === "absent")
        state.attendance = action;
      draft.policyChecksum = await policyChecksum(client, eventId);
      draft.signupChecksum = await ownSignup(client, eventId, member.id);
    } else if (action === "attendance") {
      requireMode(state, "signup");
      state.attendance = z.enum(attendanceChoices).parse(singleValue(input));
    } else if (action === "character") {
      requireMode(state, "signup");
      const value = singleValue(input);
      const character = characters.find((item) => item.id === value);
      if (value !== "new" && !character)
        throw new HttpError(403, "Choose one of your compatible characters.");
      state.characterId = character?.id ?? null;
      state.className = character?.className ?? null;
      state.specialization = character?.specialization ?? null;
      state.name = "";
      state.role = eventTypeDefinitions[event.eventType].combatRoles
        ? suggestedRole(state.specialization)
        : "participant";
    } else if (action === "class") {
      requireMode(state, "signup");
      if (state.characterId)
        throw new HttpError(
          400,
          "A saved character's class cannot be changed here.",
        );
      state.className = z.enum(classes).parse(singleValue(input));
      state.specialization = null;
    } else if (action === "spec") {
      requireMode(state, "signup");
      const className = selected?.className ?? state.className;
      const spec = z.enum(specializationNames).parse(singleValue(input));
      if (!className || !specializationMatchesClass(className, spec))
        throw new HttpError(400, "Choose a specialization for your class.");
      state.specialization = spec;
      state.role = eventTypeDefinitions[event.eventType].combatRoles
        ? suggestedRole(spec)
        : "participant";
    } else if (action === "role") {
      requireMode(state, "signup");
      if (!eventTypeDefinitions[event.eventType].combatRoles)
        throw new HttpError(
          400,
          "This event uses participants, not combat roles.",
        );
      state.role = z
        .enum(["tank", "healer", "damage"])
        .parse(singleValue(input));
    } else if (action === "name") {
      requireMode(state, "signup");
      if (state.characterId)
        throw new HttpError(400, "Choose Add a character first.");
      state.name = modalValue(input, "name");
    } else if (action === "register") {
      requireMode(state, "signup");
      if (state.characterId)
        throw new HttpError(400, "This character is already saved.");
      const details = characterSchema.parse({
        game: event.game,
        realm: event.realm,
        region: event.region,
        faction: event.faction,
        ruleset: event.ruleset,
        name: state.name,
        className: state.className,
        specialization: state.specialization,
      });
      const old = characters.find(
        (character) => character.name === details.name,
      );
      if (old && old.className !== details.className)
        throw new HttpError(
          409,
          "A saved character with this name has a different class.",
        );
      const character = old ?? (await service.addCharacter(member, details));
      state.characterId = character.id;
      state.className = character.className;
      state.role = eventTypeDefinitions[event.eventType].combatRoles
        ? suggestedRole(state.specialization)
        : "participant";
      notice =
        "Character saved. Review the event rules and confirm separately to sign up.";
    } else if (action === "confirm") {
      requireMode(state, "signup");
      await requireUnchanged(client, draft, member);
      if (!selected)
        throw new HttpError(
          400,
          "Save or choose a compatible character first.",
        );
      await service.signup(member, eventId, {
        acknowledge: true,
        policyChecksum: draft.policyChecksum,
        characterId: selected.id,
        specialization: state.specialization,
        role: state.role,
        attendance: state.attendance,
      });
      terminal = true;
      notice =
        state.attendance === "joining"
          ? "Signup saved."
          : "Availability saved. No confirmed seat or soft reserves are held.";
    } else if (action === "acknowledge") {
      requireMode(state, "mine");
      await requireUnchanged(client, draft, member);
      await service.acknowledge(member, eventId, {
        acknowledge: true,
        policyChecksum: draft.policyChecksum,
      });
      terminal = true;
      notice =
        "Updated event rules acknowledged. Your signup and reserves are unchanged.";
    } else if (action === "withdraw") {
      requireMode(state, "leave");
      await requireUnchanged(client, draft, member, false);
      await service.withdraw(member, eventId);
      terminal = true;
      notice = "Signup withdrawn. Your saved character remains available.";
    } else if (action === "search") {
      requireMode(state, "reserves");
      state.query = modalValue(input, "search");
      state.page = 0;
    } else if (action === "add" || action === "remove") {
      requireMode(state, "reserves");
      const itemId = z.coerce
        .number()
        .int()
        .positive()
        .parse(singleValue(input));
      const mine = event.signups.find((signup) => signup.isMine);
      if (
        !event.catalog ||
        !reserveQuota(event, mine?.role ?? "participant") ||
        !mine ||
        !participatingStatuses.some((status) => status === mine.status)
      )
        throw new HttpError(
          400,
          "Join an eligible roster before selecting reserves.",
        );
      if (action === "remove") {
        const index = state.itemIds.indexOf(itemId);
        if (index >= 0) state.itemIds.splice(index, 1);
      } else {
        const item = event.catalog.items.find(
          (entry) => entry.itemId === itemId,
        );
        if (
          !item ||
          !item.classes.includes(mine.character.className) ||
          event.hardReserves.includes(itemId)
        )
          throw new HttpError(
            400,
            "This item is unavailable, hard-reserved or ineligible for your class.",
          );
        if (
          state.itemIds.length >= reserveQuota(event, mine.role) ||
          (!event.allowDuplicates && state.itemIds.includes(itemId))
        )
          throw new HttpError(
            400,
            "Reserve allowance or duplicate rule exceeded.",
          );
        state.itemIds.push(itemId);
      }
    } else if (action === "save") {
      requireMode(state, "reserves");
      await requireUnchanged(client, draft, member);
      await service.reserves(member, eventId, { itemIds: state.itemIds });
      terminal = true;
      notice = "Soft reserves saved.";
    } else if (action === "view") {
      requireMode(state, "roster", "manage");
      const [grouping, filter] = singleValue(input).split(":");
      state.grouping = z.enum(["class", "role"]).parse(grouping);
      state.filter = z.enum(rosterStatuses).parse(filter);
      state.page = 0;
      state.signupId = null;
      state.eventVersion = event.version;
    } else if (action === "previous" || action === "next") {
      requireMode(state, "roster", "manage", "reserves");
      const mine = event.signups.find((signup) => signup.isMine);
      const total =
        state.mode === "reserves"
          ? (event.catalog?.items.filter(
              (item) =>
                item.name.toLowerCase().includes(state.query.toLowerCase()) &&
                mine &&
                item.classes.includes(mine.character.className) &&
                !event.hardReserves.includes(item.itemId),
            ).length ?? 0)
          : event.signups.filter((signup) => signup.status === state.filter)
              .length;
      state.page = Math.max(
        0,
        Math.min(
          Math.max(0, Math.ceil(total / 10) - 1),
          state.page + (action === "next" ? 1 : -1),
        ),
      );
      state.signupId = null;
      state.eventVersion = event.version;
    } else if (action === "candidate") {
      requireMode(state, "manage");
      if (!event.isOrganizer)
        throw new HttpError(403, "Only the organizer can manage signups.");
      const value = singleValue(input);
      if (!event.signups.some((signup) => signup.id === value))
        throw new HttpError(404, "Signup not found.");
      state.signupId = value;
      state.eventVersion = event.version;
    } else if (
      action === "accept" ||
      action === "bench" ||
      action === "lock_confirm"
    ) {
      requireMode(state, "manage");
      if (!event.isOrganizer)
        throw new HttpError(403, "Only the organizer can manage signups.");
      if (action === "lock_confirm" && !state.lockConfirm)
        throw new HttpError(400, "Review the lock confirmation first.");
      await service.manage(
        member,
        eventId,
        action === "lock_confirm"
          ? { action: "lock", version: state.eventVersion }
          : {
              action: "admit",
              version: state.eventVersion,
              signupId: state.signupId,
              status: action === "accept" ? "accepted" : "bench",
            },
      );
      state.signupId = null;
      state.lockConfirm = false;
      notice = action === "lock_confirm" ? "Roster locked." : "Roster updated.";
    } else if (action === "lock") {
      requireMode(state, "manage");
      if (!event.isOrganizer)
        throw new HttpError(403, "Only the organizer can lock the roster.");
      state.lockConfirm = true;
      state.eventVersion = event.version;
    } else if (action === "close") {
      state.mode = "closed";
    } else throw new HttpError(400, "Unsupported event action.");
    draft = await client.foreverRaidNativeDraft.update({
      where: { id: draft.id },
      data: {
        state,
        revision: { increment: 1 },
        policyChecksum: draft.policyChecksum,
        signupChecksum: draft.signupChecksum,
        ...(terminal || state.mode === "closed"
          ? { completedAt: new Date() }
          : {}),
      },
    });
    event = await service.get(member, eventId);
    characters = (await service.characters(member)).filter((character) =>
      characterCanJoin(character, event),
    );
    if (terminal) {
      const mine = event.signups.find((signup) => signup.isMine);
      const chooseReserves =
        target.action === "confirm" &&
        mine &&
        participatingStatuses.some((status) => status === mine.status) &&
        event.catalog &&
        reserveQuota(event, mine?.role ?? "participant") > 0 &&
        Date.parse(event.reservesCloseAt) > Date.now();
      draft = await makeDraft(
        client,
        input,
        event,
        member,
        characters,
        chooseReserves ? "reserves" : "mine",
      );
      if (chooseReserves)
        notice += " Choose your items below and save your soft reserves.";
    }
    if (target.action === "confirm")
      notice += ` ${nativeSignupStatus(event.signups.find((signup) => signup.isMine))}.`;
    if (state.mode === "manage")
      draft = await client.foreverRaidNativeDraft.update({
        where: { id: draft.id },
        data: {
          state: {
            ...nativeStateSchema.parse(draft.state),
            eventVersion: event.version,
          },
        },
      });
  }
  const settings = raidDiscordSettings()!;
  const post = await client.foreverRaidDiscordPost.findUniqueOrThrow({
    where: { eventId },
  });
  return renderNativePanel(
    event,
    characters,
    viewDraft(draft),
    post.origin || settings.origin,
    notice,
  );
}
export async function runNativeRaidWork(
  database: PrismaClient,
  providedTransport?: NativeWorkerTransport,
): Promise<number> {
  if (!nativeRaidsEnabled()) return 0;
  const transport = providedTransport ?? nativeWorkerTransport();
  const now = new Date();
  await database.foreverRaidNativeWork.updateMany({
    where: { expiresAt: { lte: now }, status: { notIn: ["done", "failed"] } },
    data: {
      status: "failed",
      tokenCipher: null,
      lastError: "interaction_expired",
    },
  });
  const leaseId = randomUUID();
  const work = await database.$transaction(async (client) => {
    const [candidate] = await client.$queryRaw<
      Array<{ id: string }>
    >`SELECT "id" FROM "ForeverRaidNativeWork" WHERE "status" IN ('pending','processing','responding') AND "nextAttemptAt" <= NOW() AND "expiresAt" > NOW() AND ("leaseUntil" IS NULL OR "leaseUntil" < NOW()) ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1`;
    return candidate
      ? client.foreverRaidNativeWork.update({
          where: { id: candidate.id },
          data: {
            status: "processing",
            leaseId,
            leaseUntil: new Date(Date.now() + 45000),
            attempts: { increment: 1 },
          },
        })
      : null;
  });
  if (!work) return 0;
  try {
    let response: NativeMessage;
    const input = nativeInputSchema.parse(work.input);
    if (input.id !== work.id || input.member.user.id !== work.actorId)
      throw new Error("Native work identity mismatch");
    const membership = await transport.membership(work.actorId);
    if (work.response) {
      const target = nativeTarget(input.data.custom_id);
      const draft =
        target.kind === "draft"
          ? await database.foreverRaidNativeDraft.findUnique({
              where: { id: target.id },
            })
          : null;
      const event = await database.foreverRaidEvent.findUnique({
        where: {
          id: target.kind === "event" ? target.id : (draft?.eventId ?? ""),
        },
        include: { discordPost: true },
      });
      const member = await database.foreverMember.findUnique({
        where: { discordId: work.actorId },
      });
      const permitted =
        membership === "member" &&
        raidAccountAllowed(work.actorId) &&
        member?.active &&
        event &&
        raidAudienceIncludes(event, work.actorId) &&
        event.discordPost &&
        event.discordPost.lastError !== "discord_post_removed" &&
        raidDestinationForPost(event.discordPost) &&
        event.discordPost.guildId === input.guild_id &&
        event.discordPost.channelId === input.channel_id &&
        (target.kind === "event"
          ? event.discordPost.messageId === input.message?.id
          : draft?.actorId === work.actorId &&
            draft.sourceMessageId === event.discordPost.messageId &&
            draft.expiresAt > new Date());
      response = permitted
        ? nativeMessageSchema.parse(work.response)
        : nativeError(
            "Event access could not be verified. Join the server and reopen the original event to continue.",
          );
    } else {
      response =
        membership !== "member"
          ? nativeError(
              membership === "not_member"
                ? "This service is for WoW Forever Discord members. Join the server before using it."
                : "Server membership could not be verified. Reopen the event and try again shortly.",
            )
          : await database.$transaction(
              async (client): Promise<NativeMessage> => {
                await client.$queryRaw`SELECT "id" FROM "ForeverRaidNativeWork" WHERE "id" = ${work.id} FOR UPDATE`;
                const current =
                  await client.foreverRaidNativeWork.findUniqueOrThrow({
                    where: { id: work.id },
                  });
                if (
                  current.leaseId !== leaseId ||
                  current.expiresAt <= new Date()
                )
                  throw new Error("Native interaction lease expired");
                if (current.response)
                  return nativeMessageSchema.parse(current.response);
                let message: NativeMessage;
                // A savepoint keeps a handled validation failure from retaining partial character/roster writes.
                await client.$executeRawUnsafe("SAVEPOINT native_action");
                try {
                  message = await processInput(client, input);
                } catch (error) {
                  await client.$executeRawUnsafe(
                    "ROLLBACK TO SAVEPOINT native_action",
                  );
                  if (error instanceof HttpError)
                    message = nativeError(error.message);
                  else if (error instanceof z.ZodError)
                    message = nativeError(
                      error.issues.map((issue) => issue.message).join(" "),
                    );
                  else throw error;
                }
                message = nativeMessageSchema.parse(message);
                await client.foreverRaidNativeWork.update({
                  where: { id: work.id },
                  data: {
                    response: message as unknown as Prisma.InputJsonValue,
                    status: "responding",
                  },
                });
                return message;
              },
              { timeout: 15000, maxWait: 2000 },
            );
      if (membership !== "member")
        await database.foreverRaidNativeWork.updateMany({
          where: { id: work.id, leaseId },
          data: {
            response: response as unknown as Prisma.InputJsonValue,
            status: "responding",
          },
        });
    }
    if (!work.tokenCipher) throw new Error("Native continuation unavailable");
    await transport.respond(
      decryptToken(work.tokenCipher, nativeTokenKey(), work.id),
      response,
    );
    await database.foreverRaidNativeWork.updateMany({
      where: { id: work.id, leaseId },
      data: {
        status: "done",
        tokenCipher: null,
        leaseId: null,
        leaseUntil: null,
        lastError: null,
      },
    });
  } catch (error) {
    const failureCode =
      error instanceof z.ZodError
        ? "native_input_invalid"
        : error instanceof NativeResponseError
          ? "native_discord_response_retry"
          : error instanceof TypeError
            ? "native_type_error"
            : error instanceof ReferenceError
              ? "native_reference_error"
              : "native_response_retry";
    const permanent =
      error instanceof NativeResponseError &&
      [400, 401, 403, 404].includes(error.status);
    const failed = permanent || work.attempts >= 5;
    if (failed && !permanent && work.tokenCipher) {
      try {
        await transport.respond(
          decryptToken(work.tokenCipher, nativeTokenKey(), work.id),
          nativeError(
            "The private panel could not be refreshed. Open Event details or My signup to check your current status.",
          ),
        );
      } catch {
        // A failed/expired Discord continuation cannot be repaired; the website stays canonical.
      }
    }
    await database.foreverRaidNativeWork.updateMany({
      where: { id: work.id, leaseId },
      data: {
        status: failed ? "failed" : "pending",
        ...(failed ? { tokenCipher: null } : {}),
        leaseId: null,
        leaseUntil: null,
        nextAttemptAt: new Date(
          Date.now() +
            (error instanceof NativeResponseError ? error.retryAfter : 5) *
              1000,
        ),
        lastError: permanent ? "discord_response_unavailable" : failureCode,
      },
    });
  }
  return 1;
}
