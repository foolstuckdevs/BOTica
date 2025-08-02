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
import { QuickActionsPanel } from '@/components/QuickActionsPanel';

const Page = async () => {
  const session = await auth();

  // Middleware ensures session exists for protected routes
  if (!session?.user) {
    throw new Error('Unauthorized: session missing. Check auth middleware.');
  }

  const pharmacyId = session.user.pharmacyId || 1; // Default to pharmacy 1 if not set

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
      <QuickActionsPanel />
    </main>
  );
};

export default Page;
