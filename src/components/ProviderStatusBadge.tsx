export function ProviderStatusBadge({ is_active }: { is_active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        is_active ? "bg-green-100 text-green-700" : "bg-surface-high text-ink-soft"
      }`}
    >
      <span aria-hidden>{is_active ? "🟢" : "⚪"}</span>
      {is_active ? "Activo" : "Inactivo"}
    </span>
  );
}
