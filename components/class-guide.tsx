"use client";

import { useId, useState } from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  ListChecks,
  ShieldCheck,
  Swords,
} from "lucide-react";
import { getClassGuide } from "@/content/class-guides";
import evidence from "@/content/class-guide-evidence.json";
import { toolsBase } from "@/content/community-tools";

type GuideEvidence = (typeof evidence.classes)[number];
type TalentEvidence = GuideEvidence["talents"][number];

function GuideIcon({
  icon,
  assetBase,
}: {
  icon: string;
  assetBase: string;
}): React.JSX.Element {
  return (
    <Image
      src={`${assetBase}/${icon}.jpg`}
      alt=""
      width={44}
      height={44}
      unoptimized
    />
  );
}

function TalentDetail({
  talent,
  purpose,
  tradeoff,
  assetBase,
}: {
  talent: TalentEvidence;
  purpose: string;
  tradeoff: string;
  assetBase: string;
}): React.JSX.Element {
  const [rank, setRank] = useState(talent.ranks.length);
  const id = useId();
  return (
    <details className="class-guide-talent">
      <summary>
        <GuideIcon icon={talent.icon} assetBase={assetBase} />
        <span>
          <strong>{talent.name}</strong>
          <small>
            {talent.tree} · Row {talent.row} · {talent.ranks.length}{" "}
            {talent.ranks.length === 1 ? "rank" : "ranks"}
          </small>
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </summary>
      <div className="class-guide-talent-body">
        <label className="class-guide-rank" htmlFor={id}>
          Tooltip rank
          <select
            id={id}
            value={rank}
            onChange={(event): void => setRank(Number(event.target.value))}
          >
            {talent.ranks.map((_, index) => (
              <option key={index} value={index + 1}>
                {index + 1} / {talent.ranks.length}
              </option>
            ))}
          </select>
        </label>
        <p className="class-guide-tooltip">{talent.ranks[rank - 1]}</p>
        <h4>Why consider it</h4>
        <p>{purpose}</p>
        <h4>The trade-off</h4>
        <p>{tradeoff}</p>
      </div>
    </details>
  );
}

export function ClassGuide({
  guideKey,
  assetBase = "/images/guide-icons",
}: {
  guideKey: string;
  assetBase?: string;
}): React.JSX.Element | null {
  const content = getClassGuide(guideKey);
  const source = evidence.classes.find((entry) => entry.key === guideKey);
  if (!content || !source) return null;
  return (
    <ClassGuideBody
      key={guideKey}
      content={content}
      source={source}
      assetBase={assetBase}
    />
  );
}

