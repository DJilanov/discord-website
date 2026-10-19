import { test } from "node:test";
import assert from "node:assert/strict";
import { stat, readFile } from "node:fs/promises";
import sharp from "sharp";
import { eventArtwork, isEventArtworkFile } from "../lib/raids/event-artwork";
import { raidPresets } from "../lib/raids/games";
import tbc from "../public/images/raids/tbc/manifest.json";

test("All TBC raid presets have distinct, decoded and bounded generated covers", async () => {
  assert.equal(tbc.items.length, 9);
  const prompts = JSON.parse(
    await readFile("docs/tbc-event-artwork-prompts.json", "utf8"),
  ) as { generator: string; prompts: { id: string; prompt: string }[] };
  assert.match(prompts.generator, /Built-in image_gen/);
  const paths = new Set<string>();
  for (const preset of raidPresets.tbc) {
    const cover = eventArtwork("tbc", "raid", preset.name);
    assert.ok(cover.file.startsWith("/images/raids/tbc/"));
    assert.ok(isEventArtworkFile(cover.file));
    paths.add(cover.file);
    const item = tbc.items.find((entry) => entry.label === preset.name);
    assert.ok(item);
    assert.ok(
      prompts.prompts.some(
        (entry) => entry.id === item.id && entry.prompt.length > 300,
      ),
    );
    const path = `public${cover.file}`;
    const image = sharp(path),
      metadata = await image.metadata(),
      stats = await image.stats();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, cover.width);
    assert.equal(metadata.height, cover.height);
    assert.equal((await stat(path)).size, item.bytes);
    assert.ok(item.bytes < 500000);
    assert.ok(stats.channels.some((channel) => channel.stdev > 20));
    for (const alias of item.aliases)
      assert.equal(eventArtwork("tbc", "raid", alias).file, cover.file);
  }
  assert.equal(paths.size, 9);
});
test("Edition-scoped covers prevent TBC/Forever collisions and unsafe paths", () => {
  assert.notEqual(
    eventArtwork("forever", "raid", "Hyjal Summit").file,
    eventArtwork("tbc", "raid", "Hyjal Summit").file,
  );
  assert.equal(
    eventArtwork("tbc", "raid", "SSC").file,
    "/images/raids/tbc/serpentshrine-cavern.webp",
  );
  assert.equal(
    eventArtwork("tbc", "raid", "Gruul’s Lair").file,
    "/images/raids/tbc/gruuls-lair.webp",
  );
  assert.equal(
    eventArtwork("tbc", "dungeon", "The Hall of Thanes").file,
    "/images/raids/events/dungeon.webp",
  );
  assert.equal(
    eventArtwork("tbc", "raid", "Barrow Deeps").file,
    "/images/raids/events/raid.webp",
  );
  assert.equal(
    eventArtwork("tbc", "raid", "../../.env.local").file,
    "/images/raids/events/raid.webp",
  );
  assert.equal(
    isEventArtworkFile("/images/raids/tbc/../../../.env.local"),
    false,
  );
  assert.equal(
    eventArtwork("tbc", "battleground", "Darkspear Islands").file,
    "/images/raids/events/battleground.webp",
  );
  assert.equal(
    eventArtwork("tbc", "battleground", "WSG").file,
    eventArtwork("forever", "battleground", "WSG").file,
  );
});
