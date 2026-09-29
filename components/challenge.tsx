"use client";
import { useEffect, useRef, useState } from "react";
import { Check, RefreshCw, ShieldCheck } from "lucide-react";

export function Challenge({
  onToken,
  resetKey,
}: {
  onToken: (token: string) => void;
  resetKey: number;
}): React.JSX.Element {
  const callback = useRef(onToken);
  const [status, setStatus] = useState<"checking" | "ready" | "failed">(
    "checking",
  );
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    callback.current = onToken;
  }, [onToken]);
  useEffect(() => {
    const controller = new AbortController();
    let worker: Worker | undefined;
    let refresh: ReturnType<typeof setTimeout> | undefined;
    async function prepare(): Promise<void> {
      callback.current("");
      setStatus("checking");
      try {
        const response = await fetch("/api/challenge", {
          method: "POST",
          signal: controller.signal,
        });
        const data = (await response.json()) as {
          challenge?: string;
          difficulty?: number;
        };
        if (!response.ok || !data.challenge || data.difficulty !== 3)
          throw new Error("Verification unavailable");
        if (controller.signal.aborted) return;
        worker = new Worker(new URL("./challenge.worker.ts", import.meta.url));
        worker.onmessage = (event: MessageEvent<{ token: string }>): void => {
          if (controller.signal.aborted) return;
          callback.current(event.data.token);
          setStatus("ready");
          worker?.terminate();
          refresh = setTimeout(
            () => setAttempt((value) => value + 1),
            8 * 60000,
          );
        };
        worker.onerror = (): void => {
          setStatus("failed");
          worker?.terminate();
        };
        worker.postMessage(data);
      } catch {
        if (!controller.signal.aborted) setStatus("failed");
      }
    }
    void prepare();
    return () => {
      controller.abort();
      worker?.terminate();
      if (refresh) clearTimeout(refresh);
    };
  }, [resetKey, attempt]);
  return (
    <div className="submission-check" role="status">
      {status === "ready" ? <Check size={16} /> : <ShieldCheck size={16} />}
      <span>
        {status === "ready"
          ? "Submission check complete"
          : status === "checking"
            ? "Preparing secure submission..."
            : "Submission check unavailable"}
      </span>
      {status === "failed" && (
        <button
          className="icon-button"
          type="button"
          title="Retry submission check"
          aria-label="Retry submission check"
          onClick={() => setAttempt((value) => value + 1)}
        >
          <RefreshCw size={15} />
        </button>
      )}
    </div>
  );
}
