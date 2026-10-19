import { z } from "zod";
import {
  discordId,
  listingBotId,
  listingForumIds,
  listingGuildId,
} from "./contracts";

export type ListingRequest = (
  route: string,
  method?: "GET" | "POST" | "PATCH",
  body?: unknown,
  attachment?: string,
) => Promise<unknown>;
export class ListingDiscordError extends Error {
  constructor(public readonly status: number) {
    super(`discord_http_${status}`);
    this.name = "ListingDiscordError";
  }
}

async function discordRequest(
  token: string,
  route: string,
  method: "GET" | "POST",
  body?: unknown,
  attachment?: string,
): Promise<unknown> {
  const headers: Record<string, string> = { Authorization: `Bot ${token}` };
  let payload: string | FormData | undefined;
  if (attachment) {
    const form = new FormData();
    form.set("payload_json", JSON.stringify(body));
    form.set(
      "files[0]",
      new Blob([attachment], { type: "text/plain;charset=utf-8" }),
      "listing.txt",
    );
    payload = form;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const response = await fetch(`https://discord.com/api/v10${route}`, {
    method,
    headers,
    body: payload,
    signal: AbortSignal.timeout(15000),
    redirect: "error",
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new ListingDiscordError(response.status);
  }
  const text = await response.text();
  if (text.length > 1048576) throw new Error("discord_response_too_large");
  return JSON.parse(text) as unknown;
}

export function listingRequest(token: string): ListingRequest {
  return async (route, method = "GET", body, attachment): Promise<unknown> => {
    const id = "[1-9]\\d{16,19}";
    const readable =
      [`/guilds/${listingGuildId}`, "/users/@me"].includes(route) ||
      new RegExp(`^/channels/${id}(?:/messages/${id})?$`).test(route);
    const writable = listingForumIds.some(
      (forum) => route === `/channels/${forum}/threads` && method === "POST",
    );
    if ((method === "GET" && !readable) || (method !== "GET" && !writable))
      throw new Error("listing_route_out_of_scope");
    const data = await discordRequest(
      token,
      route,
      method === "PATCH" ? "POST" : method,
      body,
      attachment,
    );
    if (route === "/users/@me" && (data as { id?: string }).id !== listingBotId)
      throw new Error("listing_bot_identity_mismatch");
    return data;
  };
}

export interface ListingReviewReceipt {
  channelId: string;
  messageId: string;
}

export type ListingReviewNotifier = (
  content: string,
  nonce: string,
) => Promise<ListingReviewReceipt>;

const directMessageChannelSchema = z.object({
  id: discordId,
  type: z.literal(1),
  recipients: z.array(z.object({ id: discordId })).min(1),
});

export function listingReviewNotifier(
  token: string,
  reviewerId: string,
): ListingReviewNotifier {
  const recipientId = discordId.parse(reviewerId);
  return async (content, nonce): Promise<ListingReviewReceipt> => {
    const channel = directMessageChannelSchema.parse(
      await discordRequest(token, "/users/@me/channels", "POST", {
        recipient_id: recipientId,
      }),
    );
    if (!channel.recipients.some((recipient) => recipient.id === recipientId))
      throw new Error("listing_reviewer_channel_identity_mismatch");
    const message = z
      .object({
        id: discordId,
        channel_id: z.literal(channel.id),
        author: z.object({ id: z.literal(listingBotId) }),
        content: z.literal(content),
      })
      .parse(
        await discordRequest(
          token,
          `/channels/${channel.id}/messages`,
          "POST",
          {
            content,
            nonce,
            enforce_nonce: true,
            allowed_mentions: { parse: [] },
          },
        ),
      );
    return { channelId: channel.id, messageId: message.id };
  };
}
