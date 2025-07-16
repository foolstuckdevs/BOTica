'use client';

import { LowStockAlerts } from '@/components/LowStockAlerts';
import { SalesChart } from '@/components/SalesChart';
import { SectionCards } from '@/components/SectionsCards';
import { TopSellingProducts } from '@/components/TopSellingProducts';

const Page = () => {
  return (
    <main className="flex flex-col py-5">
      <SectionCards />
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
