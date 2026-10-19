import { apiError } from "@/lib/api";

export const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
};
export async function raidApi(
  action: () => Promise<unknown>,
  status = 200,
): Promise<Response> {
  try {
    return Response.json(await action(), { status, headers: privateHeaders });
  } catch (error) {
    const response = apiError(error);
    for (const [key, value] of Object.entries(privateHeaders))
      response.headers.set(key, value);
    return response;
  }
}
