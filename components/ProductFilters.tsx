import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Category, Supplier } from '@/types';

interface ProductFiltersProps {
  categories: Category[];
  suppliers: Supplier[];
  filters: {
    search: string;
    categoryId: string;
    supplierId: string;
    status: string;
  };
  onChange: (filters: ProductFiltersProps['filters']) => void;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  categories,
  suppliers,
  filters,
  onChange,
}) => {
  return (
    <div className="flex flex-wrap gap-4 items-end">
      <Select
        value={filters.status}
        onValueChange={(value) => onChange({ ...filters, status: value })}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="low">Low Stock</SelectItem>
          <SelectItem value="out">Out of Stock</SelectItem>
          <SelectItem value="expiring">Expiring Soon</SelectItem>
          <SelectItem value="expired">Expired</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={filters.categoryId}
        onValueChange={(value) => onChange({ ...filters, categoryId: value })}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={String(cat.id)}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.supplierId}
        onValueChange={(value) => onChange({ ...filters, supplierId: value })}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All Suppliers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Suppliers</SelectItem>
          {suppliers.map((sup) => (
            <SelectItem key={sup.id} value={String(sup.id)}>
              {sup.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
