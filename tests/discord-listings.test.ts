import test from "node:test";
import assert from "node:assert/strict";
import {
  guildListingDraft,
  groupListingDraft,
  listingBotId,
  listingForums,
  listingGuildId,
  type ListingJob,
} from "../lib/discord-listings/contracts";
import {
  deliverListing,
  notifyListingReviewer,
  syncListing,
} from "../lib/discord-listings/engine";
import {
  listingRequest,
  ListingDiscordError,
  type ListingRequest,
  type ListingReviewNotifier,
} from "../lib/discord-listings/transport";
import type { ListingState, ListingStore } from "../lib/discord-listings/store";
import { groupTags } from "../content/discord-group-channels";

const threadId = "1556000000000000001",
  tagId = "1556000000000000002";
function fixture(): {
  job: ListingJob;
  state: ListingState;
  withdrawals: string[];
  store: ListingStore;
  request: ListingRequest;
  controls: {
    tags: string[];
    deleted: boolean;
    content: string;
    postError: Error | null;
  };
} {
  const job: ListingJob = {
    id: "test-job",
    entityId: "test-listing",
    kind: "guild",
    forumId: listingForums.Alliance.guild,
    title: "Fixture",
    content: "Public fixture content",
    attachment: null,
    tagNames: ["EU"],
    status: "queued",
    threadId: null,
    verifiedTagId: null,
    lastAuditId: null,
    reviewNotificationStatus: "queued",
    reviewNotificationMessageId: null,
    reviewNotificationAttempts: 0,
    reviewNotificationNextAttemptAt: new Date(0),
    reviewNotificationError: null,
    reviewNotifiedAt: null,
  };
  const state = { status: "approved" };
  const withdrawals: string[] = [];
  const controls = {
    tags: [] as string[],
    deleted: false,
    content: job.content,
    postError: null as Error | null,
  };
  const store: ListingStore = {
    async state(): Promise<ListingState> {
      return state;
    },
    async update(_job, values): Promise<void> {
      Object.assign(job, values);
    },
    async withdraw(_job, reason): Promise<void> {
      withdrawals.push(reason);
      if (state.status === "approved") state.status = "hidden";
    },
    async beginNotification(): Promise<boolean> {
      if (job.reviewNotificationStatus !== "queued") return false;
      job.reviewNotificationStatus = "sending";
      job.reviewNotificationAttempts += 1;
      return true;
    },
    async completeNotification(_job, messageId): Promise<void> {
      job.reviewNotificationStatus = "sent";
      job.reviewNotificationMessageId = messageId;
      job.reviewNotifiedAt = new Date();
    },
    async failNotification(_job, reason, terminal): Promise<void> {
      job.reviewNotificationStatus = terminal ? "failed" : "queued";
      job.reviewNotificationError = reason;
    },
  };
  const request: ListingRequest = async (
    route,
    method,
    body,
  ): Promise<unknown> => {
    if (method === "POST") {
      assert.equal(job.status, "posting");
      assert.deepEqual(
        (body as { message: { allowed_mentions: unknown } }).message
          .allowed_mentions,
        { parse: [] },
      );
      if (controls.postError) throw controls.postError;
      return {
        id: threadId,
        type: 11,
        guild_id: listingGuildId,
        parent_id: job.forumId,
        applied_tags: [],
      };
    }
    if (route === `/channels/${job.forumId}`)
      return {
        id: job.forumId,
        type: 15,
        guild_id: listingGuildId,
        available_tags: [{ id: tagId, name: "EU", moderated: false }],
      };
    if (route === `/channels/${threadId}`) {
      if (controls.deleted) throw new ListingDiscordError(404);
      return {
        id: threadId,
        type: 11,
        guild_id: listingGuildId,
        parent_id: job.forumId,
        applied_tags: controls.tags,
      };
    }
    if (route.includes("/messages/"))
      return {
        id: threadId,
        channel_id: threadId,
        author: { id: listingBotId },
        content: controls.content,
      };
    if (route === `/guilds/${listingGuildId}`)
      return { id: listingGuildId, owner_id: "1556000000000000100" };
    throw new Error("Unexpected test route");
  };
  return { job, state, withdrawals, store, request, controls };
}

