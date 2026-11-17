export default function Loading() {
  return (
    <main
      className="main-wrap py-10"
      aria-label="Loading workspace"
      role="status"
    >
      <div className="skeleton h-12 w-2/3" />
      <div className="grid sm:grid-cols-3 gap-4 mt-8">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div key={n} className="skeleton h-56" />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </main>
  );
}
