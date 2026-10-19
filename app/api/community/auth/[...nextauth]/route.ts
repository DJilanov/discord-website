import { Auth } from "@auth/core";
import { memberAuthConfig, memberAuthReady } from "@/lib/member-auth";
import {
  memberAuthRequest,
  privateMemberAuthResponse,
} from "@/lib/member-auth-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handle(request: Request): Promise<Response> {
  if (!memberAuthReady())
    return privateMemberAuthResponse(
      Response.json(
        { error: "Member sign-in is not configured." },
        {
          status: 503,
        },
      ),
    );
  const response = await Auth(
    memberAuthRequest(request, memberAuthConfig),
    memberAuthConfig,
  );
  return privateMemberAuthResponse(response);
}
export { handle as GET, handle as POST };
