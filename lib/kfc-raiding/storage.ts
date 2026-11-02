import { lstat, mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import {
  raidingConfigSchema,
  raidingStateSchema,
  openingPublicationSchema,
  type OpeningPublication,
  type RaidingConfig,
  type RaidingState,
} from "./contracts";

function missing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export class RaidingStore {
  constructor(readonly root: string) {}

  async initialize(): Promise<void> {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const info = await lstat(this.root);
    if (!info.isDirectory() || info.isSymbolicLink() || info.mode & 0o077)
      throw new Error("Unsafe raiding state directory.");
  }

  async read(name: "config" | "state" | "opening-week"): Promise<unknown> {
    const file = path.join(this.root, `${name}.json`);
    const info = await lstat(file);
    if (!info.isFile() || info.isSymbolicLink() || info.mode & 0o077)
      throw new Error("Unsafe raiding state file.");
    return JSON.parse(await readFile(file, "utf8")) as unknown;
  }

  async config(): Promise<RaidingConfig | null> {
    try {
      return raidingConfigSchema.parse(await this.read("config"));
    } catch (error: unknown) {
      if (missing(error)) return null;
      throw error;
    }
  }

  async state(): Promise<RaidingState> {
    try {
      return raidingStateSchema.parse(await this.read("state"));
    } catch (error: unknown) {
      if (missing(error)) return raidingStateSchema.parse({});
      throw error;
    }
  }

  async save(state: RaidingState): Promise<void> {
    await this.write("state", raidingStateSchema.parse(state));
  }

  async saveConfig(config: RaidingConfig): Promise<void> {
    await this.write("config", raidingConfigSchema.parse(config));
  }

  async publication(): Promise<OpeningPublication> {
    try {
      return openingPublicationSchema.parse(await this.read("opening-week"));
    } catch (error: unknown) {
      if (missing(error)) return openingPublicationSchema.parse({});
      throw error;
    }
  }

  async savePublication(value: OpeningPublication): Promise<void> {
    await this.write("opening-week", openingPublicationSchema.parse(value));
  }

  private async write(
    name: "state" | "config" | "opening-week",
    value: unknown,
  ): Promise<void> {
    const destination = path.join(this.root, `${name}.json`);
    const temporary = `${destination}.${process.pid}.tmp`;
    const handle = await open(temporary, "wx", 0o600);
    try {
      await handle.writeFile(JSON.stringify(value));
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, destination);
  }

  async journal(record: Record<string, unknown>): Promise<void> {
    const day = new Date().toISOString().slice(0, 10);
    const file = await open(
      path.join(this.root, `operations-${day}.jsonl`),
      "a",
      0o600,
    );
    try {
      await file.writeFile(
        `${JSON.stringify({ at: new Date().toISOString(), ...record })}\n`,
      );
      await file.sync();
    } finally {
      await file.close();
    }
  }

  async lock(): Promise<() => Promise<void>> {
    const filename = path.join(this.root, "worker.lock");
    try {
      const info = await lstat(filename);
      if (!info.isFile() || info.isSymbolicLink() || info.mode & 0o077)
        throw new Error("Unsafe worker lock.");
      const value: unknown = JSON.parse(await readFile(filename, "utf8"));
      if (
        !value ||
        typeof value !== "object" ||
        !("pid" in value) ||
        !Number.isSafeInteger(value.pid) ||
        Number(value.pid) < 1
      )
        throw new Error("Invalid worker lock.");
      try {
        process.kill(Number(value.pid), 0);
      } catch (error: unknown) {
        if (!(
          error instanceof Error &&
          "code" in error &&
          error.code === "ESRCH"
        ))
          throw error;
        await unlink(filename);
      }
    } catch (error: unknown) {
      if (!missing(error)) throw error;
    }
    const handle = await open(filename, "wx", 0o600);
    await handle.writeFile(JSON.stringify({ pid: process.pid }));
    await handle.sync();
    return async (): Promise<void> => {
      await handle.close();
      await unlink(filename);
    };
  }
}
