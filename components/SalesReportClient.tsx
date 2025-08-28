'use client';

import React from 'react';
import { SalesReportHeader } from '@/components/SalesReportHeader';
import { SalesReportOverview } from '@/components/SalesReportOverview';
import { ProductPerformanceTable } from '@/components/ProductPerformanceTable';
import { BatchProfitTable } from '@/components/BatchProfitTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  exportToPDF,
  exportToExcel,
  exportFormatters,
  type ExportTable,
} from '@/lib/exporters';
import type {
  SalesOverviewData,
  ProductPerformanceData,
  BatchProfitData,
} from '@/types';

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
  batchProfitData: BatchProfitData[];
  comprehensiveSalesData?: Array<SalesOverviewData & { date: string }>;
  comprehensiveProductData?: Array<{
    date: string;
    name: string;
    category: string;
    quantity: number;
    revenue: number;
    profit: number;
  }>;
}

export default function SalesReportClient({
  salesData,
  productData,
  batchProfitData,
  comprehensiveSalesData = [],
  comprehensiveProductData = [],
}: Props) {
  const exportPDF = () => {
    const daily: ExportTable = {
      name: 'Daily Sales',
      columns: [
        { header: 'Date', key: 'date' },
        {
          header: 'Sales',
          key: 'totalSales',
          formatter: exportFormatters.phpCurrency,
        },
        {
          header: 'Cost',
          key: 'totalCost',
          formatter: exportFormatters.phpCurrency,
        },
        {
          header: 'Profit',
          key: 'profit',
          formatter: exportFormatters.phpCurrency,
        },
        { header: 'Transactions', key: 'transactions' },
        { header: 'Items', key: 'totalItems' },
      ],
      rows: (comprehensiveSalesData ?? []) as unknown as Array<
        Record<string, unknown>
      >,
    };
    const topProducts: ExportTable = {
      name: 'Top Products (Month)',
      columns: [
        { header: 'Product', key: 'name' },
        { header: 'Category', key: 'category' },
        { header: 'Quantity', key: 'quantity' },
        {
          header: 'Revenue',
          key: 'revenue',
          formatter: exportFormatters.phpCurrency,
        },
        {
          header: 'Profit',
          key: 'profit',
          formatter: exportFormatters.phpCurrency,
        },
      ],
      rows: (productData.month ?? []) as unknown as Array<
        Record<string, unknown>
      >,
    };
    const batches: ExportTable = {
      name: 'Batch Profit (Month)',
      columns: [
        { header: 'Product', key: 'productName' },
        { header: 'Batch', key: 'batch' },
        { header: 'Expiry', key: 'expiry', formatter: exportFormatters.date },
        { header: 'Qty Sold', key: 'qtySold' },
        { header: 'Qty Remaining', key: 'qtyRemaining' },
        {
          header: 'Cost',
          key: 'cost',
          formatter: exportFormatters.phpCurrency,
        },
        {
          header: 'Revenue',
          key: 'revenue',
          formatter: exportFormatters.phpCurrency,
        },
        {
          header: 'Profit',
          key: 'profit',
          formatter: exportFormatters.phpCurrency,
        },
        {
          header: 'Margin %',
          key: 'margin',
          formatter: (v) => `${Number(v ?? 0).toFixed(1)}%`,
        },
      ],
      rows: (batchProfitData ?? []) as unknown as Array<
        Record<string, unknown>
      >,
    };
    exportToPDF({
      title: 'Sales Report',
      subtitle: 'BOTica',
      tables: [daily, topProducts, batches],
      filename: 'sales-report.pdf',
    });
  };

  const exportExcel = () => {
    const daily: ExportTable = {
      name: 'Daily Sales',
      columns: [
        { header: 'Date', key: 'date' },
        {
          header: 'Sales',
          key: 'totalSales',
          formatter: exportFormatters.phpCurrency,
        },
        {
          header: 'Cost',
          key: 'totalCost',
          formatter: exportFormatters.phpCurrency,
        },
        {
          header: 'Profit',
          key: 'profit',
          formatter: exportFormatters.phpCurrency,
        },
        { header: 'Transactions', key: 'transactions' },
        { header: 'Items', key: 'totalItems' },
      ],
      rows: (comprehensiveSalesData ?? []) as unknown as Array<
        Record<string, unknown>
      >,
    };
    const topProducts: ExportTable = {
      name: 'Top Products (Month)',
      columns: [
        { header: 'Product', key: 'name' },
        { header: 'Category', key: 'category' },
        { header: 'Quantity', key: 'quantity' },
        {
          header: 'Revenue',
          key: 'revenue',
          formatter: exportFormatters.phpCurrency,
        },
        {
          header: 'Profit',
          key: 'profit',
          formatter: exportFormatters.phpCurrency,
        },
      ],
      rows: (productData.month ?? []) as unknown as Array<
        Record<string, unknown>
      >,
    };
    const batches: ExportTable = {
      name: 'Batch Profit (Month)',
      columns: [
        { header: 'Product', key: 'productName' },
        { header: 'Batch', key: 'batch' },
        { header: 'Expiry', key: 'expiry', formatter: exportFormatters.date },
        { header: 'Qty Sold', key: 'qtySold' },
        { header: 'Qty Remaining', key: 'qtyRemaining' },
        {
          header: 'Cost',
          key: 'cost',
          formatter: exportFormatters.phpCurrency,
        },
        {
          header: 'Revenue',
          key: 'revenue',
          formatter: exportFormatters.phpCurrency,
        },
        {
          header: 'Profit',
          key: 'profit',
          formatter: exportFormatters.phpCurrency,
        },
        {
          header: 'Margin %',
          key: 'margin',
          formatter: (v) => `${Number(v ?? 0).toFixed(1)}%`,
        },
      ],
      rows: (batchProfitData ?? []) as unknown as Array<
        Record<string, unknown>
      >,
    };
    exportToExcel({
      filename: 'sales-report.xlsx',
      sheets: [daily, topProducts, batches],
    });
  };

  return (
    <div className="space-y-6">
      <SalesReportHeader onExportPDF={exportPDF} onExportExcel={exportExcel} />
      <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-lg overflow-hidden">
        <Tabs defaultValue="overview" className="w-full">
          <div className="border-b bg-gray-50 dark:bg-gray-800/50">
            <TabsList className="grid w-full grid-cols-3 bg-transparent p-2 h-auto gap-1">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-blue-200 rounded-lg py-4 px-6 text-sm font-semibold transition-all duration-200 hover:bg-white/60 border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Overview</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="products"
                className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-green-200 rounded-lg py-4 px-6 text-sm font-semibold transition-all duration-200 hover:bg-white/60 border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Product Performance</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="batches"
                className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-purple-200 rounded-lg py-4 px-6 text-sm font-semibold transition-all duration-200 hover:bg-white/60 border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span>Batch Profit</span>
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

            <TabsContent value="products" className="m-0">
              <ProductPerformanceTable
                productData={productData}
                comprehensiveProductData={comprehensiveProductData}
              />
            </TabsContent>

            <TabsContent value="batches" className="m-0">
              <BatchProfitTable batchData={batchProfitData} loading={false} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
