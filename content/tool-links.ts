export const CANONICAL_TOOLS_URL = "https://kfcguild.online/tools";

export function canonicalToolHref(href: string): string {
  let legacy: URL;
  try {
    legacy = new URL(href);
  } catch {
    return href;
  }
  if (
    legacy.hostname !== "helper.kfcguild.online" ||
    !["http:", "https:"].includes(legacy.protocol) ||
    legacy.username ||
    legacy.password ||
    legacy.port
  )
    return href;
  const canonical = new URL(CANONICAL_TOOLS_URL);
  canonical.pathname =
    legacy.pathname === "/tools" || legacy.pathname.startsWith("/tools/")
      ? legacy.pathname
      : legacy.pathname === "/"
        ? "/tools"
        : `/tools${legacy.pathname}`;
  canonical.search = legacy.search;
  canonical.hash = legacy.hash;
  return canonical.href;
}
