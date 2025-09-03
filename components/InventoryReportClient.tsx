'use client';

import React, { useMemo, useState } from 'react';
import InventoryReportHeader from '@/components/InventoryReportHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    'all' | '30days' | '60days' | '90days'
  >('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'out_of_stock' | 'critical' | 'low'
  >('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredExpiringProducts = useMemo(() => {
    return inventoryData.expiringProducts.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesFilter =
        expiryFilter === 'all' ||
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
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'out_of_stock' &&
          product.status === 'out_of_stock') ||
        (statusFilter === 'critical' && product.status === 'critical') ||
        (statusFilter === 'low' && product.status === 'low');
      const matchesCategory =
        categoryFilter === 'all' || product.categoryName === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [
    inventoryData.lowStockProducts,
    searchTerm,
    statusFilter,
    categoryFilter,
  ]);

  const expiringCount = useMemo(
    () =>
      inventoryData.expiringProducts.filter((p) => p.daysRemaining > 0).length,
    [inventoryData.expiringProducts],
  );

  return (
    <div className="space-y-6">
      <InventoryReportHeader />
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
                  {expiringCount > 0 && (
                    <span className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-xs px-2 py-1 rounded-full font-semibold">
                      {expiringCount}
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
                expiringCount={expiringCount}
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
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                categoryFilter={categoryFilter}
                onCategoryFilterChange={setCategoryFilter}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
