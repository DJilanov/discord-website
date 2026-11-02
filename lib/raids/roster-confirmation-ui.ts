import { discordText } from "./discord-format";
import {
  nativeMessageSchema,
  type NativeButton,
  type NativeMessage,
} from "./native-contracts";
import {
  classPreparation,
  type InvitationView,
} from "./roster-confirmation-contracts";

export function rosterControl(
  invitation: Pick<InvitationView, "id" | "version">,
  action: "confirm" | "decline" | "preparation" | "view",
): string {
  return `rsvp:${invitation.id}:${invitation.version}:${action}`;
}
export function rosterReplyLabel(state: string): string {
  const labels: Record<string, string> = {
    pending: "Selected · awaiting your reply",
    confirmed: "Attendance confirmed",
    declined: "Declined",
    expired: "No response by the deadline",
    changed: "Raid details changed · updated invitation needed",
    revoked: "Invitation no longer active",
    manual: "Attendance verified by the leader",
  };
  return labels[state] ?? "Awaiting reply";
}
function timestamp(value: string, style = "f"): string {
  return `<t:${Math.floor(Date.parse(value) / 1000)}:${style}>`;
}
export function rosterButtons(invitation: InvitationView): NativeButton[] {
  const live = !["revoked", "changed", "declined"].includes(invitation.state);
  return [
    {
      type: 2,
      style: 3,
      label: "Confirm attendance",
      custom_id: rosterControl(invitation, "confirm"),
      disabled:
        !live ||
        Date.parse(invitation.deadline) <= Date.now() ||
        invitation.state === "confirmed",
    },
    {
      type: 2,
      style: 4,
      label:
        invitation.state === "confirmed" || invitation.state === "manual"
          ? "I can no longer attend"
          : "Decline",
      custom_id: rosterControl(invitation, "decline"),
      disabled: ["revoked", "declined"].includes(invitation.state),
    },
    {
      type: 2,
      style: 2,
      label: "Preparation",
      custom_id: rosterControl(invitation, "preparation"),
      disabled: invitation.state === "revoked",
    },
    {
      type: 2,
      style: 5,
      label: "Open raid in Discord",
      url: invitation.offer.discordUrl,
    },
  ];
}
export function rosterInvitationMessage(
  invitation: InvitationView,
  preparation = false,
  notice = "",
): NativeMessage {
  const { offer, preparation: prep } = invitation;
  const muster = new Date(
    Date.parse(offer.startsAt) - prep.musterMinutes * 60000,
  ).toISOString();
  let description = `**${rosterReplyLabel(invitation.state)}**\n${discordText(offer.title, 150)}\n\n**${discordText(offer.character.name)}** · ${discordText(offer.character.specialization ?? "")} ${offer.character.className}\nRole: **${offer.role}**${offer.partyIndex !== null ? ` · Group ${offer.partyIndex + 1}` : ""}\nLeader: ${discordText(offer.leader, 80)}\nBe ready: ${timestamp(muster)}\nRaid: ${timestamp(offer.startsAt)} → ${timestamp(offer.endsAt, "t")}\nReply by: ${timestamp(invitation.deadline)}\n`;
  if (notice) description += `\n${discordText(notice, 400)}\n`;
  if (preparation) {
    const role = offer.role === "participant" ? "" : prep[offer.role];
    description += `\n**Preparation**\n${role ? `\n**Your role**\n${discordText(role, 600)}\n` : ""}\n**Your class**\n${classPreparation(offer.character.className)}\n`;
    if (prep.meeting)
      description += `\nMeeting place: ${discordText(prep.meeting, 200)}\n`;
    if (prep.voiceUrl) description += `Voice: ${prep.voiceUrl}\n`;
    if (prep.guideUrl) description += `Tactics: ${prep.guideUrl}\n`;
    description += `\nLoot: ${offer.reserveLimit} SR · ${offer.allowDuplicates ? "duplicates allowed" : "unique items"}\n${offer.hardReserves.length ? `Hard reserves: ${offer.hardReserves.map((id) => `item ${id}`).join(", ")}\n` : ""}`;
  } else if (!["revoked", "changed", "declined"].includes(invitation.state))
    description += `\nYou have been selected. Confirm you can attend or decline so the leader can arrange a replacement. Preparation and raid rules are available below.\n${discordText(prep.general, 650)}`;
  if (invitation.state === "changed")
    description +=
      "\nThe leader must publish updated terms before you can confirm. Your previous reply has not been carried over.";
  if (invitation.state === "declined")
    description +=
      "\nYour response is saved. The leader has been notified. Your explanation is private.";
  if (invitation.state === "revoked")
    description +=
      "\nThis invitation no longer holds a place. Check My signup on the original raid for current information.";
  return nativeMessageSchema.parse({
    content: preparation ? `**Preparation checklist**\n${prep.general}` : "",
    embeds: [
      {
        title: preparation
          ? "Your raid preparation"
          : "Your raid roster invitation",
        description: description.slice(0, 4096),
        color: invitation.state === "confirmed" ? 0x64b38b : 0xe7b65b,
      },
    ],
    components: [{ type: 1, components: rosterButtons(invitation) }],
    allowed_mentions: { parse: [] },
  });
}
