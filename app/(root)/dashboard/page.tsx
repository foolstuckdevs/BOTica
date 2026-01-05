import { Suspense } from 'react';
import { LowStockAlerts } from '@/components/LowStockAlerts';
import { SectionCards } from '@/components/SectionsCards';
import { TopSellingProducts } from '@/components/TopSellingProducts';
import RecentActivity from '@/components/RecentActivity';
import { auth } from '@/auth';
import {
  getProductStockSummaries,
  getSalesComparison,
  getTopSellingProducts,
  getLowStockProducts,
  getChartData,
} from '@/lib/actions/dashboard';

// Direct import to satisfy server component constraints (dynamic with ssr:false disallowed)
import { SalesChart } from '@/components/SalesChart';

const Page = async () => {
  const session = await auth();

  // Middleware ensures session exists for protected routes
  if (!session?.user) {
    throw new Error('Unauthorized: session missing. Check auth middleware.');
  }

  if (!session.user.pharmacyId) {
    throw new Error('Unauthorized: user not assigned to any pharmacy.');
  }

  const pharmacyId = session.user.pharmacyId;
  const isAdmin = session.user.role === 'Admin';

  const productStatsPromise = getProductStockSummaries(pharmacyId);
  const salesComparisonPromise = getSalesComparison(pharmacyId);
  const topSellingProductsPromise = getTopSellingProducts(pharmacyId, 6);
  const lowStockProductsPromise = getLowStockProducts(pharmacyId, 5);
  const chartDataPromise = getChartData(pharmacyId, 30);

  return (
    <div className="flex flex-col w-full space-y-6">
      <Suspense
        fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-40 rounded-lg border bg-muted/40 dark:bg-muted/20"
              />
            ))}
          </div>
        }
      >
        <CardsSection
          productStatsPromise={productStatsPromise}
          salesComparisonPromise={salesComparisonPromise}
        />
      </Suspense>

      <Suspense
        fallback={
          <div className="h-72 rounded-lg border bg-muted/40 dark:bg-muted/20 animate-pulse" />
        }
      >
        <ChartSection chartDataPromise={chartDataPromise} />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense
          fallback={
            <div className="h-64 rounded-lg border bg-muted/40 dark:bg-muted/20 animate-pulse" />
          }
        >
          <LowStockSection lowStockProductsPromise={lowStockProductsPromise} />
        </Suspense>
        <Suspense
          fallback={
            <div className="h-64 rounded-lg border bg-muted/40 dark:bg-muted/20 animate-pulse" />
          }
        >
          <TopSellingSection
            topSellingProductsPromise={topSellingProductsPromise}
          />
        </Suspense>
      </div>

      {isAdmin && (
        <Suspense
          fallback={
            <div className="h-72 rounded-lg border bg-muted/40 dark:bg-muted/20 animate-pulse" />
          }
        >
          <ActivitySection pharmacyId={pharmacyId} />
        </Suspense>
      )}
    </div>
  );
};

// Async server component sections
async function CardsSection({
  productStatsPromise,
  salesComparisonPromise,
}: {
  productStatsPromise: ReturnType<typeof getProductStockSummaries>;
  salesComparisonPromise: ReturnType<typeof getSalesComparison>;
}) {
  const [productStats, salesComparison] = await Promise.all([
    productStatsPromise,
    salesComparisonPromise,
  ]);
  return (
    <SectionCards
      productStats={productStats}
      salesComparison={salesComparison}
    />
  );
}

async function ChartSection({
  chartDataPromise,
}: {
  chartDataPromise: ReturnType<typeof getChartData>;
}) {
  const chartData = await chartDataPromise;
  return <SalesChart chartData={chartData} />;
}

async function LowStockSection({
  lowStockProductsPromise,
}: {
  lowStockProductsPromise: ReturnType<typeof getLowStockProducts>;
}) {
  const lowStockProducts = await lowStockProductsPromise;
  return <LowStockAlerts lowStockProducts={lowStockProducts} />;
}

async function TopSellingSection({
  topSellingProductsPromise,
}: {
  topSellingProductsPromise: ReturnType<typeof getTopSellingProducts>;
}) {
  const topSellingProducts = await topSellingProductsPromise;
  return <TopSellingProducts products={topSellingProducts} />;
}

async function ActivitySection({ pharmacyId }: { pharmacyId: number }) {
  return <RecentActivity pharmacyId={pharmacyId} />;
}

export default Page;
