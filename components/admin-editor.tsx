"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, ImagePlus, Save } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { artwork } from "@/content/artwork";

export interface EditorField {
  name: string;
  label: string;
  type?:
    | "text"
    | "textarea"
    | "select"
    | "checkbox"
    | "number"
    | "password"
    | "email"
    | "url"
    | "choices"
    | "file";
  options?: readonly (string | { value: string; label: string })[];
  required?: boolean;
  hint?: string;
  full?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
}
export type EditorValues = Record<
  string,
  string | number | boolean | string[] | null
>;

export function AdminEditor({
  endpoint,
  fields,
  values,
  multipart = false,
  label = "Save changes",
  returnTo,
  preview = false,
}: {
  endpoint: string;
  fields: EditorField[];
  values: EditorValues;
  multipart?: boolean;
  label?: string;
  returnTo?: string;
  preview?: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState(
    "/images/discord-welcome.png",
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [previewText, setPreviewText] = useState<string | null>(null);
  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    const form = new FormData(event.currentTarget);
    const body: EditorValues = { ...values };
    for (const field of fields) {
      if (field.type === "file") continue;
      body[field.name] =
        field.type === "checkbox"
          ? form.get(field.name) === "on"
          : field.type === "choices"
            ? form.getAll(field.name).map(String)
            : field.type === "number"
              ? Number(form.get(field.name))
              : String(form.get(field.name) ?? "");
    }
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: multipart ? undefined : { "Content-Type": "application/json" },
        body: multipart ? form : JSON.stringify(body),
      });
      const result = (await response.json()) as { error?: string; id?: string };
      if (!response.ok)
        throw new Error(result.error || "Changes could not be saved.");
      setSaved(true);
      router.refresh();
      if (returnTo) router.push(returnTo);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connection failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="admin-editor" onSubmit={submit}>
      <fieldset disabled={busy}>
        <div className="form-grid">
          {fields.map((field) => {
            const value = values[field.name];
            if (field.type === "checkbox")
              return (
                <label
                  className={`checkbox-label ${field.full ? "full" : ""}`}
                  key={field.name}
                >
                  <input
                    name={field.name}
                    type="checkbox"
                    defaultChecked={Boolean(value)}
                  />
                  {field.label}
                </label>
              );
            if (field.type === "choices")
              return (
                <fieldset className={field.full ? "full" : ""} key={field.name}>
                  <legend>{field.label}</legend>
                  <div className="checkbox-grid">
                    {field.options?.map((option) => {
                      const optionValue =
                        typeof option === "string" ? option : option.value;
                      return (
                        <label key={optionValue}>
                          <input
                            name={field.name}
                            value={optionValue}
                            type="checkbox"
                            defaultChecked={
                              Array.isArray(value) &&
                              value.includes(optionValue)
                            }
                          />
                          {typeof option === "string" ? option : option.label}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              );
            return (
              <label
                className={`field ${field.full ? "full" : ""}`}
                key={field.name}
              >
                <span>{field.label}</span>
                {field.type === "textarea" ? (
                  <textarea
                    name={field.name}
                    defaultValue={typeof value === "string" ? value : ""}
                    required={field.required}
                    rows={field.name === "content" ? 22 : 5}
                    className={
                      field.name === "content" ? "content-editor" : undefined
                    }
                    maxLength={field.maxLength}
                  />
                ) : field.type === "select" ? (
                  <select
                    name={field.name}
                    aria-label={field.label}
                    defaultValue={String(value ?? "")}
                    required={field.required}
                  >
                    {field.options?.map((option) => (
                      <option
                        key={typeof option === "string" ? option : option.value}
                        value={
                          typeof option === "string" ? option : option.value
                        }
                      >
                        {typeof option === "string" ? option : option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "file" ? (
                  <input
                    name={field.name}
                    type="file"
                    accept=".zip,application/zip"
                    required={field.required}
                  />
                ) : (
                  <input
                    name={field.name}
                    type={field.type || "text"}
                    defaultValue={
                      typeof value === "string" || typeof value === "number"
                        ? value
                        : ""
                    }
                    required={field.required}
                    maxLength={field.maxLength}
                    min={field.min}
                    max={field.max}
                    autoComplete={
                      field.type === "password" ? "new-password" : undefined
                    }
                  />
                )}
                {field.hint && <small>{field.hint}</small>}
              </label>
            );
          })}
        </div>
      </fieldset>
      {preview && (
        <details className="article-media-picker">
          <summary>Article images</summary>
          <div className="form-actions">
            <label className="field">
              <span>Approved image</span>
              <select
                aria-label="Approved image"
                value={selectedImage}
                onChange={(event) => setSelectedImage(event.target.value)}
              >
                {Object.entries(artwork).map(([src, asset]) => (
                  <option key={src} value={src}>
                    {asset.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={(event) => {
                const input =
                  event.currentTarget.form?.elements.namedItem("content");
                const asset = artwork[selectedImage];
                if (!(input instanceof HTMLTextAreaElement) || !asset) return;
                input.setRangeText(
                  `\n\n![${asset.alt}](${selectedImage})\n\n`,
                  input.selectionStart,
                  input.selectionEnd,
                  "end",
                );
                input.focus();
                if (previewText !== null) setPreviewText(input.value);
              }}
            >
              <ImagePlus size={16} /> Insert image
            </button>
          </div>
        </details>
      )}
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      {saved && (
        <div className="form-success" role="status">
          <Check size={16} /> Changes saved.
        </div>
      )}
      <div className="form-actions">
        <button className="button primary" disabled={busy}>
          <Save size={16} />
          {busy ? "Saving..." : label}
        </button>
        {preview && (
          <button
            type="button"
            className="button secondary"
            onClick={(event) => {
              const form = event.currentTarget.form;
              if (form)
                setPreviewText(
                  previewText === null
                    ? String(new FormData(form).get("content") || "")
                    : null,
                );
            }}
          >
            <Eye size={16} />
            {previewText === null ? "Preview article" : "Close preview"}
          </button>
        )}
      </div>
      {previewText !== null && (
        <section className="section">
          <h2>Article preview</h2>
          <Markdown contents editorial>
            {previewText}
          </Markdown>
        </section>
      )}
    </form>
  );
}