function ClassGuideBody({
  content,
  source,
  assetBase,
}: {
  content: NonNullable<ReturnType<typeof getClassGuide>>;
  source: GuideEvidence;
  assetBase: string;
}): React.JSX.Element {
  const id = useId();
  const [level, setLevel] = useState(20);
  const [scenarioId, setScenarioId] = useState(content.scenarios[0].id);
  const [learned, setLearned] = useState<string[]>([]);
  const [ready, setReady] = useState<number[]>([]);
  const scenario =
    content.scenarios.find((entry) => entry.id === scenarioId) ??
    content.scenarios[0];
  const spellByName = new Map(
    source.spells.map((spell) => [spell.name, spell]),
  );
  const steps = scenario.steps.filter((step) => {
    const spell = spellByName.get(step.spell);
    return (
      spell &&
      spell.level <= level &&
      (!spell.talented || learned.includes(spell.name))
    );
  });
  const unlocks = source.spells.filter((spell) => spell.talented);
  const talentPath = `${toolsBase}/forever/encyclopedia/talents/${content.className.toLowerCase()}`;
  return (
    <section
      className={`class-guide class-guide-${content.className.toLowerCase()}`}
      aria-label={content.title}
    >
      <header className="class-guide-header">
        <GuideIcon icon={source.icon} assetBase={assetBase} />
        <div>
          <span className="class-guide-eyebrow">
            {content.className} / {content.role}
          </span>
          <h3>{content.title}</h3>
        </div>
      </header>
      <p className="class-guide-intro">{content.introduction}</p>
      <p className="class-guide-evidence">
        <BookOpen size={16} aria-hidden="true" /> Beta reference{" "}
        {evidence.snapshot.build} · {evidence.snapshot.generated}. Draft
        priorities; gameplay review pending.
      </p>

      <div className="class-guide-section-heading">
        <BookOpen size={20} aria-hidden="true" />
        <h3>Talents, explained</h3>
      </div>
      <div className="class-guide-talents">
        {content.talents.map((talent) => {
          const record = source.talents.find(
            (entry) => entry.name === talent.name,
          );
          return record ? (
            <TalentDetail
              key={record.name}
              talent={record}
              purpose={talent.purpose}
              tradeoff={talent.tradeoff}
              assetBase={assetBase}
            />
          ) : null;
        })}
      </div>
      <a
        className="class-guide-calculator"
        href={talentPath}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open the full talent calculator{" "}
        <ArrowUpRight size={16} aria-hidden="true" />
      </a>

      <div className="class-guide-section-heading">
        <Swords size={20} aria-hidden="true" />
        <h3>Combat priorities</h3>
      </div>
      <div className="class-guide-level">
        <label htmlFor={`${id}-level`}>
          Character level <output>{level}</output>
        </label>
        <input
          id={`${id}-level`}
          type="range"
          min={10}
          max={60}
          value={level}
          onChange={(event): void => setLevel(Number(event.target.value))}
        />
      </div>
      {unlocks.length > 0 && (
        <fieldset className="class-guide-unlocks">
          <legend>Talented abilities you have learned</legend>
          {unlocks.map((spell) => (
            <label key={spell.name}>
              <input
                type="checkbox"
                disabled={spell.level > level}
                checked={learned.includes(spell.name)}
                onChange={(event): void =>
                  setLearned(
                    event.target.checked
                      ? [...learned, spell.name]
                      : learned.filter((name) => name !== spell.name),
                  )
                }
              />
              <span>
                {spell.name}
                <small>Level {spell.level}+ and the required talent</small>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      <div
        className="class-guide-modes"
        role="group"
        aria-label="Combat situation"
      >
        {content.scenarios.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-pressed={scenario.id === entry.id}
            onClick={(): void => setScenarioId(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <p className="class-guide-scenario">{scenario.summary}</p>
      <p className="class-guide-note">
        First available ranks are filtered by level; this does not verify your
        training or a legal talent allocation. Use your actual spellbook. These
        are conditional decisions, not a fixed cast loop.
      </p>
      <ol
        className="class-guide-priorities"
        aria-live="polite"
        aria-label={`${scenario.label} priorities`}
      >
        {steps.map((step, index) => {
          const spell = spellByName.get(step.spell)!;
          const ranks = spell.ranks.filter((rank) => rank.level <= level);
          const rank = ranks[ranks.length - 1];
          return (
            <li key={step.spell}>
              <span className="class-guide-step" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="class-guide-action">
                <div className="class-guide-action-heading">
                  <GuideIcon icon={spell.icon} assetBase={assetBase} />
                  <div>
                    <strong>{spell.name}</strong>
                    <small>
                      {rank.rank || "Unranked"} · available from level{" "}
                      {rank.level}
                      {spell.talented ? " · talented" : ""}
                    </small>
                  </div>
                </div>
                <p>
                  <strong>When:</strong> {step.when}
                </p>
                <p>{step.reason}</p>
                <details className="class-guide-spell">
                  <summary>
                    Spell reference <ChevronDown size={14} aria-hidden="true" />
                  </summary>
                  <p>{rank.description}</p>
                  <small>{rank.lines.flat().filter(Boolean).join(" · ")}</small>
                </details>
              </div>
            </li>
          );
        })}
      </ol>
      {steps.length === 0 && (
        <p role="status" className="class-guide-empty">
          No learned actions from this scenario match the current selection.
          Review your level and available talented abilities before using this
          outline.
        </p>
      )}

      <div className="class-guide-section-heading">
        <ShieldCheck size={20} aria-hidden="true" />
        <h3>When the plan goes wrong</h3>
      </div>
      <div className="class-guide-problems">
        {content.mistakes.map((mistake) => (
          <details key={mistake.problem}>
            <summary>
              {mistake.problem}
              <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <p>{mistake.response}</p>
          </details>
        ))}
      </div>
      <div className="class-guide-section-heading">
        <ListChecks size={20} aria-hidden="true" />
        <h3>Before the first pull</h3>
        <span className="class-guide-completed" role="status">
          {ready.length}/{content.preparation.length}
        </span>
      </div>
      <div className="class-guide-checklist">
        {content.preparation.map((text, index) => (
          <label key={text}>
            <input
              type="checkbox"
              checked={ready.includes(index)}
              onChange={(event): void =>
                setReady(
                  event.target.checked
                    ? [...ready, index]
                    : ready.filter((item) => item !== index),
                )
              }
            />
            <span>{text}</span>
          </label>
        ))}
      </div>
      <footer className="class-guide-source">
        Talent and spell text adapted from{" "}
        <a
          href={evidence.source.homepage}
          target="_blank"
          rel="noopener noreferrer"
        >
          Talents Forever
        </a>
        ,{" "}
        <a
          href={evidence.license.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          CC BY 4.0
        </a>
        , through the{" "}
        <a href={evidence.sourceUrl} target="_blank" rel="noopener noreferrer">
          published Tools snapshot
        </a>
        . Explanations and priorities: Open source contributors. Reference{" "}
        {evidence.snapshot.checksum.slice(0, 12)}.
      </footer>
    </section>
  );
}
