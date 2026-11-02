import { createHash } from "node:crypto";
import { kfcGuildId, kfcManagementRoleId } from "../content/kfc-community";
import {
  kfcAccessIds,
  kfcApplicationChannelIds,
  kfcAccessStaffRoleIds,
  kfcPrivateGuildIds,
  kfcPrivateStaffIds,
  kfcPublicChatIds,
  kfcPublicInstructionIds,
} from "../content/kfc-access";
import {
  channelPermissions,
  guildPermissions,
  hasDiscordPermission,
  type DiscordAuditSnapshot,
} from "./discord-audit";

type Channel = DiscordAuditSnapshot["channels"][number];
type Overwrite = Channel["permission_overwrites"][number];
export type KfcAccessScope =
  | "guild"
  | "staff"
  | "instructions"
  | "community"
  | "applications"
  | "legacy-menu";
export interface KfcAccessBindings {
  raidLobbyId?: string;
  trustedMemberIds?: readonly string[];
  publishingMemberIds?: readonly string[];
  roleBoundMemberIds?: readonly string[];
}
export interface KfcAccessPatch {
  channelId: string;
  channelName: string;
  channelType: number;
  parentId: string | null;
  scope: KfcAccessScope;
  before: Overwrite[];
  after: Overwrite[];
}
export interface KfcAccessIssue {
  channelId: string;
  code: string;
}
export interface KfcAccessReport {
  passed: boolean;
  protectedChannels: number;
  profilesChecked: number;
  issues: KfcAccessIssue[];
}

const view = 1n << 10n;
const history = 1n << 16n;
const send = 1n << 11n;
const writes = send | (1n << 35n) | (1n << 36n) | (1n << 38n);
const privileged =
  (1n << 3n) | (1n << 4n) | (1n << 5n) | (1n << 28n) | (1n << 40n);

function staffRoles(snapshot: DiscordAuditSnapshot): Set<string> {
  return new Set(
    snapshot.roles
      .filter(
        (role) =>
          kfcAccessStaffRoleIds.includes(role.id) ||
          (role.managed && (BigInt(role.permissions) & privileged) !== 0n),
      )
      .map((role) => role.id),
  );
}

function scopeFor(
  channel: Channel,
  bindings: KfcAccessBindings,
): KfcAccessScope | undefined {
  if (
    channel.id === kfcAccessIds.staffCategory ||
    channel.parent_id === kfcAccessIds.staffCategory ||
    kfcPrivateStaffIds.includes(channel.id)
  )
    return "staff";
  if (
    channel.id === kfcAccessIds.guildCategory ||
    channel.parent_id === kfcAccessIds.guildCategory ||
    kfcPrivateGuildIds.includes(channel.id)
  )
    return "guild";
  if (kfcPublicInstructionIds.includes(channel.id)) return "instructions";
  if (kfcApplicationChannelIds.includes(channel.id)) return "applications";
  if (
    kfcPublicChatIds.includes(channel.id) ||
    channel.id === bindings.raidLobbyId
  )
    return "community";
  if (channel.id === kfcAccessIds.roleMenu) return "legacy-menu";
  return undefined;
}

