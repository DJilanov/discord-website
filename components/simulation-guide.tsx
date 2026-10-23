"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Download, ShieldCheck } from "lucide-react";
import { simulationEvidence } from "@/lib/simulation-evidence";
import { type SimulationBuild } from "@/lib/simulation-evidence-schema";
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
        Solo and Raid comparisons belong in the tier list, using their own exact
        setups.
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
            "Historical comparison request": build.requestSha256,
            "Historical comparison response": build.responseSha256,
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
