export default function AdjustmentsLoading() {
  return (
    <div className="px-6 py-6 space-y-6 animate-pulse">
      <div className="flex justify-end">
        <div className="h-9 w-48 rounded-md bg-muted" />
      </div>
      <div className="bg-white rounded-lg shadow border p-4">
        <div className="h-8 w-72 bg-muted rounded-md mb-4" />
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-6 w-full bg-muted/70 rounded mb-2" />
        ))}
      </div>
    </div>
  );
}
