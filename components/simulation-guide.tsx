"use client";

import { useEffect, useId, useState } from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  ChevronDown,
  Download,
  Search,
  ShieldCheck,
  Table2,
} from "lucide-react";
import { simulationEvidence } from "@/lib/simulation-evidence";
import {
  rankSimulationBuilds,
  type SimulationBuild,
} from "@/lib/simulation-evidence-schema";
import { simulationClassProfiles } from "@/content/simulation-class-profiles";

const slots = [
  "Head",
  "Neck",
  "Shoulders",
  "Back",
  "Chest",
  "Wrists",
  "Hands",
  "Waist",
  "Legs",
  "Feet",
  "Ring 1",
  "Ring 2",
  "Trinket 1",
  "Trinket 2",
  "Main hand",
  "Off hand",
  "Ranged / relic",
];
const tiers = ["S", "A", "B", "C", "D"] as const;
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
  "warlock-ds-ruin-static": "spell_shadow_psychicscream",
  "warlock-destruction-static": "spell_fire_fireball",
  "priest-shadow-static": "spell_shadow_shadowform",
  "priest-smite-static": "spell_holy_searinglightpriest",
  "shaman-elemental-static": "spell_shaman_lavaburst",
  "shaman-stormcaller-static": "spell_nature_lightningoverload",
  "shaman-enhancement-static": "ability_shaman_stormstrike",
  "paladin-retribution-static": "inv_sword_08",
  "paladin-shockadin-static": "spell_holy_searinglight",
};
function date(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function Item({
  item,
  assetBase,
}: {
  item: SimulationBuild["gear"][number];
  assetBase: string;
}): React.JSX.Element {
  return (
    <details className="sim-item">
      <summary title={item.stats.join("\n")}>
        {item.id ? (
          <Image
            src={`${assetBase}/simulation-icons/${item.icon}.jpg`}
            alt=""
            width={40}
            height={40}
            unoptimized
          />
        ) : (
          <span className="sim-empty-slot" />
        )}
        <span>
          <small>{slots[item.slot]}</small>
          <strong data-quality={item.quality}>{item.name}</strong>
          <small>{item.id ? item.enchant : "Two-handed / unused slot"}</small>
        </span>
      </summary>
      <div className="sim-item-stats">
        {item.stats.map((stat) => (
          <span key={stat}>{stat}</span>
        ))}
        <p>
          Pinned simulator inputs, not a live-game tooltip. Hit, crit and
          similar inputs retain engine units; current item data and access may
          differ.
        </p>
        {item.id > 0 && (
          <a
            href={`https://kfcguild.online/tools/forever/encyclopedia/items/${item.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open item reference <ArrowUpRight size={14} />
          </a>
        )}
      </div>
    </details>
  );
}

function BuildDetails({
  build,
  assetBase,
  dataBase,
}: {
  build: SimulationBuild;
  assetBase: string;
  dataBase: string;
}): React.JSX.Element {
  return (
    <>
      <div className="sim-build-metrics">
        <div>
          <small>Common benchmark</small>
          <strong>
            {build.dps.toFixed(1)} <span>DPS</span>
          </strong>
          <small>5,000 fights · {date(build.measuredAt)}</small>
        </div>
        <div>
          <small>Original build reference</small>
          <strong>
            {build.referenceDps.toFixed(1)} <span>DPS</span>
          </strong>
          <small>
            {build.referenceIterations.toLocaleString("en-US")} validation
            fights · original support
          </small>
        </div>
        <div>
          <small>Talent allocation</small>
          <strong>{build.treePoints.join(" / ")}</strong>
          <small>51 points · level 60</small>
        </div>
      </div>
      <p className="sim-notice">
        The two DPS values use different support/encounter policies. Only the
        common benchmark belongs in the tier list.
      </p>
      <div className="sim-build-actions">
        {build.simulatorHref ? (
          <a
            className="button primary"
            href={build.simulatorHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open tested setup <ArrowUpRight size={16} />
          </a>
        ) : (
          <span className="sim-pending">
            Exact public replay pending deployment
          </span>
        )}
        <a className="button" href={`${dataBase}/${build.id}.json`} download>
          <Download size={16} /> Saved settings
        </a>
      </div>
      <p className="sim-save-warning">
        Save your current simulator character first. Loading replaces the saved
        setup; never silently substitute another engine.
      </p>
      <h3>Talents in the tested build</h3>
      <p>
        These are the allocated ranks in the recorded model&apos;s tree order.
        Descriptions are labelled client references, not independent tests
        proving that every point is optimal.
      </p>
      <div className="sim-talents">
        {build.selectedTalents.map((talent) => (
          <details key={`${talent.tree}-${talent.name}`}>
            <summary>
              <Image
                src={`${assetBase}/simulation-icons/${talent.icon}.jpg`}
                alt=""
                width={32}
                height={32}
                unoptimized
              />
              <span>
                <strong>{talent.name}</strong>
                <small>
                  {talent.tree} · {talent.rank}/{talent.max}
                </small>
              </span>
            </summary>
            <p>{talent.description}</p>
            <small>
              {talent.confirmed
                ? "Confirmed client-reference rank"
                : "Tooltip confirmation pending"}
            </small>
          </details>
        ))}
      </div>
      <h3>The recorded rotation</h3>
      <p>{build.scenario}</p>
      <p>
        Read from the top. Use the first available action whose conditions hold,
        then start again. These are recorded model instructions, not a
        separately tested simplified rotation.
      </p>
      {build.prepull.length > 0 && (
        <>
          <h4>Before the pull</h4>
          <ul>
            {build.prepull.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      )}
      <ol className="sim-priorities">
        {build.priorities.map((line, index) => (
          <li key={`${index}-${line}`}>{line}</li>
        ))}
      </ol>
      {build.disabled.length > 0 && (
        <details className="sim-evidence-details">
          <summary>Explicitly disabled in this setup</summary>
          <ul>
            {build.disabled.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      )}
      <h3>The tested equipment</h3>
      <p>
        One complete loadout, with its recorded enchants. Not independent
        per-slot BiS rankings.
      </p>
      <div className="sim-gear">
        {build.gear.map((item) => (
          <Item key={item.slot} item={item} assetBase={assetBase} />
        ))}
      </div>
      <details className="sim-evidence-details">
        <summary>Talents, race, consumes and exact options</summary>
        <p>Talent string, in the model&apos;s tree order:</p>
        <code>{build.talents}</code>
        {build.options.map((option) => (
          <pre key={option}>{option}</pre>
        ))}
      </details>
      <details className="sim-evidence-details">
        <summary>Assumptions, limitations and source hashes</summary>
        <ul>
          {[...build.caveats, ...build.warnings].map((line, index) => (
            <li key={`${index}-${line}`}>{line}</li>
          ))}
        </ul>
        <dl>
          {Object.entries({
            "Presentation release": build.release,
            "Engine SHA-256": build.wasmSha256,
            "Catalog SHA-256": build.databaseSha256,
            "Publication SHA-256": build.publicationSha256,
            "Rotation SHA-256": build.rotationSha256,
            "Benchmark request": build.requestSha256,
            "Benchmark response": build.responseSha256,
          }).map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                <code>{value}</code>
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </>
  );
}

export function SimulationGuide({
  classKey,
  assetBase = "/images",
  dataBase = "/data/simulation-guides",
}: {
  classKey: string;
  assetBase?: string;
  dataBase?: string;
}): React.JSX.Element | null {
  const profile = simulationClassProfiles.find(
      (profile) => profile.key === classKey,
    ),
    builds = simulationEvidence.builds.filter(
      (build) => build.classKey === classKey,
    );
  const [selected, setSelected] = useState(builds[0]?.id ?? "");
  useEffect((): (() => void) => {
    const selectLinkedBuild = (): void => {
      const linked = simulationEvidence.builds.find(
        (build) =>
          build.classKey === classKey &&
          window.location.hash === `#build-${build.id}`,
      );
      if (linked) setSelected(linked.id);
    };
    selectLinkedBuild();
    window.addEventListener("hashchange", selectLinkedBuild);
    return (): void =>
      window.removeEventListener("hashchange", selectLinkedBuild);
  }, [classKey]);
  if (!profile || !builds.length) return null;
  const active = builds.some((build) => build.id === selected)
    ? selected
    : builds[0].id;
  return (
    <section
      className="simulation-guide"
      aria-label={`${profile.name} tested builds`}
      style={{ "--sim-class": profile.color } as React.CSSProperties}
    >
      <header className="sim-class-heading">
        <Image
          src={`${assetBase}/simulation-icons/class_${classKey}.jpg`}
          alt=""
          width={56}
          height={56}
          unoptimized
        />
        <div>
          <span className="sim-eyebrow">Level 60 · pre-raid references</span>
          <h3>{profile.name} build notebook</h3>
        </div>
      </header>
      <div className="sim-spec-picker" role="group" aria-label="Tested build">
        {builds.map((build) => (
          <button
            key={build.id}
            type="button"
            aria-pressed={active === build.id}
            onClick={(): void => setSelected(build.id)}
          >
            {build.name}
          </button>
        ))}
      </div>
      {builds.map((build) => (
        <div
          key={build.id}
          hidden={active !== build.id}
          className="sim-build-panel"
          data-build={build.id}
          id={`build-${build.id}`}
        >
          <h3 className="sim-selected-name">{build.name}</h3>
          <BuildDetails
            build={build}
            assetBase={assetBase}
            dataBase={dataBase}
          />
        </div>
      ))}
      <p className="sim-source">
        <ShieldCheck size={16} /> Client reference{" "}
        {simulationEvidence.clientBuild}.{" "}
        {simulationEvidence.license.attribution} (
        <a
          href={simulationEvidence.license.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {simulationEvidence.license.id}
        </a>
        ). Model and gameplay validation remain distinct.
      </p>
    </section>
  );
}

export function SimulationTierList({
  assetBase = "/images",
  dataBase = "/data/simulation-guides",
}: {
  assetBase?: string;
  dataBase?: string;
}): React.JSX.Element {
  const [query, setQuery] = useState(""),
    [classKey, setClassKey] = useState(""),
    [selectedBuildId, setSelectedBuildId] = useState(""),
    id = useId();
  const ranked = rankSimulationBuilds(simulationEvidence.builds),
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
    >
      <header className="sim-board-heading">
        <div>
          <span className="sim-eyebrow">
            Level 60 · Pre-raid · Single target
          </span>
          <h3>WoW Forever DPS Tier List</h3>
        </div>
        <span className="sim-board-sample">
          <strong>125,000</strong>
          benchmark fights
        </span>
      </header>
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
            {simulationClassProfiles.map((profile) => (
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
          <a
            href={`/guides/wow-forever-${selected.classKey}-dps-guide#build-${selected.id}`}
          >
            Talents & rotation <ArrowUpRight size={16} />
          </a>
        </div>
      )}
      <div className="sim-tier-facts">
        <span>25 builds / 9 classes</span>
        <span>Level 60 vs 63</span>
        <span>300 seconds</span>
        <span>5,000 fights each</span>
      </div>
      <p className="sim-notice">
        Single target, full-v2 support, no external debuffs. Selected pre-raid
        loadouts; not level-30 dungeon performance or guaranteed launch balance.
        Measurement dates are shown per build.
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
              Common-policy modeled DPS; plus/minus is approximate 95% Monte
              Carlo sampling error only.
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
                      <a
                        href={`/guides/wow-forever-${build.classKey}-dps-guide#build-${build.id}`}
                        className="sim-rank-name"
                      >
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
      <a className="button" href={`${dataBase}/benchmark.json`} download>
        <Download size={16} /> Benchmark and methodology JSON
      </a>
    </section>
  );
}