test("group routing prioritizes character ruleset for both factions and every activity", (): void => {
  const routes = {
    Normal: {
      Dungeon: "pve",
      Questing: "pve",
      "PvP premade": "pvp",
      Raid: "scheduled",
      "RP event": "scheduled",
    },
    PvP: {
      Dungeon: "pvp",
      Questing: "pvp",
      "PvP premade": "pvp",
      Raid: "pvp",
      "RP event": "pvp",
    },
    Roleplaying: {
      Dungeon: "pve",
      Questing: "pve",
      "PvP premade": "pvp",
      Raid: "scheduled",
      "RP event": "scheduled",
    },
  } as const;
  for (const faction of ["Alliance", "Horde"] as const) {
    const base = {
      title: "Dungeon together",
      region: "EU" as const,
      faction,
      contactDiscord: "fixture",
      description: "Tank and healer wanted for a relaxed run",
      startsAt: new Date(Date.now() + 3600000).toISOString(),
    };
    for (const gameRuleset of ["Normal", "PvP", "Roleplaying"] as const) {
      for (const activity of [
        "Dungeon",
        "Questing",
        "PvP premade",
        "Raid",
        "RP event",
      ] as const) {
        const kind = routes[gameRuleset][activity];
        const draft = groupListingDraft(
          { ...base, gameRuleset, activity },
          "fixture",
        );
        assert.equal(draft.forumId, listingForums[faction][kind]);
        assert.ok(draft.content.length <= 1900);
        assert.ok(draft.tagNames.length <= 4);
        const available = groupTags(kind).map((tag): string => tag.name);
        assert.ok(
          draft.tagNames.every((tag): boolean => available.includes(tag)),
        );
        if (gameRuleset === "PvP") {
          assert.ok(draft.tagNames.includes("PvP ruleset"));
          if (activity !== "PvP premade")
            assert.ok(draft.tagNames.includes(activity));
        }
        assert.match(draft.content, /Central Europe \(UTC\+[12]\)/);
        assert.doesNotMatch(draft.content, /\.000Z \(UTC\)/);
      }
    }
  }
});

test("guild formatter preserves long submitted details and disables mentions", (): void => {
  const long = guildListingDraft(
    {
      name: "@everyone <@123> Fixture",
      region: "OCE",
      faction: "Horde",
      gameRuleset: "Unconfirmed",
      language: "English",
      playstyle: "Casual",
      raidDays: [],
      raidTime: "20:00 UTC",
      lootSystem: "Soft reserve",
      recruitingClasses: ["Shaman"],
      contactDiscord: "tester",
      description: "Full details. ".repeat(500),
      inviteUrl: "",
      websiteUrl: "",
    },
    "fixture",
  );
  assert.ok(long.content.length <= 1900);
  assert.ok(long.attachment?.includes("Full details. ".repeat(500).trim()));
  assert.ok(!long.content.includes("@everyone"));
  assert.ok(long.tagNames.includes("Other"));
});

test("PvP questing delivery creates the post in the faction PvP forum, not PvE", async (): Promise<void> => {
  for (const faction of ["Alliance", "Horde"] as const) {
    const f = fixture();
    Object.assign(
      f.job,
      groupListingDraft(
        {
          title: "PvP character leveling",
          activity: "Questing",
          region: "EU",
          faction,
          gameRuleset: "PvP",
          contactDiscord: "fixture",
          description: "Looking for a relaxed leveling group",
          startsAt: "2030-11-05T06:30:00.000Z",
        },
        "fixture",
      ),
      { kind: "group" },
    );
    let destination = "";
    await deliverListing(
      async (route, method, body, attachment): Promise<unknown> => {
        if (method === "POST") destination = route;
        return f.request(route, method, body, attachment);
      },
      f.store,
      f.job,
    );
    assert.equal(
      destination,
      `/channels/${listingForums[faction].pvp}/threads`,
    );
    assert.equal(f.job.status, "posted");
  }
});

test("delivery persists posting before sending and links a single bot forum post", async (): Promise<void> => {
  const f = fixture();
  await deliverListing(f.request, f.store, f.job);
  assert.equal(f.job.status, "posted");
  assert.equal(f.job.threadId, threadId);
  assert.equal(f.state.status, "approved");
  await deliverListing(f.request, f.store, f.job);
  assert.equal(f.job.status, "posted");
});

test("an approved listing stays published without a Discord approval tag", async (): Promise<void> => {
  const f = fixture();
  await deliverListing(f.request, f.store, f.job);
  await syncListing(f.request, f.store, f.job);
  assert.equal(f.state.status, "approved");
  assert.deepEqual(f.withdrawals, []);
});

test("Discord tag changes do not gate publication, but deleted or altered source posts withdraw it", async (): Promise<void> => {
  {
    const f = fixture();
    await deliverListing(f.request, f.store, f.job);
    f.controls.tags = [tagId];
    await syncListing(f.request, f.store, f.job);
    f.controls.tags = [];
    await syncListing(f.request, f.store, f.job);
    assert.equal(f.state.status, "approved");
  }
  for (const scenario of ["delete", "edit"] as const) {
    const f = fixture();
    await deliverListing(f.request, f.store, f.job);
    if (scenario === "delete") f.controls.deleted = true;
    if (scenario === "edit") f.controls.content = "Altered details";
    await syncListing(f.request, f.store, f.job);
    assert.equal(f.state.status, "hidden");
  }
});

