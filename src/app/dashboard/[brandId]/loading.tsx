/** Shown while a brand tab's data loads. */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-40 animate-pulse rounded-lg bg-navy-50" />
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-lg bg-navy-50" />
        ))}
      </div>
    </div>
  );
}
