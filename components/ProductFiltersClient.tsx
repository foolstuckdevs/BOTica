'use client';
import React from 'react';
import { ProductFilters } from '@/components/ProductFilters';
import { Category, Supplier } from '@/types';

interface ProductFiltersClientProps {
  categories: Category[];
  suppliers: Supplier[];
  filters: {
    search: string;
    categoryId: string;
    supplierId: string;
    status: string;
  };
  setFilters: (filters: ProductFiltersClientProps['filters']) => void;
}

export const ProductFiltersClient: React.FC<ProductFiltersClientProps> = ({
  categories,
  suppliers,
  filters,
  setFilters,
}) => {
  return (
    <ProductFilters
      categories={categories}
      suppliers={suppliers}
      filters={filters}
      onChange={setFilters}
    />
  );
};
