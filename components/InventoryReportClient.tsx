'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import InventoryReportHeader from '@/components/InventoryReportHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LayoutDashboard,
  PackageOpen,
  Hourglass,
  TrendingDown,
  PackageX,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import type {
  ExpiringProductData,
  InventoryOverviewData,
  LowStockProductData,
  InventoryProductRow,
} from '@/types';
import { InventoryOverview } from '@/components/inventory-report/Overview';
import { ExpiringProductsTable } from '@/components/inventory-report/ExpiringProductsTable';
import { LowStockTable } from '@/components/inventory-report/LowStockTable';
import { InactiveProductsTable } from './inventory-report/InactiveProductsTable';
import { AvailableProductsTable } from './inventory-report/AvailableProductsTable';
import { SkeletonTable } from '@/components/ui/skeleton';
import { restoreProduct } from '@/lib/actions/products';

type TabKey = 'overview' | 'expiring' | 'low-stock' | 'active' | 'inactive';

interface Props {
  inventoryData: {
    overview: InventoryOverviewData;
    expiringProducts: ExpiringProductData[];
    lowStockProducts: LowStockProductData[];
    activeProducts: InventoryProductRow[];
    inactiveProducts: InventoryProductRow[];
  };
  initialTab?: TabKey;
  initialLowStockStatus?: 'all' | 'out_of_stock' | 'low';
  initialExpiringStatus?: 'all' | 'expired' | 'expiring' | 'warning';
}

