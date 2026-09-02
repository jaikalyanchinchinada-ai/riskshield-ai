export function DetailGrid({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs text-canvas-muted">{item.label}</dt>
          <dd className="text-sm font-medium text-slate-800 mt-0.5 truncate">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
