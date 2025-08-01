'use client';
import React, { useState, useMemo } from 'react';
import { Product, Category, Supplier } from '@/types';
import { ProductFiltersClient } from '../../../../components/ProductFiltersClient';
import { DataTable } from '@/components/DataTable';
import { columns } from './columns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface ProductsPageClientProps {
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
}

export function ProductsPageClient({
  products,
  categories,
  suppliers,
}: ProductsPageClientProps) {
  const [filters, setFilters] = useState({
    search: '',
    categoryId: 'all',
    supplierId: 'all',
    status: 'all',
  });

  const filteredProducts = useMemo(() => {
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
  }, [products, filters]);

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <ProductFiltersClient
          categories={categories}
          suppliers={suppliers}
          filters={filters}
          setFilters={setFilters}
        />
        <Button>
          <Link href="/inventory/products/new">+ Add Product</Link>
        </Button>
      </div>
      <div className="bg-white rounded-lg shadow border">
        <DataTable
          columns={columns}
          data={filteredProducts}
          searchConfig={{
            enabled: true,
            placeholder:
              'Search products by name, brand, batch, or supplier...',
            globalFilter: true,
            searchableColumns: [
              'name',
              'brandName',
              'genericName',
              'lotNumber',
              'supplierName',
            ],
          }}
        />
      </div>
    </div>
  );
}
