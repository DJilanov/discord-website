import { spawnSync } from "node:child_process";
import { lstat, readFile, readdir, realpath, rm } from "node:fs/promises";
import { join, resolve } from "node:path";

interface TreeInfo {
  bytes: number;
  modified: number;
}

interface CleanupOptions {
  dryRun?: boolean;
  maxBytes?: number;
  maxAgeMs?: number;
  graceMs?: number;
  now?: number;
  protectedDirectory?: string;
  hasOpenFiles?: (directory: string) => boolean;
}

interface CleanupResult {
  removed: string[];
  bytes: number;
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

async function exists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (isMissing(error)) return false;
    throw error;
  }
}

async function inspectTree(path: string): Promise<TreeInfo> {
  const stat = await lstat(path);
  if (stat.isSymbolicLink()) return { bytes: 0, modified: stat.mtimeMs };
  if (!stat.isDirectory()) return { bytes: stat.size, modified: stat.mtimeMs };
  const result = { bytes: 0, modified: stat.mtimeMs };
  for (const name of await readdir(path)) {
    const child = await inspectTree(join(path, name));
    result.bytes += child.bytes;
    result.modified = Math.max(result.modified, child.modified);
  }
  return result;
}

async function hasLiveLock(directory: string): Promise<boolean> {
  for (const name of ["lock", "dev/lock"]) {
    let content: string;
    try {
      content = await readFile(join(directory, name), "utf8");
    } catch (error) {
      if (isMissing(error)) continue;
      return true;
    }
    let info: unknown;
    try {
      info = JSON.parse(content);
    } catch {
      return true;
    }
    if (
      !info ||
      typeof info !== "object" ||
      !("pid" in info) ||
      typeof info.pid !== "number" ||
      !Number.isInteger(info.pid) ||
      info.pid <= 0
    )
      return true;
    try {
      process.kill(info.pid, 0);
      return true;
    } catch (error) {
      if (!(
        error instanceof Error &&
        "code" in error &&
        error.code === "ESRCH"
      ))
        return true;
    }
  }
  return false;
}

function hasOpenFiles(directory: string): boolean {
  const result = spawnSync("lsof", ["-nP", "-t", "+D", directory], {
    encoding: "utf8",
    timeout: 10000,
    maxBuffer: 1024 * 1024,
  });
  // Missing tools, permissions and timeouts must never make a directory look idle.
  return Boolean(
    result.error || result.status !== 1 || result.stdout || result.stderr,
  );
}

export async function cleanupPreviewBuilds(
  root: string,
  options: CleanupOptions = {},
): Promise<CleanupResult> {
  const {
    dryRun = false,
    maxBytes = 2 * 1024 ** 3,
    maxAgeMs = 7 * 86400000,
    graceMs = 3600000,
    now = Date.now(),
    protectedDirectory = ".next",
    hasOpenFiles: checkOpenFiles = hasOpenFiles,
  } = options;
  const repository = await realpath(root);
  const protectedPath = resolve(repository, protectedDirectory);
  const candidates: (TreeInfo & { path: string; name: string })[] = [];
  for (const entry of await readdir(repository, { withFileTypes: true })) {
    if (
      !entry.isDirectory() ||
      !/^\.next-[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(entry.name)
    )
      continue;
    const path = join(repository, entry.name);
    if (path === protectedPath || (await realpath(path)) !== path) continue;
    // Completed production builds can be used by `next start`, which has no dev lock.
    if (await exists(join(path, "BUILD_ID"))) continue;
    if (!(await exists(join(path, "dev/build-manifest.json")))) continue;
    if (await hasLiveLock(path)) continue;
    candidates.push({ path, name: entry.name, ...(await inspectTree(path)) });
  }
  let total = candidates.reduce((sum, entry) => sum + entry.bytes, 0);
  const result: CleanupResult = { removed: [], bytes: 0 };
  for (const entry of candidates.sort((a, b) => a.modified - b.modified)) {
    if (now - entry.modified < graceMs) continue;
    if (total <= maxBytes && now - entry.modified <= maxAgeMs) continue;
    if (checkOpenFiles(entry.path) || (await hasLiveLock(entry.path))) continue;
    if (
      (await realpath(entry.path)) !== entry.path ||
      (await exists(join(entry.path, "BUILD_ID")))
    )
      continue;
    const current = await inspectTree(entry.path);
    if (current.modified !== entry.modified || current.bytes !== entry.bytes)
      continue;
    if (!dryRun) await rm(entry.path, { recursive: true });
    total -= entry.bytes;
    result.bytes += entry.bytes;
    result.removed.push(entry.name);
  }
  return result;
}
