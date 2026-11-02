import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  preparationSchema,
  defaultPreparation,
  invitationViewSchema,
  rosterPublicationSchema,
  rosterReplySchema,
  type InvitationView,
} from "../lib/raids/roster-confirmation-contracts";
import {
  rosterControl,
  rosterInvitationMessage,
} from "../lib/raids/roster-confirmation-ui";
import { rosterInteractionSchema } from "../lib/raids/roster-confirmation-interactions";
import { rosterTerms } from "../lib/raids/roster-confirmations";

function invitation(): InvitationView {
  return invitationViewSchema.parse({
    id: randomUUID(),
    signupId: "signup",
    version: 1,
    state: "pending",
    deadline: "2035-11-05T17:00:00.000Z",
    repliedAt: null,
    delivery: "pending",
    reason: null,
    directMessages: true,
    preparation: defaultPreparation("Hyjal Summit", "forever"),
    offer: {
      title: "Hyjal",
      game: "forever",
      raidName: "Hyjal Summit",
      realm: "",
      character: {
        game: "forever",
        realm: "",
        name: "Test Hero",
        className: "Warrior",
        specialization: "Fury",
        region: "EU",
        faction: "Alliance",
        ruleset: "PvP",
      },
      role: "damage",
      partyIndex: 0,
      startsAt: "2035-11-05T18:00:00.000Z",
      endsAt: "2035-11-05T20:00:00.000Z",
      organizerId: "organizer",
      organizerDiscordId: "1557000000000000001",
      leader: "Test Leader",
      description: "Published rules",
      policyChecksum: "a".repeat(64),
      reserveLimit: 2,
      allowDuplicates: false,
      hardReserves: [19019],
      discordUrl:
        "https://discord.com/channels/1411533815356194968/1557000000000000012/1557000000000000013",
    },
  });
}
test("Invitations show selected role, local Discord times and complete preparation without exposing a decline explanation", () => {
  const view = invitation();
  view.reason = "PRIVATE_REASON_NEVER_IN_PUBLIC_MESSAGE";
  const message = rosterInvitationMessage(view),
    prepared = rosterInvitationMessage(view, true);
  assert.match(message.embeds[0].description, /awaiting your reply/);
  assert.match(message.embeds[0].description, /Group 1/);
  assert.match(message.embeds[0].description, /<t:\d+:f>/);
  assert(!JSON.stringify(message).includes(view.reason));
  assert(prepared.content.includes(view.preparation.general));
  assert.match(prepared.embeds[0].description, /interrupt/);
  assert.equal(message.allowed_mentions.parse.length, 0);
});
test("Party moves preserve the offer; role, character, timing and policy changes invalidate it", () => {
  const { offer } = invitation(),
    guild = "1411533815356194968",
    hash = rosterTerms(offer, guild);
  assert.equal(
    rosterTerms({ ...offer, partyIndex: 4, title: "Updated title" }, guild),
    hash,
  );
  assert.notEqual(rosterTerms({ ...offer, role: "tank" }, guild), hash);
  assert.notEqual(
    rosterTerms({ ...offer, startsAt: "2035-11-05T19:00:00.000Z" }, guild),
    hash,
  );
  assert.notEqual(
    rosterTerms({ ...offer, policyChecksum: "b".repeat(64) }, guild),
    hash,
  );
  assert.notEqual(rosterTerms(offer, "1554316932948172940"), hash);
});
test("DM and server interaction shapes remain separate and recipient identity is unambiguous", () => {
  const view = invitation();
  const dm = {
    id: "1557000000000000100",
    type: 3,
    application_id: "1557000000000000011",
    user: { id: "1557000000000000002" },
    channel_id: "1557000000000000200",
    message: {
      id: "1557000000000000201",
      author: { id: "1557000000000000011", bot: true },
      flags: 0,
    },
    data: { custom_id: rosterControl(view, "confirm"), component_type: 2 },
  };
  assert(rosterInteractionSchema.safeParse(dm).success);
  assert(
    !rosterInteractionSchema.safeParse({ ...dm, member: { user: dm.user } })
      .success,
  );
  assert(
    !rosterInteractionSchema.safeParse({
      ...dm,
      guild_id: "1411533815356194968",
    }).success,
  );
  const { user, ...guild } = dm;
  assert(
    rosterInteractionSchema.safeParse({
      ...guild,
      guild_id: "1411533815356194968",
      member: { user },
    }).success,
  );
});
test("Declines need a short private reason and preparation links require HTTPS", () => {
  const input = {
    invitationId: randomUUID(),
    requestKey: randomUUID(),
    version: 1,
    choice: "declined",
  };
  assert(!rosterReplySchema.safeParse(input).success);
  assert(
    rosterReplySchema.safeParse({ ...input, reason: "Prefer not to say" })
      .success,
  );
  assert(
    !preparationSchema.safeParse({
      ...defaultPreparation("Hyjal Summit", "forever"),
      voiceUrl: "javascript:alert(1)",
    }).success,
  );
  assert(
    !preparationSchema.safeParse({
      ...defaultPreparation("Hyjal Summit", "forever"),
      guideUrl: "https://user:password@example.com/",
    }).success,
  );
  assert(
    !rosterPublicationSchema.safeParse({
      requestKey: randomUUID(),
      version: 1,
      deadline: "tomorrow",
      preparation: defaultPreparation("Hyjal Summit", "forever"),
    }).success,
  );
});
test("Expired and revoked invitations do not offer a usable confirmation button", () => {
  for (const state of ["expired", "revoked", "changed", "declined"] as const) {
    const view = invitation();
    view.state = state;
    view.deadline = "2020-01-01T00:00:00.000Z";
    const message = rosterInvitationMessage(view);
    const control = message.components[0].components[0];
    assert("disabled" in control && control.disabled === true);
  }
});