export function kfcOverwriteFingerprint(
  overwrites: readonly Overwrite[],
): string {
  const normalized = overwrites
    .map((entry) => ({
      id: entry.id,
      type: entry.type,
      allow: BigInt(entry.allow).toString(),
      deny: BigInt(entry.deny).toString(),
    }))
    .sort((a, b) => a.type - b.type || a.id.localeCompare(b.id));
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

function patchChannel(
  snapshot: DiscordAuditSnapshot,
  channel: Channel,
  scope: KfcAccessScope,
  bindings: KfcAccessBindings,
): Overwrite[] {
  const staff = staffRoles(snapshot);
  const trustedMembers = new Set([
    snapshot.bot.id,
    ...(bindings.trustedMemberIds ?? []),
  ]);
  const entries = channel.permission_overwrites.map((entry) => ({ ...entry }));
  const publishers = new Set([
    snapshot.bot.id,
    ...(bindings.publishingMemberIds ?? []),
  ]);
  function roleOverwrite(id: string, type: 0 | 1 = 0): Overwrite {
    let entry = entries.find((item) => item.type === type && item.id === id);
    if (!entry) {
      entry = { id, type, allow: "0", deny: "0" };
      entries.push(entry);
    }
    return entry;
  }
  function set(entry: Overwrite, allow: bigint, deny: bigint): void {
    entry.allow = ((BigInt(entry.allow) & ~deny) | allow).toString();
    entry.deny = ((BigInt(entry.deny) & ~allow) | deny).toString();
  }
  if (scope === "guild" || scope === "staff") {
    set(roleOverwrite(kfcGuildId), 0n, view);
    for (const entry of entries) {
      if (entry.type === 1) {
        if (bindings.roleBoundMemberIds?.includes(entry.id))
          entry.allow = (BigInt(entry.allow) & ~view).toString();
        if (BigInt(entry.allow) & view && !trustedMembers.has(entry.id))
          throw new Error(
            `Review private member exception on ${channel.id} before applying.`,
          );
        continue;
      }
      if (
        !staff.has(entry.id) &&
        !(scope === "guild" && entry.id === kfcAccessIds.certified)
      )
        entry.allow = (BigInt(entry.allow) & ~view).toString();
    }
  } else if (scope === "applications") {
    set(roleOverwrite(kfcGuildId), 0n, view | writes);
    for (const id of [
      kfcAccessIds.verified,
      kfcAccessIds.certified,
      kfcManagementRoleId,
    ])
      set(roleOverwrite(id), view | history | send, 0n);
    set(roleOverwrite(snapshot.bot.id, 1), view | history | send, 0n);
  } else if (scope === "legacy-menu") {
    set(roleOverwrite(kfcAccessIds.verified), view | history, 0n);
    set(roleOverwrite(kfcGuildId), 0n, writes);
    set(roleOverwrite(kfcManagementRoleId), view | history | send, 0n);
    set(roleOverwrite(snapshot.bot.id, 1), view | history | send, 0n);
  } else {
    set(
      roleOverwrite(kfcGuildId),
      view | history | (scope === "community" ? send : 0n),
      scope === "instructions" ? writes : 0n,
    );
    if (scope === "instructions")
      for (const entry of entries) {
        const trusted =
          entry.type === 0 ? staff.has(entry.id) : publishers.has(entry.id);
        if (!trusted) entry.allow = (BigInt(entry.allow) & ~writes).toString();
      }
    if (scope === "instructions") {
      set(roleOverwrite(kfcManagementRoleId), view | history | send, 0n);
      set(roleOverwrite(snapshot.bot.id, 1), view | history | send, 0n);
    }
  }
  return entries;
}

export function kfcAccessPatches(
  snapshot: DiscordAuditSnapshot,
  bindings: KfcAccessBindings = {},
): KfcAccessPatch[] {
  if (snapshot.guild.id !== kfcGuildId)
    throw new Error("Unexpected KFC access scope.");
  for (const id of [
    kfcAccessIds.verified,
    kfcAccessIds.certified,
    kfcManagementRoleId,
  ])
    if (!snapshot.roles.some((role) => role.id === id && !role.managed))
      throw new Error("A required access role is missing.");
  for (const id of [
    ...kfcPublicInstructionIds,
    ...kfcPublicChatIds,
    ...kfcPrivateGuildIds,
    ...kfcPrivateStaffIds,
    ...kfcApplicationChannelIds,
    kfcAccessIds.guildCategory,
    kfcAccessIds.staffCategory,
    kfcAccessIds.roleMenu,
    ...(bindings.raidLobbyId ? [bindings.raidLobbyId] : []),
  ])
    if (!snapshot.channels.some((channel) => channel.id === id))
      throw new Error(`Required access destination missing: ${id}`);
  return snapshot.channels.flatMap((channel): KfcAccessPatch[] => {
    const scope = scopeFor(channel, bindings);
    if (!scope) return [];
    const after = patchChannel(snapshot, channel, scope, bindings);
    return kfcOverwriteFingerprint(after) ===
      kfcOverwriteFingerprint(channel.permission_overwrites)
      ? []
      : [
          {
            channelId: channel.id,
            channelName: channel.name,
            channelType: channel.type,
            parentId: channel.parent_id,
            scope,
            before: channel.permission_overwrites,
            after,
          },
        ];
  });
}

export function trustedKfcAccessMember(
  snapshot: DiscordAuditSnapshot,
  member: { bot: boolean; roles: string[] },
): boolean {
  const staff = staffRoles(snapshot);
  return (
    member.bot ||
    member.roles.includes(kfcAccessIds.certified) ||
    member.roles.some((id) => staff.has(id))
  );
}

export function publishingKfcAccessMember(
  snapshot: DiscordAuditSnapshot,
  member: { bot: boolean; roles: string[] },
): boolean {
  const staff = staffRoles(snapshot);
  return member.bot || member.roles.some((id) => staff.has(id));
}

export function snapshotWithKfcAccessPatches(
  snapshot: DiscordAuditSnapshot,
  patches: readonly KfcAccessPatch[],
): DiscordAuditSnapshot {
  return {
    ...snapshot,
    channels: snapshot.channels.map((channel) => ({
      ...channel,
      permission_overwrites:
        patches.find((patch) => patch.channelId === channel.id)?.after ??
        channel.permission_overwrites,
    })),
  };
}

export function analyzeKfcAccess(
  snapshot: DiscordAuditSnapshot,
  bindings: KfcAccessBindings = {},
): KfcAccessReport {
  if (snapshot.guild.id !== kfcGuildId)
    throw new Error("Unexpected KFC access scope.");
  const staff = staffRoles(snapshot);
  const ordinary = snapshot.roles
    .filter(
      (role) =>
        role.id !== kfcGuildId &&
        role.id !== kfcAccessIds.certified &&
        !staff.has(role.id),
    )
    .map((role) => role.id);
  const publicProfiles = [[], ...ordinary.map((id) => [id]), ordinary];
  const resourceProfiles = [
    ...publicProfiles,
    [kfcAccessIds.certified],
    [kfcAccessIds.certified, ...ordinary],
  ];
  const issues: KfcAccessIssue[] = [];
  for (const id of [
    ...kfcPublicInstructionIds,
    ...kfcPublicChatIds,
    ...kfcPrivateGuildIds,
    ...kfcPrivateStaffIds,
    ...kfcApplicationChannelIds,
    kfcAccessIds.guildCategory,
    kfcAccessIds.staffCategory,
    kfcAccessIds.roleMenu,
    ...(bindings.raidLobbyId ? [bindings.raidLobbyId] : []),
  ]) {
    if (!snapshot.channels.some((channel) => channel.id === id))
      issues.push({ channelId: id, code: "missing-access-destination" });
  }
  for (const id of [
    kfcAccessIds.verified,
    kfcAccessIds.certified,
    kfcManagementRoleId,
  ]) {
    if (!snapshot.roles.some((role) => role.id === id))
      issues.push({ channelId: id, code: "missing-access-role" });
  }
  let protectedChannels = 0;
  const trustedMembers = new Set([
    snapshot.bot.id,
    ...(bindings.trustedMemberIds ?? []),
  ]);
  const access = (channel: Channel, roleIds: string[]): bigint =>
    channelPermissions(
      guildPermissions(snapshot.roles, kfcGuildId, roleIds),
      channel,
      kfcGuildId,
      roleIds,
    );
  for (const channel of snapshot.channels) {
    const scope = scopeFor(channel, bindings);
    if (!scope) continue;
    if (scope === "guild" || scope === "staff") {
      protectedChannels++;
      if (
        (scope === "guild" ? publicProfiles : resourceProfiles).some(
          (profile) => hasDiscordPermission(access(channel, profile), view),
        )
      )
        issues.push({
          channelId: channel.id,
          code: "untrusted-private-access",
        });
      if (
        channel.permission_overwrites.some(
          (entry) =>
            entry.type === 1 &&
            (BigInt(entry.allow) & view) !== 0n &&
            !trustedMembers.has(entry.id),
        )
      )
        issues.push({
          channelId: channel.id,
          code: "unreviewed-member-exception",
        });
      if (
        scope === "guild" &&
        !hasDiscordPermission(
          access(channel, [kfcAccessIds.certified]),
          view | history,
        )
      )
        issues.push({ channelId: channel.id, code: "certified-access-lost" });
    } else if (scope === "applications") {
      if (
        [
          kfcAccessIds.verified,
          kfcAccessIds.certified,
          kfcManagementRoleId,
        ].some(
          (id) =>
            !hasDiscordPermission(access(channel, [id]), view | history | send),
        )
      )
        issues.push({ channelId: channel.id, code: "applicants-cannot-apply" });
      if (
        publicProfiles
          .filter((profile) => !profile.includes(kfcAccessIds.verified))
          .some((profile) => hasDiscordPermission(access(channel, profile), view))
      )
        issues.push({
          channelId: channel.id,
          code: "unverified-application-access",
        });
    } else if (scope === "instructions" || scope === "community") {
      if (
        !hasDiscordPermission(
          access(channel, []),
          view | history | (scope === "community" ? send : 0n),
        )
      )
        issues.push({
          channelId: channel.id,
          code: "newcomer-destination-inaccessible",
        });
      if (
        scope === "instructions" &&
        resourceProfiles.some(
          (profile) => (access(channel, profile) & writes) !== 0n,
        )
      )
        issues.push({ channelId: channel.id, code: "instructions-writable" });
      if (
        scope === "instructions" &&
        channel.permission_overwrites.some(
          (entry) =>
            entry.type === 1 &&
            (BigInt(entry.allow) & writes) !== 0n &&
            entry.id !== snapshot.bot.id &&
            !bindings.publishingMemberIds?.includes(entry.id),
        )
      )
        issues.push({
          channelId: channel.id,
          code: "instructions-member-write-exception",
        });
    } else if (
      !hasDiscordPermission(
        access(channel, [kfcAccessIds.verified]),
        view | history,
      )
    )
      issues.push({
        channelId: channel.id,
        code: "legacy-menu-history-missing",
      });
  }
  return {
    passed: issues.length === 0,
    protectedChannels,
    profilesChecked: resourceProfiles.length,
    issues,
  };
}
