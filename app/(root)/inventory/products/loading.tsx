export default function ProductsLoading() {
  return (
    <div className="px-6 py-6 space-y-6 animate-pulse">
      <div className="flex justify-end">
        <div className="h-9 w-40 rounded-md bg-muted" />
      </div>
      <div className="bg-white rounded-lg shadow border p-4">
        <div className="h-8 w-64 bg-muted rounded-md mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-6 w-full bg-muted/70 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
