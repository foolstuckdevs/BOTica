'use client'; // Add this line
import { LowStockAlerts } from '@/components/LowStockAlerts';
import { SalesChart } from '@/components/SalesChart';
import { SectionCards } from '@/components/SectionsCards';
import { TopSellingProducts } from '@/components/TopSellingProducts';

const Page = () => {
  return (
    <main>
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <SectionCards />
            <div className="px-4 lg:px-6">
              <SalesChart />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <LowStockAlerts />
              <TopSellingProducts />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Page;
