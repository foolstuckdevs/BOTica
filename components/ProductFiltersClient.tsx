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
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="flex flex-wrap gap-4 items-end">
        <div className="h-9 w-64 rounded-md bg-muted animate-pulse" />
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="h-9 w-36 rounded-md bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <ProductFilters
      categories={categories}
      suppliers={suppliers}
      filters={filters}
      onChange={setFilters}
    />
  );
};
