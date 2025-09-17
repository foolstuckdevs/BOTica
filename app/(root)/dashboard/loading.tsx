export default function DashboardLoading() {
  return (
    <main className="flex flex-col gap-6 py-5 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-40 rounded-lg border bg-muted/40 dark:bg-muted/20"
          />
        ))}
      </div>
      <div className="h-72 rounded-lg border bg-muted/40 dark:bg-muted/20" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 rounded-lg border bg-muted/40 dark:bg-muted/20" />
        <div className="h-64 rounded-lg border bg-muted/40 dark:bg-muted/20" />
      </div>
      <div className="h-72 rounded-lg border bg-muted/40 dark:bg-muted/20" />
    </main>
  );
}
