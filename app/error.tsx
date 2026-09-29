"use client";
import { RefreshCw } from "lucide-react";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  return (
    <div className="container error-page" id="main-content">
      <p className="eyebrow">Connection interrupted</p>
      <h1>We couldn&apos;t load this page.</h1>
      <p>
        The community hub is temporarily unavailable. Your submitted data has
        not been changed by this error.
      </p>
      <button className="button primary" onClick={reset}>
        <RefreshCw size={17} />
        Try again
      </button>
    </div>
  );
}
