"use client";
import { RefreshCw } from "lucide-react";

export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}): React.JSX.Element {
  return (
    <div className="container error-page" id="main-content">
      <p className="eyebrow">Connection interrupted</p>
      <h1>We couldn&apos;t load this page.</h1>
      <p>
        The page could not finish loading. Check the current event before
        repeating a submission.
      </p>
      <div className="button-row">
        <button type="button" className="button primary" onClick={retry}>
          <RefreshCw size={17} />
          Try again
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={() => window.location.reload()}
        >
          <RefreshCw size={17} />
          Reload page
        </button>
      </div>
    </div>
  );
}
