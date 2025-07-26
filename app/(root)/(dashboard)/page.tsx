import { LowStockAlerts } from '@/components/LowStockAlerts';
import { SectionCards } from '@/components/SectionsCards';
import { SalesChart } from '@/components/SalesChart';
import { TopSellingProducts } from '@/components/TopSellingProducts';
import { auth } from '@/auth';
import {
  getProductStockSummaries,
  getSalesComparison,
  getTopSellingProducts,
  getLowStockProducts,
} from '@/lib/actions/dashboard';

const Page = async () => {
  const session = await auth();
  const pharmacyId = session?.user?.pharmacyId;

  const defaultSalesComparison = {
    todaysSales: 0,
    yesterdaysSales: 0,
    percentageChange: 0,
    trend: 'equal' as const,
  };

  if (!pharmacyId) {
    return (
      <main className="flex flex-col gap-6 py-5">
        <SectionCards
          productStats={[]}
          salesComparison={defaultSalesComparison}
        />
        <SalesChart />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LowStockAlerts lowStockProducts={[]} />
          <TopSellingProducts products={[]} />
        </div>
      </main>
    );
  }

  const [productStats, salesComparison, topSellingProducts, lowStockProducts] =
    await Promise.all([
      getProductStockSummaries(pharmacyId),
      getSalesComparison(pharmacyId),
      getTopSellingProducts(pharmacyId, 6),
      getLowStockProducts(pharmacyId, 5),
    ]);

  return (
    <main className="flex flex-col gap-6 py-5">
      <SectionCards
        productStats={productStats}
        salesComparison={salesComparison}
      />
      <SalesChart />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LowStockAlerts lowStockProducts={lowStockProducts} />
        <TopSellingProducts products={topSellingProducts} />
      </div>
    </main>
  );
};

export default Page;
