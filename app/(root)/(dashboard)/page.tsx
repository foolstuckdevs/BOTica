import { LowStockAlerts } from '@/components/LowStockAlerts';
import { SectionCards } from '@/components/SectionsCards';
import { SalesChart } from '@/components/SalesChart';
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

  const [
    productStats,
    salesComparison,
    topSellingProducts,
    lowStockProducts,
    chartData,
  ] = await Promise.all([
    getProductStockSummaries(pharmacyId),
    getSalesComparison(pharmacyId),
    getTopSellingProducts(pharmacyId, 6),
    getLowStockProducts(pharmacyId, 5),
    getChartData(pharmacyId, 30), // Default to 30 days
  ]);

  return (
    <main className="flex flex-col gap-6 py-5">
      <SectionCards
        productStats={productStats}
        salesComparison={salesComparison}
      />
      <SalesChart chartData={chartData} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LowStockAlerts lowStockProducts={lowStockProducts} />
        <TopSellingProducts products={topSellingProducts} />
      </div>
      <RecentActivity pharmacyId={pharmacyId} />
    </main>
  );
};

export default Page;
