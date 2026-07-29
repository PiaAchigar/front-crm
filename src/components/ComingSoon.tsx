export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center">
      <h2 className="text-2xl font-semibold text-primary">{title}</h2>
      <p className="max-w-md text-sm text-ink-soft">{description}</p>
      <span className="mt-2 rounded-full bg-surface-high px-3 py-1 text-xs text-ink-soft">
        Próximamente
      </span>
    </div>
  );
}
