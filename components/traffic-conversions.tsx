import {
  conversionRate,
  type SessionConversion,
} from "@/lib/traffic-conversion";

export function TrafficConversions({
  rows,
  label,
}: {
  rows: SessionConversion[];
  label: string;
}): React.JSX.Element {
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      role="region"
      aria-label={`${label} session conversion`}
    >
      <table>
        <thead>
          <tr>
            <th scope="col">{label}</th>
            <th scope="col">Sessions</th>
            <th scope="col">Clicked Discord</th>
            <th scope="col">Rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              <td>{row.sessions}</td>
              <td>{row.clicked}</td>
              <td>{conversionRate(row.sessions, row.clicked).toFixed(1)}%</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4}>No measured sessions in this period.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
