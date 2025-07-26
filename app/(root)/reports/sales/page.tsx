import { SalesReportHeader } from '@/components/SalesReportHeader';
import { SalesReportOverview } from '@/components/SalesReportOverview';

import { SalesTableWithFilters } from '@/components/SalesTableWithFilters';
import React from 'react';
import { SalesTrendChart } from '@/components/SalesTrendChart';
import { ProductPerformanceTable } from '@/components/ProductPerformanceTable';

const page = () => {
  return (
    <div className="space-y-6 p-6">
      {/* Header with filters and actions */}
      <SalesReportHeader />

      {/* Sales Overview - Core metrics with period filtering */}
      <SalesReportOverview />

      {/* Product Performance Analysis */}
      <ProductPerformanceTable />

      {/* Detailed Transaction History with Filters */}
      <SalesTableWithFilters />
      <SalesTrendChart />
    </div>
  );
};

export default page;
