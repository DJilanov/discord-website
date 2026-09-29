import { apiError } from "@/lib/api";
import { handleInteraction, verifyDiscordSignature } from "@/lib/discord-bot";
import { HttpError, readText } from "@/lib/security";

export async function POST(request: Request): Promise<Response> {
  try {
    const publicKey = process.env.DISCORD_PUBLIC_KEY;
    if (!publicKey)
      throw new HttpError(503, "Discord integration is not configured.");
    const raw = await readText(request, 50000);
    if (
      !verifyDiscordSignature(
        raw,
        request.headers.get("x-signature-ed25519") || "",
        request.headers.get("x-signature-timestamp") || "",
        publicKey,
      )
    )
      throw new HttpError(401, "Invalid interaction signature.");
    return Response.json(await handleInteraction(JSON.parse(raw) as unknown));
  } catch (error) {
    return apiError(error);
  }
}
