'use client';

import React, { useState, useCallback } from 'react';
import { SalesReportHeader } from '@/components/SalesReportHeader';
import { SalesReportOverview } from '@/components/SalesReportOverview';
import { ProductPerformanceTable } from '@/components/ProductPerformanceTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SkeletonTable } from '@/components/ui/skeleton';
import { LayoutDashboard, Receipt, LineChart, Calendar } from 'lucide-react';
import SalesTable from '@/components/SalesTable';
import DailyBreakdownTable from '@/components/DailyBreakdownTable';
import type { SalesOverviewData, ProductPerformanceData } from '@/types';

interface Props {
  salesData: {
    today: SalesOverviewData;
    week: SalesOverviewData;
    month: SalesOverviewData;
  };
  productData: {
    today: ProductPerformanceData[];
    week: ProductPerformanceData[];
    month: ProductPerformanceData[];
  };
  comprehensiveSalesData?: Array<SalesOverviewData & { date: string }>;
  comprehensiveProductData?: Array<{
    date: string;
    name: string;
    brandName?: string | null;
    category: string;
    quantity: number;
    revenue: number;
    profit: number;
  }>;
}

export default function SalesReportClient({
  salesData,
  productData,
  comprehensiveSalesData = [],
  comprehensiveProductData = [],
}: Props) {
  // Lazy tab loading
  const [salesTabLoaded, setSalesTabLoaded] = useState(false);
  const [productsTabLoaded, setProductsTabLoaded] = useState(false);
  const [dailyTabLoaded, setDailyTabLoaded] = useState(false);

  const handleTabChange = useCallback(
    (val: string) => {
      if (val === 'sales' && !salesTabLoaded) {
        setSalesTabLoaded(true);
      }
      if (val === 'products' && !productsTabLoaded) {
        setProductsTabLoaded(true);
      }
      if (val === 'daily' && !dailyTabLoaded) {
        setDailyTabLoaded(true);
      }
    },
    [salesTabLoaded, productsTabLoaded, dailyTabLoaded],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <SalesReportHeader />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-lg overflow-hidden">
        <Tabs
          defaultValue="overview"
          onValueChange={handleTabChange}
          className="w-full"
        >
          <div className="border-b bg-gray-50 dark:bg-gray-800/50">
            <TabsList className="grid w-full grid-cols-4 bg-transparent p-2 h-auto gap-1">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-blue-200 rounded-lg py-4 px-6 text-sm font-semibold transition-all duration-200 hover:bg-white/60 border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-4 h-4 text-blue-600" />
                  <span>Overview</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="sales"
                className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-indigo-200 rounded-lg py-4 px-6 text-sm font-semibold transition-all duration-200 hover:bg-white/60 border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <Receipt className="w-4 h-4 text-indigo-600" />
                  <span>Sales</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="daily"
                className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-orange-200 rounded-lg py-4 px-6 text-sm font-semibold transition-all duration-200 hover:bg-white/60 border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  <span>Daily Breakdown</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="products"
                className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-green-200 rounded-lg py-4 px-6 text-sm font-semibold transition-all duration-200 hover:bg-white/60 border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <LineChart className="w-4 h-4 text-green-600" />
                  <span>Product Performance</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="overview" className="m-0 space-y-4">
              <SalesReportOverview
                salesData={salesData}
                comprehensiveSalesData={comprehensiveSalesData}
                onStateChange={() => {}}
              />
            </TabsContent>

            <TabsContent value="sales" className="m-0">
              {salesTabLoaded ? (
                <SalesTable
                  comprehensiveProductData={comprehensiveProductData}
                />
              ) : (
                <div className="p-6">
                  <SkeletonTable rows={8} columns={6} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="daily" className="m-0">
              {dailyTabLoaded ? (
                <DailyBreakdownTable
                  comprehensiveSalesData={comprehensiveSalesData}
                />
              ) : (
                <div className="p-6">
                  <SkeletonTable rows={8} columns={7} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="products" className="m-0">
              {productsTabLoaded ? (
                <ProductPerformanceTable
                  productData={productData}
                  comprehensiveProductData={comprehensiveProductData}
                />
              ) : (
                <div className="p-6">
                  <SkeletonTable rows={6} columns={5} />
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
