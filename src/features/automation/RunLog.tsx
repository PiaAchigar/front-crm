import { useRuns } from "./useAutomations";
import { formatDateTime } from "../../lib/format";

export function RunLog() {
  const { data: runs = [], isLoading, isError } = useRuns();

  if (isLoading) return <p className="text-sm text-ink-soft">Cargando registro…</p>;
  if (isError) return <p className="text-sm text-red-600">No pudimos cargar el registro.</p>;
  if (runs.length === 0) return <p className="text-sm text-ink-soft">Todavía no se ejecutó ninguna regla.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-ink-soft">
          <tr>
            <th className="p-2">Regla</th>
            <th className="p-2">Disparador</th>
            <th className="p-2">Estado</th>
            <th className="p-2">Detalle</th>
            <th className="p-2">Cuándo</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id} className="border-t border-surface-high">
              <td className="p-2">{r.ruleName ?? "—"}</td>
              <td className="p-2 text-ink-soft">{r.triggerType}</td>
              <td className="p-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    r.status === "error"
                      ? "bg-red-100 text-red-700"
                      : r.status === "skipped"
                        ? "bg-gray-100 text-gray-600"
                        : "bg-green-100 text-green-800"
                  }`}
                >
                  {r.status}
                </span>
              </td>
              <td className="max-w-[240px] truncate p-2 text-ink-soft">{r.detail}</td>
              <td className="p-2 text-ink-soft">
                {formatDateTime(r.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