export default function InventoryReportClient({
  inventoryData,
  initialTab = 'overview',
  initialLowStockStatus,
  initialExpiringStatus,
}: Props) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const [activeProducts, setActiveProducts] = useState(
    inventoryData.activeProducts,
  );
  const [inactiveProducts, setInactiveProducts] = useState(
    inventoryData.inactiveProducts,
  );
  // Lazy tab loading
  const [expiringLoaded, setExpiringLoaded] = useState(false);
  const [lowStockLoaded, setLowStockLoaded] = useState(false);
  const [activeLoaded, setActiveLoaded] = useState(false);
  const [inactiveLoaded, setInactiveLoaded] = useState(false);

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const handleTabChange = useCallback(
    (value: string) => {
      if (
        value === 'overview' ||
        value === 'expiring' ||
        value === 'low-stock' ||
        value === 'active' ||
        value === 'inactive'
      ) {
        setActiveTab(value as TabKey);

        // Sync tab to URL without triggering Next.js navigation
        const params = new URLSearchParams(window.location.search);
        if (value === 'overview') {
          params.delete('tab');
        } else {
          params.set('tab', value);
        }
        const qs = params.toString();
        const url = qs ? `${pathname}?${qs}` : pathname;
        window.history.replaceState(window.history.state, '', url);

        // Load tab content on first visit
        if (value === 'expiring' && !expiringLoaded) {
          setExpiringLoaded(true);
        }
        if (value === 'low-stock' && !lowStockLoaded) {
          setLowStockLoaded(true);
        }
        if (value === 'active' && !activeLoaded) {
          setActiveLoaded(true);
        }
        if (value === 'inactive' && !inactiveLoaded) {
          setInactiveLoaded(true);
        }
      }
    },
    [pathname, expiringLoaded, lowStockLoaded, activeLoaded, inactiveLoaded],
  );
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'out_of_stock' | 'low'
  >(initialLowStockStatus ?? 'all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const handleRestoreProduct = useCallback(
    async (product: InventoryProductRow) => {
      const pharmacyId = session?.user?.pharmacyId;
      if (!pharmacyId) {
        toast.error('Missing pharmacy context');
        return;
      }

      const res = await restoreProduct(product.id, pharmacyId);
      if (!res?.success) {
        toast.error(res?.message || 'Failed to restore product');
        return;
      }

      toast.success('Product restored');
      setInactiveProducts((prev) => prev.filter((p) => p.id !== product.id));
      setActiveProducts((prev) => {
        const next = [...prev, { ...product, deletedAt: null }];
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
      // Note: No router.refresh() needed - local state update is sufficient
      // The server state is already updated via restoreProduct action
    },
    [session?.user?.pharmacyId],
  );

  // If initial tab is not overview, mark it loaded
  React.useEffect(() => {
    if (initialTab === 'expiring' && !expiringLoaded) {
      setExpiringLoaded(true);
    }
    if (initialTab === 'low-stock' && !lowStockLoaded) {
      setLowStockLoaded(true);
    }
    if (initialTab === 'active' && !activeLoaded) {
      setActiveLoaded(true);
    }
    if (initialTab === 'inactive' && !inactiveLoaded) {
      setInactiveLoaded(true);
    }
  }, [
    initialTab,
    expiringLoaded,
    lowStockLoaded,
    activeLoaded,
    inactiveLoaded,
  ]);

  const filteredLowStockProducts = useMemo(() => {
    return inventoryData.lowStockProducts.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'out_of_stock' &&
          product.status === 'out_of_stock') ||
        (statusFilter === 'low' &&
          (product.status === 'low' || product.status === 'critical'));
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

  // Count all expiring products displayed in the table
  const expiringCount = useMemo(
    () => inventoryData.expiringProducts.length,
    [inventoryData.expiringProducts],
  );

  // Separate expired vs expiring-soon counts for the overview
  const expiredCount = useMemo(
    () => inventoryData.expiringProducts.filter((p) => p.daysRemaining <= 0).length,
    [inventoryData.expiringProducts],
  );
  const expiringSoonCount = useMemo(
    () => inventoryData.expiringProducts.filter((p) => p.daysRemaining > 0).length,
    [inventoryData.expiringProducts],
  );

  // Total retail value of near-expiry & expired stock
  const revenueAtRisk = useMemo(
    () => inventoryData.expiringProducts.reduce((sum, p) => sum + p.sellingPrice * p.quantity, 0),
    [inventoryData.expiringProducts],
  );

  return (
    <div className="space-y-6">
      <InventoryReportHeader />
      <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-lg overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <div className="border-b bg-gray-50 dark:bg-gray-800/50">
            <TabsList className="grid w-full grid-cols-5 bg-transparent p-2 h-auto gap-1">
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
                value="active"
                className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-emerald-200 rounded-lg py-4 px-6 text-sm font-semibold transition-all duration-200 hover:bg-white/60 border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <PackageOpen className="w-4 h-4 text-emerald-600" />
                  <span>Available Products</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="expiring"
                className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-amber-200 rounded-lg py-4 px-6 text-sm font-semibold transition-all duration-200 hover:bg-white/60 border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <Hourglass className="w-4 h-4 text-amber-600" />
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
                  <TrendingDown className="w-4 h-4 text-orange-600" />
                  <span>Low/Out of Stock</span>
                  {filteredLowStockProducts.length > 0 && (
                    <span className="bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 text-xs px-2 py-1 rounded-full font-semibold">
                      {filteredLowStockProducts.length}
                    </span>
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="inactive"
                className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-gray-200 rounded-lg py-4 px-6 text-sm font-semibold transition-all duration-200 hover:bg-white/60 border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <PackageX className="w-4 h-4 text-gray-600" />
                  <span>Inactive Products</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="overview" className="m-0">
              <InventoryOverview
                overview={inventoryData.overview}
                expiringCount={expiringSoonCount}
                expiredCount={expiredCount}
                activeCount={activeProducts.length}
                inactiveCount={inactiveProducts.length}
                revenueAtRisk={revenueAtRisk}
              />
            </TabsContent>

            <TabsContent value="expiring" className="m-0">
              {expiringLoaded ? (
                <ExpiringProductsTable
                  products={inventoryData.expiringProducts}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  statusFilter={initialExpiringStatus ?? 'all'}
                />
              ) : (
                <SkeletonTable rows={8} columns={5} />
              )}
            </TabsContent>

            <TabsContent value="low-stock" className="m-0">
              {lowStockLoaded ? (
                <LowStockTable
                  products={filteredLowStockProducts}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  categoryFilter={categoryFilter}
                  onCategoryFilterChange={setCategoryFilter}
                />
              ) : (
                <SkeletonTable rows={6} columns={4} />
              )}
            </TabsContent>

            <TabsContent value="active" className="m-0">
              {activeLoaded ? (
                <AvailableProductsTable products={activeProducts} />
              ) : (
                <SkeletonTable rows={10} columns={6} />
              )}
            </TabsContent>

            <TabsContent value="inactive" className="m-0">
              {inactiveLoaded ? (
                <InactiveProductsTable
                  products={inactiveProducts}
                  onRestore={handleRestoreProduct}
                />
              ) : (
                <SkeletonTable rows={8} columns={5} />
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