test("Discord synchronization cannot undo a website hide", async (): Promise<void> => {
  const f = fixture();
  await deliverListing(f.request, f.store, f.job);
  f.state.status = "hidden";
  await syncListing(f.request, f.store, f.job);
  assert.equal(f.state.status, "hidden");
  assert.equal(f.job.status, "removed");
});

test("review notification links the admin record and is sent once", async (): Promise<void> => {
  const f = fixture();
  await deliverListing(f.request, f.store, f.job);
  let calls = 0;
  const notify: ListingReviewNotifier = async (content, nonce) => {
    calls += 1;
    assert.match(content, /New guild listing is live and needs review/);
    assert.match(content, /\/admin\/guilds\?edit=test-listing/);
    assert.match(content, new RegExp(threadId));
    assert.match(content, /Reference: test-job/);
    assert.match(nonce, /^[a-f0-9]{24}$/);
    return {
      channelId: "1556000000000000040",
      messageId: "1556000000000000041",
    };
  };
  await notifyListingReviewer(notify, f.store, f.job);
  await notifyListingReviewer(notify, f.store, f.job);
  assert.equal(calls, 1);
  assert.equal(f.job.reviewNotificationStatus, "sent");
  assert.equal(f.job.reviewNotificationMessageId, "1556000000000000041");
});

test("review notification retries temporary failures and stops on explicit rejection", async (): Promise<void> => {
  const temporary = fixture();
  await notifyListingReviewer(
    async (): Promise<never> => {
      throw new Error("timeout");
    },
    temporary.store,
    temporary.job,
  );
  assert.equal(temporary.job.reviewNotificationStatus, "queued");
  assert.equal(temporary.job.reviewNotificationAttempts, 1);

  const rejected = fixture();
  await notifyListingReviewer(
    async (): Promise<never> => {
      throw new ListingDiscordError(403);
    },
    rejected.store,
    rejected.job,
  );
  assert.equal(rejected.job.reviewNotificationStatus, "failed");
  assert.match(rejected.job.reviewNotificationError ?? "", /403/);
});

test("ambiguous send is held while explicit rejection is safely distinguishable", async (): Promise<void> => {
  for (const [error, status] of [
    [new Error("timeout"), "uncertain"],
    [new ListingDiscordError(500), "uncertain"],
    [new ListingDiscordError(403), "failed"],
    [new ListingDiscordError(429), "queued"],
  ] as const) {
    const f = fixture();
    f.controls.postError = error;
    await deliverListing(f.request, f.store, f.job);
    assert.equal(f.job.status, status);
  }
});

test("expired, withdrawn and missing listings are not posted", async (): Promise<void> => {
  const f = fixture();
  f.state.status = "rejected";
  await deliverListing(f.request, f.store, f.job);
  assert.equal(f.job.status, "removed");
});

test("wrong server identity withdraws an already approved linked listing", async (): Promise<void> => {
  const f = fixture();
  await deliverListing(f.request, f.store, f.job);
  await syncListing(f.request, f.store, f.job);
  const wrongServer: ListingRequest = async (
    route,
    method,
    body,
    attachment,
  ): Promise<unknown> => {
    const value = await f.request(route, method, body, attachment);
    return route === `/channels/${threadId}`
      ? {
          ...(value as Record<string, unknown>),
          guild_id: "1556000000000000003",
        }
      : value;
  };
  await syncListing(wrongServer, f.store, f.job);
  assert.equal(f.state.status, "hidden");
});

test("closed group tags withdraw an upcoming group", async (): Promise<void> => {
  const f = fixture();
  f.job.kind = "group";
  f.job.forumId = listingForums.Horde.pve;
  await deliverListing(f.request, f.store, f.job);
  await syncListing(f.request, f.store, f.job);
  const fullTag = "1556000000000000033";
  f.controls.tags = [tagId, fullTag];
  const closed: ListingRequest = async (
    route,
    method,
    body,
    attachment,
  ): Promise<unknown> => {
    const value = await f.request(route, method, body, attachment);
    return route === `/channels/${f.job.forumId}`
      ? {
          ...(value as Record<string, unknown>),
          available_tags: [
            { id: tagId, name: "EU", moderated: false },
            { id: fullTag, name: "Full", moderated: false },
          ],
        }
      : value;
  };
  await syncListing(closed, f.store, f.job);
  assert.equal(f.state.status, "hidden");
});

test("REST transport rejects writes to unrelated servers, channels and member routes", async (): Promise<void> => {
  const request = listingRequest("unused-test-token");
  await assert.rejects(request("/guilds/1556000000000000001", "GET"));
  await assert.rejects(
    request(
      `/guilds/${listingGuildId}/members/1556000000000000003`,
      "PATCH",
      {},
    ),
  );
  await assert.rejects(request(`/channels/${threadId}/threads`, "POST", {}));
  await assert.rejects(
    request(`/channels/${listingForums.Alliance.guild}`, "PATCH", {}),
  );
});
