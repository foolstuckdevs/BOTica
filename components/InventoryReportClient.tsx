'use client';

import React, { useMemo, useState } from 'react';
import InventoryReportHeader from '@/components/InventoryReportHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  exportToExcel,
  exportToPDF,
  exportFormatters,
  type ExportTable,
} from '@/lib/exporters';
import type {
  ExpiringProductData,
  InventoryOverviewData,
  LowStockProductData,
} from '@/types';
import { InventoryOverview } from '@/components/inventory-report/Overview';
import { ExpiringProductsTable } from '@/components/inventory-report/ExpiringProductsTable';
import { LowStockTable } from '@/components/inventory-report/LowStockTable';

type TabKey = 'overview' | 'expiring' | 'low-stock';

interface Props {
  inventoryData: {
    overview: InventoryOverviewData;
    expiringProducts: ExpiringProductData[];
    lowStockProducts: LowStockProductData[];
  };
  initialTab?: TabKey;
}

export default function InventoryReportClient({
  inventoryData,
  initialTab = 'overview',
}: Props) {
  const [, setActiveTab] = useState<TabKey>(initialTab);
  const handleTabChange = (value: string) => {
    if (value === 'overview' || value === 'expiring' || value === 'low-stock') {
      setActiveTab(value);
    }
  };
  const [expiryFilter, setExpiryFilter] = useState<
    'all' | '7days' | '30days' | '60days' | '90days'
  >('all');
  const [stockFilter, setStockFilter] = useState<
    'all' | 'out_of_stock' | 'critical' | 'low'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredExpiringProducts = useMemo(() => {
    return inventoryData.expiringProducts.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesFilter =
        expiryFilter === 'all' ||
        (expiryFilter === '7days' && product.daysRemaining <= 7) ||
        (expiryFilter === '30days' && product.daysRemaining <= 30) ||
        (expiryFilter === '60days' &&
          product.daysRemaining > 30 &&
          product.daysRemaining <= 60) ||
        (expiryFilter === '90days' &&
          product.daysRemaining > 60 &&
          product.daysRemaining <= 90);
      return matchesSearch && matchesFilter;
    });
  }, [inventoryData.expiringProducts, searchTerm, expiryFilter]);

  const filteredLowStockProducts = useMemo(() => {
    return inventoryData.lowStockProducts.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesFilter =
        stockFilter === 'all' ||
        (stockFilter === 'out_of_stock' && product.status === 'out_of_stock') ||
        (stockFilter === 'critical' && product.status === 'critical') ||
        (stockFilter === 'low' && product.status === 'low');
      return matchesSearch && matchesFilter;
    });
  }, [inventoryData.lowStockProducts, searchTerm, stockFilter]);

  const expiring7Count = useMemo(
    () =>
      inventoryData.expiringProducts.filter((p) => p.daysRemaining <= 7).length,
    [inventoryData.expiringProducts],
  );

  const exportPDF = () => {
    const expiring: ExportTable = {
      name: 'Expiring',
      columns: [
        { header: 'Product', key: 'name' },
        { header: 'Category', key: 'categoryName' },
        { header: 'Lot', key: 'lotNumber' },
        {
          header: 'Expiry',
          key: 'expiryDate',
          formatter: exportFormatters.date,
        },
        { header: 'Days', key: 'daysRemaining' },
        { header: 'Qty', key: 'quantity' },
        { header: 'Unit', key: 'unit' },
        {
          header: 'Value',
          key: 'value',
          formatter: exportFormatters.phpCurrency,
        },
        { header: 'Status', key: 'urgency' },
      ],
      rows: filteredExpiringProducts as unknown as Array<
        Record<string, unknown>
      >,
    };
    const low: ExportTable = {
      name: 'Low Stock',
      columns: [
        { header: 'Product', key: 'name' },
        { header: 'Category', key: 'categoryName' },
        { header: 'Lot', key: 'lotNumber' },
        { header: 'Qty', key: 'quantity' },
        { header: 'Unit', key: 'unit' },
        { header: 'Reorder', key: 'reorderPoint' },
        { header: 'Supplier', key: 'supplierName' },
        {
          header: 'Last Updated',
          key: 'lastRestockDate',
          formatter: exportFormatters.date,
        },
        { header: 'Status', key: 'status' },
      ],
      rows: filteredLowStockProducts as unknown as Array<
        Record<string, unknown>
      >,
    };
    exportToPDF({
      title: 'Inventory Report',
      subtitle: 'BOTica',
      tables: [expiring, low],
      filename: 'inventory-report.pdf',
    });
  };

  const exportExcel = () => {
    const expiring: ExportTable = {
      name: 'Expiring',
      columns: [
        { header: 'Product', key: 'name' },
        { header: 'Category', key: 'categoryName' },
        { header: 'Lot', key: 'lotNumber' },
        {
          header: 'Expiry',
          key: 'expiryDate',
          formatter: exportFormatters.date,
        },
        { header: 'Days', key: 'daysRemaining' },
        { header: 'Quantity', key: 'quantity' },
        { header: 'Unit', key: 'unit' },
        {
          header: 'Value',
          key: 'value',
          formatter: exportFormatters.phpCurrency,
        },
        { header: 'Status', key: 'urgency' },
      ],
      rows: filteredExpiringProducts as unknown as Array<
        Record<string, unknown>
      >,
    };
    const low: ExportTable = {
      name: 'Low Stock',
      columns: [
        { header: 'Product', key: 'name' },
        { header: 'Category', key: 'categoryName' },
        { header: 'Lot', key: 'lotNumber' },
        { header: 'Quantity', key: 'quantity' },
        { header: 'Unit', key: 'unit' },
        { header: 'ReorderPoint', key: 'reorderPoint' },
        { header: 'Supplier', key: 'supplierName' },
        {
          header: 'LastUpdated',
          key: 'lastRestockDate',
          formatter: exportFormatters.date,
        },
        { header: 'Status', key: 'status' },
      ],
      rows: filteredLowStockProducts as unknown as Array<
        Record<string, unknown>
      >,
    };
    exportToExcel({
      filename: 'inventory-report.xlsx',
      sheets: [expiring, low],
    });
  };

  return (
    <div className="space-y-6">
      <InventoryReportHeader
        onExportPDF={exportPDF}
        onExportExcel={exportExcel}
      />
      <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-lg overflow-hidden">
        <Tabs
          defaultValue={initialTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
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
                value="expiring"
                className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-amber-200 rounded-lg py-4 px-6 text-sm font-semibold transition-all duration-200 hover:bg-white/60 border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                  <span>Expiring Products</span>
                  {expiring7Count > 0 && (
                    <span className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-xs px-2 py-1 rounded-full font-semibold">
                      {expiring7Count}
                    </span>
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="low-stock"
                className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-orange-200 rounded-lg py-4 px-6 text-sm font-semibold transition-all duration-200 hover:bg-white/60 border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span>Low Stock</span>
                  {filteredLowStockProducts.length > 0 && (
                    <span className="bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 text-xs px-2 py-1 rounded-full font-semibold">
                      {filteredLowStockProducts.length}
                    </span>
                  )}
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="overview" className="m-0">
              <InventoryOverview
                overview={inventoryData.overview}
                expiring7Count={expiring7Count}
              />
            </TabsContent>

            <TabsContent value="expiring" className="m-0">
              <ExpiringProductsTable
                products={filteredExpiringProducts}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                expiryFilter={expiryFilter}
                onExpiryFilterChange={setExpiryFilter}
              />
            </TabsContent>

            <TabsContent value="low-stock" className="m-0">
              <LowStockTable
                products={filteredLowStockProducts}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                stockFilter={stockFilter}
                onStockFilterChange={setStockFilter}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
