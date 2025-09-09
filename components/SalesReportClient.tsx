'use client';

import React from 'react';
import { SalesReportHeader } from '@/components/SalesReportHeader';
import { SalesReportOverview } from '@/components/SalesReportOverview';
import { ProductPerformanceTable } from '@/components/ProductPerformanceTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Receipt, LineChart } from 'lucide-react';
import SalesTable from '@/components/SalesTable';
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
  return (
    <div className="space-y-6">
      <SalesReportHeader />
      <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-lg overflow-hidden">
        <Tabs defaultValue="overview" className="w-full">
          <div className="border-b bg-gray-50 dark:bg-gray-800/50">
            <TabsList className="grid w-full grid-cols-3 bg-transparent p-2 h-auto gap-1">
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
            <TabsContent value="overview" className="m-0">
              <SalesReportOverview
                salesData={salesData}
                comprehensiveSalesData={comprehensiveSalesData}
              />
            </TabsContent>

            <TabsContent value="sales" className="m-0">
              <SalesTable comprehensiveProductData={comprehensiveProductData} />
            </TabsContent>

            <TabsContent value="products" className="m-0">
              <ProductPerformanceTable
                productData={productData}
                comprehensiveProductData={comprehensiveProductData}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
