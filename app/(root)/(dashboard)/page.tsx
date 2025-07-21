import { LowStockAlerts } from '@/components/LowStockAlerts';
import { SalesChart } from '@/components/SalesChart';
import { SectionCards } from '@/components/SectionsCards';
import { TopSellingProducts } from '@/components/TopSellingProducts';
import { getProducts } from '@/lib/actions/products';
import { auth } from '@/auth';

const Page = async () => {
  const session = await auth();
  const pharmacyId = session?.user?.pharmacyId;
  const products = pharmacyId ? await getProducts(pharmacyId) : [];
  return (
    <main className="flex flex-col py-5">
      <SectionCards products={products} />
      <div className="py-5">
        <SalesChart />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LowStockAlerts />
        <TopSellingProducts />
      </div>
    </main>
  );
};

export default Page;
