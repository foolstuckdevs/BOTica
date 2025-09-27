import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('bg-accent animate-pulse rounded-md shimmer', className)}
      {...props}
    />
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

function SkeletonTable({
  rows = 8,
  columns = 5,
  showHeader = true,
  className = '',
}: SkeletonTableProps) {
  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden bg-white dark:bg-gray-800',
        className,
      )}
    >
      {/* Header */}
      {showHeader && (
        <div className="border-b bg-muted/30">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: columns }).map((_, i) => (
              <div key={i} className="p-4">
                <div className="h-4 bg-muted rounded animate-pulse shimmer" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rows */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid hover:bg-muted/30 transition-colors"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="p-4">
                <div className="space-y-2">
                  <div
                    className="h-4 bg-muted rounded animate-pulse shimmer"
                    style={{
                      width: `${60 + Math.random() * 40}%`,
                      animationDelay: `${
                        (rowIndex * columns + colIndex) * 100
                      }ms`,
                    }}
                  />
                  {colIndex === 0 && rowIndex % 3 === 0 && (
                    <div
                      className="h-3 bg-muted/60 rounded animate-pulse shimmer"
                      style={{
                        width: `${40 + Math.random() * 30}%`,
                        animationDelay: `${
                          (rowIndex * columns + colIndex) * 100 + 300
                        }ms`,
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface SkeletonSalesOverviewProps {
  className?: string;
}

function SkeletonSalesOverview({ className = '' }: SkeletonSalesOverviewProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Page Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-blue-500/20 rounded-xl animate-pulse shimmer" />
          <div>
            <div className="h-6 bg-muted rounded animate-pulse shimmer w-32 mb-1" />
            <div
              className="h-4 bg-muted/60 rounded animate-pulse shimmer w-56"
              style={{ animationDelay: '200ms' }}
            />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="grid grid-cols-3 gap-4">
        {['Overview', 'Sales', 'Product Performance'].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
          >
            <div className="flex items-center justify-center gap-3">
              <div className="w-5 h-5 bg-muted rounded animate-pulse shimmer" />
              <div
                className="h-4 bg-muted rounded animate-pulse shimmer w-20"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Sales Overview Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Sub-header with date filters */}
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-muted rounded animate-pulse shimmer" />
              <div className="h-6 bg-muted rounded animate-pulse shimmer w-32" />
              <div
                className="h-4 bg-muted/60 rounded animate-pulse shimmer w-40"
                style={{ animationDelay: '200ms' }}
              />
            </div>
            <div className="flex gap-2">
              {['Today', 'Week', 'Month', 'Custom'].map((_, i) => (
                <div
                  key={i}
                  className={`h-9 rounded-lg animate-pulse shimmer ${
                    i === 0 ? 'bg-gray-900 w-16' : 'bg-muted w-14'
                  }`}
                  style={{ animationDelay: `${400 + i * 100}ms` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Metrics Cards Grid - 3 columns, 2 rows */}
        <div className="p-6">
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div
                      className="h-4 bg-muted rounded animate-pulse shimmer w-24 mb-3"
                      style={{ animationDelay: `${i * 50}ms` }}
                    />
                    <div
                      className="h-8 bg-muted rounded animate-pulse shimmer w-20 mb-1"
                      style={{ animationDelay: `${i * 50 + 150}ms` }}
                    />
                    <div
                      className="h-3 bg-muted/60 rounded animate-pulse shimmer w-16"
                      style={{ animationDelay: `${i * 50 + 300}ms` }}
                    />
                  </div>
                  <div
                    className="h-6 w-6 bg-blue-500/20 rounded animate-pulse shimmer flex-shrink-0"
                    style={{ animationDelay: `${i * 50 + 450}ms` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SkeletonInventoryOverviewProps {
  className?: string;
}

function SkeletonInventoryOverview({
  className = '',
}: SkeletonInventoryOverviewProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Page Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-xl animate-pulse shimmer" />
          <div>
            <div className="h-6 bg-muted rounded animate-pulse shimmer w-40 mb-1" />
            <div
              className="h-4 bg-muted/60 rounded animate-pulse shimmer w-64"
              style={{ animationDelay: '200ms' }}
            />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="grid grid-cols-4 gap-4">
        {[
          'Overview',
          'Available Products',
          'Expiring Products',
          'Low Stock',
        ].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
          >
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 bg-muted rounded animate-pulse shimmer" />
              <div
                className="h-4 bg-muted rounded animate-pulse shimmer w-24"
                style={{ animationDelay: `${i * 100}ms` }}
              />
              {/* Badge for some tabs */}
              {(i === 2 || i === 3) && (
                <div
                  className="w-5 h-5 bg-red-500/20 rounded-full animate-pulse shimmer"
                  style={{ animationDelay: `${i * 100 + 200}ms` }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Inventory Overview Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Metrics Cards Grid - 4 columns, 2 rows */}
        <div className="p-6">
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div
                      className="h-4 bg-muted rounded animate-pulse shimmer w-28 mb-3"
                      style={{ animationDelay: `${i * 50}ms` }}
                    />
                    <div
                      className="h-8 bg-muted rounded animate-pulse shimmer w-16 mb-1"
                      style={{ animationDelay: `${i * 50 + 150}ms` }}
                    />
                    <div
                      className="h-3 bg-muted/60 rounded animate-pulse shimmer w-20"
                      style={{ animationDelay: `${i * 50 + 300}ms` }}
                    />
                  </div>
                  <div
                    className={`h-6 w-6 rounded animate-pulse shimmer flex-shrink-0 ${
                      i < 4
                        ? 'bg-blue-500/20'
                        : i < 6
                        ? 'bg-red-500/20'
                        : 'bg-emerald-500/20'
                    }`}
                    style={{ animationDelay: `${i * 50 + 450}ms` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export {
  Skeleton,
  SkeletonTable,
  SkeletonSalesOverview,
  SkeletonInventoryOverview,
};
