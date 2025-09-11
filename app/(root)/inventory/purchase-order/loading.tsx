export default function PurchaseOrdersLoading() {
  return (
    <div className="px-6 py-6 space-y-6 animate-pulse">
      <div className="h-9 w-60 rounded-md bg-muted" />
      <div className="bg-white rounded-lg shadow border p-4">
        <div className="h-8 w-72 bg-muted rounded-md mb-4" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-6 w-full bg-muted/70 rounded mb-2" />
        ))}
      </div>
    </div>
  );
}
