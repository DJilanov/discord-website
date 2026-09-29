"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({
  text,
  label = "Copy link",
}: {
  text: string;
  label?: string;
}): React.JSX.Element {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("error");
    }
  }
  return (
    <span className="copy-control">
      <button type="button" className="button secondary" onClick={copy}>
        {state === "copied" ? <Check size={16} /> : <Copy size={16} />}
        {state === "copied" ? "Copied" : label}
      </button>
      <span
        role="status"
        className={state === "error" ? "form-error" : "sr-only"}
      >
        {state === "error"
          ? "Clipboard unavailable. Select the displayed link to copy it."
          : state === "copied"
            ? "Copied to clipboard"
            : ""}
      </span>
    </span>
  );
}
