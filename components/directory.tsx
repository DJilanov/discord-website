import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Globe2,
  Shield,
  SlidersHorizontal,
} from "lucide-react";
import type { ForeverGuild } from "@prisma/client";
import {
  CLASSES,
  DAYS,
  FACTIONS,
  PLAYSTYLES,
  REGIONS,
  RULESETS,
} from "@/lib/config";
import { paginationUrl, queryValue, type QueryParams } from "@/lib/directory";

export function FilterSelect({
  name,
  label,
  options,
  value,
}: {
  name: string;
  label: string;
  options: readonly string[];
  value: string;
}): React.JSX.Element {
  return (
    <label className="field">
      <span>{label}</span>
      <select name={name} aria-label={label} defaultValue={value}>
        <option value="">All {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
export function GuildFilters({
  query,
}: {
  query: QueryParams;
}): React.JSX.Element {
  return (
    <form className="filters" action="/guild-recruitment">
      <label className="field search-field">
        <span>Search guilds</span>
        <input
          name="q"
          defaultValue={queryValue(query, "q")}
          placeholder="Guild, realm, or language"
          maxLength={100}
        />
      </label>
      {[
        { name: "region", label: "Regions", options: REGIONS },
        { name: "faction", label: "Factions", options: FACTIONS },
        { name: "ruleset", label: "Activities", options: RULESETS },
        { name: "playstyle", label: "Playstyles", options: PLAYSTYLES },
        { name: "class", label: "Classes", options: CLASSES },
        { name: "day", label: "Raid days", options: DAYS },
      ].map((field) => (
        <FilterSelect
          key={field.name}
          {...field}
          value={queryValue(query, field.name)}
        />
      ))}
      <button className="button primary" type="submit">
        <SlidersHorizontal size={16} />
        Filter
      </button>
      <Link className="button secondary" href="/guild-recruitment">
        Reset
      </Link>
    </form>
  );
}
export function GuildRow({
  guild,
}: {
  guild: ForeverGuild;
}): React.JSX.Element {
  return (
    <article className="guild-row">
      <div className={`guild-sigil ${guild.faction.toLowerCase()}`}>
        <Shield size={27} strokeWidth={1.2} />
      </div>
      <div>
        <div className="guild-meta">
          {guild.featured && <span className="badge">Featured</span>}
          <span>{guild.faction}</span>
          <span>{guild.ruleset}</span>
          <span>{guild.playstyle}</span>
        </div>
        <h3>
          <Link href={`/guilds/${guild.slug}`}>{guild.name}</Link>
        </h3>
        <div className="guild-meta">
          <span>
            <Globe2 size={12} />
            {guild.region} · {guild.realm}
          </span>
          <span>
            <CalendarDays size={12} />
            {guild.raidDays.length
              ? guild.raidDays.map((day) => day.slice(0, 3)).join(", ")
              : "Flexible"}{" "}
            · {guild.raidTime}
          </span>
        </div>
        <p>
          {guild.description.slice(0, 230)}
          {guild.description.length > 230 ? "..." : ""}
        </p>
        <div className="guild-classes">
          <span>Recruiting:</span>
          {guild.recruitingClasses.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>
      <Link className="text-link" href={`/guilds/${guild.slug}`}>
        View guild
        <ArrowUpRight size={16} />
      </Link>
    </article>
  );
}
export function Pagination({
  total,
  page,
  path,
  query,
  size = 12,
}: {
  total: number;
  page: number;
  path: string;
  query: QueryParams;
  size?: number;
}): React.JSX.Element | null {
  if (total <= size && page === 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      {page > 1 && (
        <Link
          className="button secondary"
          href={paginationUrl(path, query, page - 1)}
        >
          <ArrowLeft size={15} />
          Previous
        </Link>
      )}
      <span>
        Page {page} of {Math.max(1, Math.ceil(total / size))}
      </span>
      {page * size < total && (
        <Link
          className="button secondary"
          href={paginationUrl(path, query, page + 1)}
        >
          Next
          <ArrowRight size={15} />
        </Link>
      )}
    </nav>
  );
}
