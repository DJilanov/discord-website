import { readFile, readdir, realpath, stat } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

interface VerifiedBuild {
  buildDirectory: string;
  buildId: string;
  staticAssets: number;
  serverEntries: number;
}

export async function verifyProductionBuild(
  root: string,
  buildDirectory: string,
): Promise<VerifiedBuild> {
  if (!/^\.next(?:-[A-Za-z0-9][A-Za-z0-9._-]*)?$/.test(buildDirectory))
    throw new Error("Expected a .next or .next-* production build directory");
  const project = await realpath(root);
  const build = join(project, buildDirectory);
  if ((await realpath(build)) !== build)
    throw new Error("Production build must not be a symlink");

  async function requireFile(path: string): Promise<void> {
    const canonical = await realpath(path);
    if (!canonical.startsWith(build + sep))
      throw new Error(`Build reference escapes the selected output: ${path}`);
    const metadata = await stat(canonical);
    if (!metadata.isFile() || metadata.size === 0)
      throw new Error(`Missing or empty production build file: ${path}`);
  }

  for (const name of [
    "BUILD_ID",
    "required-server-files.json",
    "routes-manifest.json",
    "build-manifest.json",
    "prerender-manifest.json",
    "server/app-paths-manifest.json",
  ])
    await requireFile(join(build, name));
  const buildId = (await readFile(join(build, "BUILD_ID"), "utf8")).trim();
  if (!buildId) throw new Error("Production BUILD_ID is empty");
  const entries: unknown = JSON.parse(
    await readFile(join(build, "server/app-paths-manifest.json"), "utf8"),
  );
  if (!entries || typeof entries !== "object" || Array.isArray(entries))
    throw new Error("Invalid production server manifest");
  const serverEntries = Object.values(entries);
  if (serverEntries.length === 0)
    throw new Error("No production server entries");
  for (const entry of serverEntries) {
    if (typeof entry !== "string" || !entry.endsWith(".js"))
      throw new Error("Invalid production server entry");
    await requireFile(resolve(build, "server", entry));
  }

  const chunks = join(build, "static/chunks");
  const staticAssets = (await readdir(chunks)).filter((name) =>
    /\.(js|css)$/.test(name),
  );
  if (
    !staticAssets.some((name) => name.endsWith(".js")) ||
    !staticAssets.some((name) => name.endsWith(".css"))
  )
    throw new Error("Production JavaScript or CSS assets are missing");
  for (const asset of staticAssets) await requireFile(join(chunks, asset));
  return {
    buildDirectory,
    buildId,
    staticAssets: staticAssets.length,
    serverEntries: serverEntries.length,
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(__dirname, "verify-production-build.ts")
) {
  void verifyProductionBuild(
    process.cwd(),
    process.argv[2] || process.env.FOREVER_BUILD_DIR || ".next",
  )
    .then((result) =>
      console.log(JSON.stringify({ verified: true, ...result })),
    )
    .catch((error: unknown) => {
      console.error(`Cannot activate production build: ${String(error)}`);
      process.exitCode = 1;
    });
}
