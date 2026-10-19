import { LoaderCircle } from "lucide-react";

export default function RaidLoading(): React.JSX.Element {
  return (
    <div className="raid-empty" role="status" aria-busy="true">
      <LoaderCircle size={24} />
      <p className="muted">Loading raid planner...</p>
    </div>
  );
}
