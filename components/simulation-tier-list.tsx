"use client";

import { useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronDown,
  Download,
  Search,
  Table2,
} from "lucide-react";
import { rankSimulationBuilds } from "@/lib/simulation-evidence-schema";
import {
  buildsForTierScenario,
  tierScenarios,
} from "@/lib/simulation-tier-evidence";
import type { TierScenario } from "@/lib/simulation-tier-schema";
import { simulationClassProfiles } from "@/content/simulation-class-profiles";

const tiers = ["S", "A", "B", "C", "D"] as const;
function date(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
const buildIcons: Readonly<Record<string, string>> = {
  "fury-horde": "spell_nature_bloodlust",
  "arms-alliance": "ability_warrior_savageblow",
  "two-hand-fury-static": "ability_whirlwind",
  "rogue-combat-static": "ability_warrior_punishingblow",
  "rogue-mutilate-static": "ability_rogue_deadlybrew",
  "rogue-subtlety-static": "spell_shadow_possession",
  "hunter-beast-mastery-static": "ability_druid_ferociousbite",
  "hunter-marksmanship-static": "ability_trueshot",
  "hunter-survival-static": "ability_hunter_pet_tallstrider",
  "balance-static": "spell_nature_forceofnature",
  "feral-cat-static": "ability_hunter_pet_cat",
  "mage-frost-static": "spell_frost_frostbolt02",
  "mage-fire-static": "spell_fire_firebolt",
  "mage-arcane-static": "spell_arcane_blast",
  "warlock-demonology-static": "spell_shadow_metamorphosis",
  "warlock-affliction-static": "spell_shadow_unstableaffliction_2",
  "priest-shadow-static": "spell_shadow_shadowform",
  "priest-smite-static": "spell_holy_searinglightpriest",
  "shaman-elemental-static": "spell_shaman_lavaburst",
  "shaman-stormcaller-static": "spell_nature_lightningoverload",
  "shaman-enhancement-static": "ability_shaman_stormstrike",
};
export function SimulationTierList({
  scenario = "raid",
  scenarioHrefs = {
    raid: "?scenario=raid#dps-rankings",
    solo: "?scenario=solo#dps-rankings",
  },
  assetBase = "/images",
  dataBase = "/data/simulation-guides",
}: {
  scenario?: TierScenario;
  scenarioHrefs?: Readonly<Record<TierScenario, string>>;
  assetBase?: string;
  dataBase?: string;
}): React.JSX.Element {
  const [query, setQuery] = useState(""),
    [classKey, setClassKey] = useState(""),
    [selectedBuildId, setSelectedBuildId] = useState(""),
    id = useId();
  const snapshot = tierScenarios[scenario];
  const ranked = rankSimulationBuilds(buildsForTierScenario(snapshot)),
    needle = query.trim().toLowerCase(),
    visible = ranked.filter(
      (build) =>
        (!classKey || build.classKey === classKey) &&
        `${build.name} ${build.classKey}`.toLowerCase().includes(needle),
    ),
    selected =
      visible.find((build) => build.id === selectedBuildId) ?? visible[0],
    selectedProfile = simulationClassProfiles.find(
      (profile) => profile.key === selected?.classKey,
    );
  return (
    <section
      className="simulation-guide simulation-tier"
      aria-label="Measured DPS rankings"
      data-tier-scenario={scenario}
      id="dps-rankings"
    >
      <header className="sim-board-heading">
        <div>
          <span className="sim-eyebrow">
            Level 60 · Pre-raid · Single target
          </span>
          <h3>
            WoW Forever {scenario === "raid" ? "Raid" : "Solo"} DPS Tier List
          </h3>
        </div>
        <span className="sim-board-sample">
          <strong>
            {ranked
              .reduce((sum, build): number => sum + build.iterations, 0)
              .toLocaleString("en-US")}
          </strong>
          benchmark fights
        </span>
      </header>
      <nav className="sim-scenario-nav" aria-label="DPS benchmark scenario">
        <Link
          href={scenarioHrefs.raid}
          aria-current={scenario === "raid" ? "page" : undefined}
        >
          Raid DPS
        </Link>
        <Link
          href={scenarioHrefs.solo}
          aria-current={scenario === "solo" ? "page" : undefined}
        >
          Solo DPS
        </Link>
      </nav>
      <p className="sim-notice">
        {scenario === "raid"
          ? "Shared raid buffs and boss debuffs. No world buffs or external Power Infusion/Innervate."
          : "Your own maintained class buffs, pet and modeled abilities only. No outside buffs, boss debuffs or mana grants."}{" "}
        Same builds, same boss, same rotations—not separately optimized solo
        builds or a survivability ranking.
      </p>
      <div className="sim-tier-controls">
        <label className="sim-search" htmlFor={`${id}-search`}>
          <Search size={17} />
          <span className="sr-only">Search class or build</span>
          <input
            id={`${id}-search`}
            type="search"
            maxLength={100}
            value={query}
            onChange={(event): void => setQuery(event.target.value)}
            placeholder="Search class or build"
          />
        </label>
        <label htmlFor={`${id}-class`}>
          <span className="sr-only">Filter by class</span>
          <select
            id={`${id}-class`}
            value={classKey}
            onChange={(event): void => setClassKey(event.target.value)}
          >
            <option value="">All classes</option>
            {simulationClassProfiles
              .filter((profile) =>
                ranked.some((build) => build.classKey === profile.key),
              )
              .map((profile) => (
                <option key={profile.key} value={profile.key}>
                  {profile.name}
                </option>
              ))}
          </select>
        </label>
      </div>
      <p role="status" className="sim-result-count">
        {visible.length} of {ranked.length} builds
      </p>
      <div className="sim-tier-board" aria-label="DPS tier board">
        {tiers.map((tier) => {
          const builds = visible.filter((build) => build.tier === tier);
          return (
            <section
              key={tier}
              className={`sim-tier-row sim-band-${tier}`}
              aria-labelledby={`${id}-tier-${tier}`}
            >
              <div className="sim-tier-label">
                <strong id={`${id}-tier-${tier}`}>
                  <span className="sr-only">Tier </span>
                  {tier}
                </strong>
                <small>{builds.length}</small>
              </div>
              <div
                className="sim-tier-tiles"
                role="list"
                aria-label={`${tier} tier builds`}
              >
                {builds.map((build) => {
                  const profile = simulationClassProfiles.find(
                    (profile) => profile.key === build.classKey,
                  )!;
                  return (
                    <div
                      key={build.id}
                      role="listitem"
                      className="sim-tier-entry"
                    >
                      <button
                        className="sim-tier-tile"
                        type="button"
                        aria-label={`${build.name} ${profile.name}: ${build.dps.toFixed(1)} DPS, tier ${tier}`}
                        aria-pressed={selected?.id === build.id}
                        aria-controls={`${id}-build-preview`}
                        title={`${build.name} · ${profile.name}\n${build.dps.toFixed(1)} DPS · #${build.rank}\nMeasured ${date(build.measuredAt)}`}
                        data-tier-build={build.id}
                        style={
                          {
                            "--sim-class": profile.color,
                          } as React.CSSProperties
                        }
                        onClick={(): void => setSelectedBuildId(build.id)}
                      >
                        <span className="sim-tile-art">
                          <Image
                            src={`${assetBase}/simulation-icons/${buildIcons[build.id] ?? `class_${build.classKey}`}.jpg`}
                            alt=""
                            width={80}
                            height={80}
                            unoptimized
                          />
                          <Image
                            className="sim-tile-class"
                            src={`${assetBase}/simulation-icons/class_${build.classKey}.jpg`}
                            alt=""
                            width={22}
                            height={22}
                            unoptimized
                          />
                          <span className="sim-tile-dps">
                            <strong>{build.dps.toFixed(1)}</strong>{" "}
                            <small>DPS</small>
                          </span>
                        </span>
                        <span className="sim-tile-name">
                          {build.name.replace(" melee-weave", "")}
                        </span>
                        {build.name.includes("melee-weave") && (
                          <small className="sim-tile-variant">
                            Melee-weave
                          </small>
                        )}
                      </button>
                    </div>
                  );
                })}
                {builds.length === 0 && (
                  <span className="sim-tier-empty">
                    {query || classKey
                      ? "No matching builds"
                      : "No measured builds"}
                  </span>
                )}
              </div>
            </section>
          );
        })}
      </div>
      {selected && selectedProfile && (
        <div
          className="sim-build-preview"
          id={`${id}-build-preview`}
          style={
            { "--sim-class": selectedProfile.color } as React.CSSProperties
          }
        >
          <div className="sim-preview-identity">
            <Image
              src={`${assetBase}/simulation-icons/class_${selected.classKey}.jpg`}
              alt=""
              width={34}
              height={34}
              unoptimized
            />
            <div aria-live="polite" aria-atomic="true">
              <strong>{selected.name}</strong>
              <small>
                {selectedProfile.name} · {selected.treePoints.join(" / ")} · #
                {selected.rank}
              </small>
            </div>
          </div>
          <div className="sim-preview-result">
            <strong>
              {selected.dps.toFixed(1)} <small>DPS</small>
            </strong>
            <small>
              ± {selected.monteCarlo95.toFixed(1)} · {date(selected.measuredAt)}
            </small>
          </div>
          <a href={selected.benchmarkHref}>
            Open exact {scenario === "raid" ? "Raid" : "Solo"} setup{" "}
            <ArrowUpRight size={16} />
          </a>
        </div>
      )}
      <div className="sim-tier-facts">
        <span>
          {ranked.length} builds /{" "}
          {new Set(ranked.map((build) => build.classKey)).size} classes
        </span>
        <span>Level 60 vs 63</span>
        <span>300 seconds</span>
        <span>5,000 fights each</span>
      </div>
      <p className="sim-notice">
        Each scenario was measured separately: 5,000 fights per published build.
        Self/raid support is assumed maintained, with stacking and effects
        determined by the pinned engine. These are level-60 damage benchmarks,
        not farming or level-30 dungeon performance. Four newer research builds
        await matching public simulator publication.
      </p>
      {visible.length === 0 ? (
        <p className="sim-empty">No builds match these filters.</p>
      ) : (
        <details className="sim-ranking-details">
          <summary>
            <Table2 size={17} /> Detailed DPS rankings
            <ChevronDown size={16} className="sim-details-chevron" />
          </summary>
          <table className="sim-ranking-table">
            <caption>
              {scenario === "raid" ? "Raid" : "Solo"} modeled DPS; plus/minus is
              approximate 95% Monte Carlo sampling error only.
            </caption>
            <thead>
              <tr>
                <th scope="col" aria-label="Rank">
                  #
                </th>
                <th scope="col">Build / class</th>
                <th scope="col">DPS</th>
                <th scope="col">Tier</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((build) => {
                const profile = simulationClassProfiles.find(
                  (profile) => profile.key === build.classKey,
                )!;
                return (
                  <tr key={build.id}>
                    <td>{build.rank}</td>
                    <th scope="row">
                      <a href={build.benchmarkHref} className="sim-rank-name">
                        <Image
                          src={`${assetBase}/simulation-icons/class_${build.classKey}.jpg`}
                          alt=""
                          width={32}
                          height={32}
                          unoptimized
                        />
                        <span>
                          {build.name}
                          <small>
                            {profile.name} · {build.treePoints.join("/")}
                          </small>
                        </span>
                      </a>
                      <div className="sim-rank-track" aria-hidden="true">
                        <span
                          style={{
                            width: `${build.share}%`,
                            background: profile.color,
                          }}
                        />
                      </div>
                      <small className="sim-measured">
                        {date(build.measuredAt)} · {build.share.toFixed(1)}% of
                        leader
                      </small>
                    </th>
                    <td>
                      <strong>{build.dps.toFixed(1)}</strong>
                      <small>± {build.monteCarlo95.toFixed(1)}</small>
                    </td>
                    <td>
                      <span
                        className={`sim-tier-letter sim-band-${build.tier}`}
                      >
                        {build.tier}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </details>
      )}
      <p className="sim-save-warning">
        Tier thresholds: S ≥95%, A ≥85%, B ≥70%, C ≥55%, D below 55% of this
        table&apos;s leader. Editorial bands are not confidence categories or
        recruitment rules.
      </p>
      <a
        className="button"
        href={`${dataBase}/benchmark.${scenario}.json`}
        download
      >
        <Download size={16} /> {scenario === "raid" ? "Raid" : "Solo"} benchmark
        and methodology JSON
      </a>
    </section>
  );
}
