import { SalesChart } from '@/components/SalesChart';
import { SectionCards } from '@/components/SectionsCards';
import React from 'react';

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
          </div>
        </div>
      </div>
    </main>
  );
};

export default Page;
