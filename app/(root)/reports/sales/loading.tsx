import {
  SkeletonTable,
  SkeletonCard,
  SkeletonChart,
} from '@/components/ui/skeleton';

export default function SalesReportLoading() {
  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="flex flex-col gap-4">
            <div className="h-8 bg-muted rounded animate-pulse shimmer w-64" />
            <div className="h-4 bg-muted/60 rounded animate-pulse shimmer w-96" />
          </div>

          {/* Main report card skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-lg overflow-hidden">
            {/* Tab skeleton */}
            <div className="border-b bg-gray-50 dark:bg-gray-800/50 p-2">
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 bg-muted rounded-lg animate-pulse shimmer"
                    style={{ animationDelay: `${i * 100}ms` }}
                  />
                ))}
              </div>
            </div>

            {/* Content area */}
            <div className="p-6 space-y-6">
              {/* Overview cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard
                    key={i}
                    className="bg-gradient-to-br from-white to-gray-50"
                  />
                ))}
              </div>

              {/* Chart skeleton */}
              <SkeletonChart className="h-80" />

              {/* Table skeleton */}
              <SkeletonTable rows={8} columns={6} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
