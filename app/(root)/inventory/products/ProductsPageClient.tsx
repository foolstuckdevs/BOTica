'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Product, Category, Supplier } from '@/types';
import { ProductFiltersClient } from '../../../../components/ProductFiltersClient';
import { DataTable } from '@/components/DataTable';
import { columns } from './columns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import usePermissions from '@/hooks/use-permissions';

interface ProductsPageClientProps {
  categories: Category[];
  suppliers: Supplier[];
}

type PaginatedProducts = {
  data: Product[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export function ProductsPageClient({ categories, suppliers }: ProductsPageClientProps) {
  const { canEditMasterData } = usePermissions();
  const [filters, setFilters] = useState({
    search: '',
    categoryId: 'all',
    supplierId: 'all',
    status: 'all',
  });
  const [pageIndex, setPageIndex] = useState(0); // zero-based
  const [pageSize, setPageSize] = useState(50);
  const [serverData, setServerData] = useState<PaginatedProducts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (pi: number, ps: number, search: string) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(pi + 1), pageSize: String(ps) });
      if (search) params.set('search', search);
      const res = await fetch(`/api/products?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const json = await res.json();
      setServerData(json);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load products';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial + changes (debounce search)
  useEffect(() => {
    const handle = setTimeout(() => {
      loadPage(pageIndex, pageSize, filters.search);
    }, 300);
    return () => clearTimeout(handle);
  }, [pageIndex, pageSize, filters.search, loadPage]);

  const filteredProducts = useMemo(() => {
    const products = serverData?.data ?? [];
    const now = new Date();
    return products.filter((product) => {
      // Stock/expiry status logic
      let matchesStatus = true;
      if (filters.status !== 'all') {
        if (filters.status === 'low') {
          matchesStatus =
            product.minStockLevel != null &&
            product.quantity <= product.minStockLevel &&
            product.quantity > 0;
        } else if (filters.status === 'out') {
          matchesStatus = product.quantity === 0;
        } else if (filters.status === 'expiring') {
          const expiry = product.expiryDate
            ? new Date(product.expiryDate)
            : null;
          matchesStatus = !!(
            expiry &&
            expiry > now &&
            expiry.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000
          );
        } else if (filters.status === 'expired') {
          const expiry = product.expiryDate
            ? new Date(product.expiryDate)
            : null;
          matchesStatus = !!(expiry && expiry < now);
        }
      }
      const matchesCategory =
        filters.categoryId === 'all' ||
        String(product.categoryId) === filters.categoryId;
      const matchesSupplier =
        filters.supplierId === 'all' ||
        String(product.supplierId) === filters.supplierId;

      return matchesStatus && matchesCategory && matchesSupplier;
    });
  }, [serverData, filters]);

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <ProductFiltersClient
          categories={categories}
          suppliers={suppliers}
          filters={filters}
          setFilters={setFilters}
        />
        {canEditMasterData && (
          <Button>
            <Plus className="h-4 w-4" />
            <Link href="/inventory/products/new"> Add Product</Link>
          </Button>
        )}
      </div>
      <div className="bg-white rounded-lg shadow border">
        {error && (
          <div className="p-4 text-sm text-red-600">{error}</div>
        )}
        <DataTable
          columns={columns}
            data={filteredProducts}
            searchConfig={{
              enabled: true,
              placeholder: 'Search products by name, brand, batch, or supplier...',
              globalFilter: true,
              searchableColumns: ['name','brandName','genericName','lotNumber','supplierName'],
            }}
            manualPagination={serverData ? {
              pageIndex,
              pageSize,
              pageCount: serverData.pageCount,
              onPageChange: (pi) => setPageIndex(pi),
              onPageSizeChange: (ps) => { setPageSize(ps); setPageIndex(0); },
              isLoading: loading,
            } : undefined}
          />
      </div>
    </div>
  );
}
