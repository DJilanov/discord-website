"use client";

import Image from "next/image";
import { useState, type CSSProperties, type ReactNode } from "react";
import { Check, Heart, Shield, Swords, Users } from "lucide-react";
import type {
  CharacterView,
  RaidRole,
  SignupRole,
} from "@/lib/raids/contracts";
import {
  classes,
  specializationsByClass,
  type ClassName,
  type Specialization,
} from "@/lib/raids/specializations";
import {
  classArtwork,
  classIcon,
  specializationIcon,
} from "@/lib/raids/presentation";

interface ClassAccentStyle extends CSSProperties {
  "--raid-class-color": string;
}
function classStyle(className: ClassName): ClassAccentStyle {
  return { "--raid-class-color": classArtwork[className].color };
}
function GameIcon({
  src,
  fallback,
}: {
  src: string;
  fallback: string;
}): React.JSX.Element {
  const [failedSource, setFailedSource] = useState("");
  return (
    <Image
      src={failedSource === src ? fallback : src}
      alt=""
      width={56}
      height={56}
      unoptimized
      loading="eager"
      onError={() => setFailedSource(src)}
    />
  );
}

export function CharacterPortrait({
  className,
  specialization,
  compact = false,
}: {
  className: ClassName;
  specialization: Specialization | null;
  compact?: boolean;
}): React.JSX.Element {
  return (
    <span
      className={`raid-portrait${compact ? " compact" : ""}`}
      style={classStyle(className)}
      aria-hidden="true"
    >
      <span className="raid-portrait-main">
        <GameIcon
          src={specializationIcon(className, specialization)}
          fallback={classIcon(className)}
        />
      </span>
      {specialization && (
        <span className="raid-portrait-class">
          <GameIcon
            src={classIcon(className)}
            fallback={classIcon(className)}
          />
        </span>
      )}
    </span>
  );
}

interface ArtworkChoiceProps {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
  icon: ReactNode;
  children: ReactNode;
  variant: "class" | "spec" | "character" | "role";
  className?: ClassName;
}
function ArtworkChoice({
  name,
  value,
  label,
  checked,
  disabled,
  onSelect,
  icon,
  children,
  variant,
  className,
}: ArtworkChoiceProps): React.JSX.Element {
  return (
    <label
      className={`raid-art-choice raid-${variant}-choice`}
      style={className ? classStyle(className) : undefined}
    >
      <input
        type="radio"
        name={name}
        value={value}
        aria-label={label}
        checked={checked}
        onChange={onSelect}
        disabled={disabled}
        required
      />
      <span className="raid-choice-face">
        <span className="raid-choice-art" aria-hidden="true">
          {icon}
        </span>
        <span className="raid-choice-copy">{children}</span>
        <span className="raid-choice-check" aria-hidden="true">
          <Check size={14} />
        </span>
      </span>
    </label>
  );
}

export function ClassPicker({
  value,
  onChange,
  disabled,
}: {
  value: ClassName;
  onChange: (value: ClassName) => void;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <fieldset className="raid-choice-group" disabled={disabled}>
      <legend>Class</legend>
      <div className="raid-class-grid">
        {classes.map((className) => (
          <ArtworkChoice
            key={className}
            name="className"
            value={className}
            label={className}
            checked={value === className}
            onSelect={() => onChange(className)}
            variant="class"
            className={className}
            icon={
              <GameIcon
                src={classIcon(className)}
                fallback={classIcon(className)}
              />
            }
          >
            <strong>{className}</strong>
          </ArtworkChoice>
        ))}
      </div>
    </fieldset>
  );
}

export function SpecializationPicker({
  className,
  value,
  onChange,
  disabled,
  label = "Specialization",
  accessibleLabel,
}: {
  className: ClassName;
  value: Specialization | "";
  onChange: (value: Specialization) => void;
  disabled?: boolean;
  label?: string;
  accessibleLabel?: string;
}): React.JSX.Element {
  return (
    <fieldset
      className="raid-choice-group raid-spec-picker"
      disabled={disabled}
      aria-label={accessibleLabel}
    >
      <legend>{label}</legend>
      <div className="raid-spec-grid">
        {specializationsByClass[className].map((spec) => (
          <ArtworkChoice
            key={spec}
            name="specialization"
            value={spec}
            label={spec}
            checked={value === spec}
            onSelect={() => onChange(spec)}
            variant="spec"
            className={className}
            icon={
              <GameIcon
                src={specializationIcon(className, spec)}
                fallback={classIcon(className)}
              />
            }
          >
            <strong>{spec}</strong>
          </ArtworkChoice>
        ))}
      </div>
    </fieldset>
  );
}

export function RoleIcon({ role }: { role: SignupRole }): React.JSX.Element {
  const Icon =
    role === "participant"
      ? Users
      : role === "tank"
        ? Shield
        : role === "healer"
          ? Heart
          : Swords;
  return <Icon size={18} aria-hidden="true" />;
}
export function RolePicker({
  value,
  onChange,
  disabled,
}: {
  value: RaidRole;
  onChange: (value: RaidRole) => void;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <fieldset className="raid-choice-group" disabled={disabled}>
      <legend>Role</legend>
      <div className="raid-role-grid">
        {(["tank", "healer", "damage"] as const).map((role) => (
          <ArtworkChoice
            key={role}
            name="role"
            value={role}
            label={
              role === "damage"
                ? "Damage"
                : role === "healer"
                  ? "Healer"
                  : "Tank"
            }
            checked={value === role}
            onSelect={() => onChange(role)}
            variant="role"
            icon={<RoleIcon role={role} />}
          >
            <strong>
              {role === "damage"
                ? "Damage"
                : role === "healer"
                  ? "Healer"
                  : "Tank"}
            </strong>
          </ArtworkChoice>
        ))}
      </div>
    </fieldset>
  );
}

export function CharacterPicker({
  characters,
  value,
  onChange,
  disabled,
}: {
  characters: CharacterView[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <fieldset className="raid-choice-group" disabled={disabled}>
      <legend>Character</legend>
      <div className="raid-character-choices">
        {characters.map((character) => (
          <ArtworkChoice
            key={character.id}
            name="characterId"
            value={character.id}
            label={character.name}
            checked={value === character.id}
            onSelect={() => onChange(character.id)}
            variant="character"
            className={character.className}
            icon={
              <CharacterPortrait
                className={character.className}
                specialization={null}
                compact
              />
            }
          >
            <strong>{character.name}</strong>
            <small>{character.className}</small>
          </ArtworkChoice>
        ))}
      </div>
    </fieldset>
  );
}
