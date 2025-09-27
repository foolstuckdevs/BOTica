import { SkeletonSalesOverview } from '@/components/ui/skeleton';

export default function SalesReportLoading() {
  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <SkeletonSalesOverview />
      </div>
    </div>
  );
}
