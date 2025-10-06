'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
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

export function ProductsPageClient({
  categories,
  suppliers,
}: ProductsPageClientProps) {
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
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleFiltersChange = useCallback(
    (nextFilters: typeof filters) => {
      setFilters((prev) => {
        const hasChanged =
          prev.search !== nextFilters.search ||
          prev.categoryId !== nextFilters.categoryId ||
          prev.supplierId !== nextFilters.supplierId ||
          prev.status !== nextFilters.status;

        if (!hasChanged) {
          return prev;
        }

        if (pageIndex !== 0) {
          setPageIndex(0);
        }

        return nextFilters;
      });
    },
    [pageIndex],
  );

  const loadPage = useCallback(
    async (
      pi: number,
      ps: number,
      search: string,
      categoryId: string,
      supplierId: string,
      status: string,
    ) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({
          page: String(pi + 1),
          pageSize: String(ps),
        });
        if (search) params.set('search', search);
        if (categoryId !== 'all') params.set('categoryId', categoryId);
        if (supplierId !== 'all') params.set('supplierId', supplierId);
        if (status !== 'all') params.set('status', status);
        const res = await fetch(`/api/products?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        const json = await res.json();
        if (!controller.signal.aborted) {
          setServerData(json);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          return;
        }
        if (e instanceof Error && e.name === 'AbortError') {
          return;
        }
        const msg = e instanceof Error ? e.message : 'Failed to load products';
        setError(msg);
      } finally {
        if (abortControllerRef.current === controller) {
          setLoading(false);
        }
      }
    },
    [],
  );

  // Immediate initial load (once) then debounce subsequent changes.
  const didInitialLoadRef = useRef(false);
  useEffect(() => {
    if (!didInitialLoadRef.current) {
      didInitialLoadRef.current = true;
      loadPage(
        pageIndex,
        pageSize,
        filters.search,
        filters.categoryId,
        filters.supplierId,
        filters.status,
      );
      return;
    }
    const handle = setTimeout(() => {
      loadPage(
        pageIndex,
        pageSize,
        filters.search,
        filters.categoryId,
        filters.supplierId,
        filters.status,
      );
    }, 250);
    return () => clearTimeout(handle);
  }, [
    pageIndex,
    pageSize,
    filters.search,
    filters.categoryId,
    filters.supplierId,
    filters.status,
    loadPage,
  ]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const products = serverData?.data ?? [];

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <ProductFiltersClient
          categories={categories}
          suppliers={suppliers}
          filters={filters}
          setFilters={handleFiltersChange}
        />
        {canEditMasterData && (
          <Button>
            <Plus className="h-4 w-4" />
            <Link href="/inventory/products/new"> Add Product</Link>
          </Button>
        )}
      </div>
      <div className="bg-white rounded-lg shadow border">
        {error && <div className="p-4 text-sm text-red-600">{error}</div>}
        <DataTable
          columns={columns}
          data={products}
          isLoading={loading && !serverData}
          searchConfig={{
            enabled: false,
          }}
          manualPagination={
            serverData
              ? {
                  pageIndex,
                  pageSize,
                  pageCount: serverData.pageCount,
                  onPageChange: (pi) => setPageIndex(pi),
                  onPageSizeChange: (ps) => {
                    setPageSize(ps);
                    setPageIndex(0);
                  },
                  isLoading: loading,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
