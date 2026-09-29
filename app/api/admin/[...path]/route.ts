import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { apiError } from "@/lib/api";
import {
  HttpError,
  ipHash,
  rateLimit,
  readJson,
  requireSameOrigin,
} from "@/lib/security";
import {
  saveGuide,
  saveGuild,
  saveSettings,
  saveStaff,
  reviewGroup,
} from "@/lib/admin-content";
import { reviewReport, reviewAppeal } from "@/lib/moderation";
import { adminSections } from "@/lib/admin-nav";
import { saveRelease } from "@/lib/releases";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  try {
    requireSameOrigin(request);
    const { path } = await params,
      [section, id] = path;
    if (path.length > 2) throw new HttpError(404, "Unknown action.");
    const config = adminSections.find(
      (item) => item.path === `/admin/${section}`,
    );
    if (!config) throw new HttpError(404, "Unknown action.");
    const staff = await requireStaff(config.roles);
    await rateLimit(`admin:${staff.id}:${ipHash(request.headers)}`, 100, 60);
    if (section === "addons") {
      await saveRelease(id, request, staff);
      return NextResponse.json({ message: "Release saved." });
    }
    const body = await readJson(request);
    switch (section) {
      case "settings":
        await saveSettings(body, staff);
        break;
      case "guides": {
        const savedId = await saveGuide(id, body, staff);
        return NextResponse.json({ message: "Guide saved.", id: savedId });
      }
      case "guilds":
        if (!id) throw new HttpError(400, "Guild identifier required.");
        await saveGuild(id, body, staff);
        break;
      case "groups":
        if (!id) throw new HttpError(400, "Group identifier required.");
        await reviewGroup(id, body, staff);
        break;
      case "reports":
        if (!id) throw new HttpError(400, "Case identifier required.");
        await reviewReport(id, body, staff);
        break;
      case "appeals":
        if (!id) throw new HttpError(400, "Appeal identifier required.");
        await reviewAppeal(id, body, staff);
        break;
      case "staff":
        await saveStaff(id, body, staff);
        break;
      default:
        throw new HttpError(404, "Unknown action.");
    }
    return NextResponse.json(
      { message: "Changes saved." },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
