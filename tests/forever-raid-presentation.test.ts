import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import {
  classArtwork,
  classIcon,
  specializationIcon,
} from "../lib/raids/presentation";
import { classes, specializationsByClass } from "../lib/raids/specializations";

test("Every Forever class/spec has explicit local artwork and legacy portraits use class art", async () => {
  const files = new Set<string>();
  for (const className of classes) {
    assert.match(classArtwork[className].color, /^#[a-f0-9]{6}$/);
    assert.deepEqual(
      Object.keys(classArtwork[className].specs).sort(),
      [...specializationsByClass[className]].sort(),
    );
    const icon = classIcon(className);
    assert.equal(specializationIcon(className, null), icon);
    files.add(icon);
    for (const specialization of specializationsByClass[className]) {
      const specIcon = specializationIcon(className, specialization);
      assert.notEqual(specIcon, icon);
      assert.match(specIcon, /^\/images\/raids\/icons\/[a-z0-9_]+\.jpg$/);
      files.add(specIcon);
    }
  }
  for (const file of files) {
    const data = await readFile(`public${file}`);
    const metadata = await sharp(data).metadata();
    assert.equal(metadata.format, "jpeg", file);
    assert.equal(metadata.width, 56, file);
    assert.equal(metadata.height, 56, file);
    assert.ok(data.byteLength < 15000, file);
  }
});
test("Duplicate spec names use class-specific artwork instead of a global spec-name lookup", () => {
  assert.notEqual(
    specializationIcon("Warrior", "Protection"),
    specializationIcon("Paladin", "Protection"),
  );
  assert.notEqual(
    specializationIcon("Druid", "Restoration"),
    specializationIcon("Shaman", "Restoration"),
  );
  assert.equal(specializationIcon("Warrior", "Holy"), classIcon("Warrior"));
});
