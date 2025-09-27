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

interface SkeletonCardProps {
  className?: string;
}

function SkeletonCard({ className = '' }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'border rounded-lg p-6 bg-white dark:bg-gray-800',
        className,
      )}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-muted rounded animate-pulse shimmer" />
            <div className="space-y-2">
              <div className="h-5 bg-muted rounded animate-pulse shimmer w-32" />
              <div
                className="h-3 bg-muted/60 rounded animate-pulse shimmer w-24"
                style={{ animationDelay: '200ms' }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <div
              className="h-8 w-20 bg-muted rounded animate-pulse shimmer"
              style={{ animationDelay: '400ms' }}
            />
            <div
              className="h-8 w-16 bg-muted rounded animate-pulse shimmer"
              style={{ animationDelay: '600ms' }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div
                className="h-4 bg-muted rounded animate-pulse shimmer"
                style={{
                  width: `${50 + Math.random() * 30}%`,
                  animationDelay: `${800 + i * 200}ms`,
                }}
              />
              <div
                className="h-4 bg-muted rounded animate-pulse shimmer w-16"
                style={{ animationDelay: `${900 + i * 200}ms` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface SkeletonChartProps {
  className?: string;
}

function SkeletonChart({ className = '' }: SkeletonChartProps) {
  return (
    <div
      className={cn(
        'border rounded-lg p-6 bg-white dark:bg-gray-800',
        className,
      )}
    >
      <div className="space-y-4">
        {/* Chart header */}
        <div className="flex items-center justify-between">
          <div className="h-5 bg-muted rounded animate-pulse shimmer w-40" />
          <div
            className="h-8 w-24 bg-muted rounded animate-pulse shimmer"
            style={{ animationDelay: '200ms' }}
          />
        </div>

        {/* Chart area */}
        <div
          className="h-64 bg-muted/30 rounded animate-pulse shimmer flex items-end justify-between px-4 pb-4"
          style={{ animationDelay: '400ms' }}
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="bg-muted rounded-t animate-pulse shimmer"
              style={{
                width: '12%',
                height: `${30 + Math.random() * 70}%`,
                animationDelay: `${600 + i * 100}ms`,
              }}
            />
          ))}
        </div>

        {/* Chart legend */}
        <div className="flex justify-center gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-3 h-3 bg-muted rounded animate-pulse shimmer"
                style={{ animationDelay: `${1300 + i * 150}ms` }}
              />
              <div
                className="h-3 bg-muted rounded animate-pulse shimmer w-16"
                style={{ animationDelay: `${1350 + i * 150}ms` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { Skeleton, SkeletonTable, SkeletonCard, SkeletonChart };
