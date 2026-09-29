import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/config";

export interface SafetyEntry {
  id: string;
  character: string;
  realm: string;
  region: string;
  category: string;
  severity: number;
  summary: string;
  lastReviewedAt: string;
  expiresAt: number;
}
export interface SafetyExport {
  version: string;
  generatedAt: string;
  source: string;
  entries: SafetyEntry[];
}

export async function getSafetyExport(): Promise<SafetyExport> {
  const alerts = await db.foreverSafetyAlert.findMany({
    where: {
      active: true,
      appealStatus: { not: "pending" },
      expiresAt: { gt: new Date() },
    },
    orderBy: { publicId: "asc" },
    take: 20000,
    select: {
      publicId: true,
      character: true,
      realm: true,
      region: true,
      category: true,
      severity: true,
      summary: true,
      lastReviewedAt: true,
      expiresAt: true,
    },
  });
  const entries = alerts.map((alert) => ({
    id: alert.publicId,
    character: alert.character,
    realm: alert.realm,
    region: alert.region,
    category: alert.category,
    severity: alert.severity,
    summary: alert.summary,
    lastReviewedAt: alert.lastReviewedAt.toISOString(),
    expiresAt: Math.floor(alert.expiresAt.getTime() / 1000),
  }));
  return {
    version: createHash("sha256")
      .update(JSON.stringify(entries))
      .digest("hex")
      .slice(0, 16),
    generatedAt: new Date().toISOString(),
    source: SITE_URL,
    entries,
  };
}

export function luaString(value: string): string {
  let result = '"';
  for (const byte of Buffer.from(value, "utf8"))
    result +=
      byte === 34
        ? '\\"'
        : byte === 92
          ? "\\\\"
          : byte < 32 || byte > 126
            ? `\\${String(byte).padStart(3, "0")}`
            : String.fromCharCode(byte);
  return result + '"';
}

export function toLua(data: SafetyExport): string {
  return `-- Downloaded from ${data.source}. Public reviewed alerts only.\nForeverGuardData = {\n  version = ${luaString(data.version)},\n  generatedAt = ${luaString(data.generatedAt)},\n  source = ${luaString(data.source)},\n  entries = {\n${data.entries.map((entry) => `    { id = ${luaString(entry.id)}, character = ${luaString(entry.character)}, realm = ${luaString(entry.realm)}, region = ${luaString(entry.region)}, category = ${luaString(entry.category)}, severity = ${entry.severity}, summary = ${luaString(entry.summary)}, lastReviewedAt = ${luaString(entry.lastReviewedAt)}, expiresAt = ${entry.expiresAt} },`).join("\n")}\n  },\n}\n`;
}
