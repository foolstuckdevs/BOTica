import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { Category, Supplier } from '@/types';
import { Input } from '@/components/ui/input';

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
  const handleClearFilters = () => {
    onChange({
      search: '',
      categoryId: 'all',
      supplierId: 'all',
      status: 'all',
    });
  };

  const hasActiveFilters =
    filters.categoryId !== 'all' ||
    filters.supplierId !== 'all' ||
    filters.status !== 'all' ||
    filters.search !== '';

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <Input
        type="search"
        value={filters.search}
        onChange={(event) =>
          onChange({ ...filters, search: event.target.value })
        }
        placeholder="Search products..."
        aria-label="Search products"
        className="w-64"
      />
      <Select
        value={filters.status}
        onValueChange={(value) => onChange({ ...filters, status: value })}
      >
        <SelectTrigger className="w-36">
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
      <SearchableSelect
        options={[
          { value: 'all', label: 'All Categories' },
          ...categories.map((cat) => ({
            value: String(cat.id),
            label: cat.name,
          })),
        ]}
        value={filters.categoryId}
        onValueChange={(value) => onChange({ ...filters, categoryId: value })}
        placeholder="All Categories"
        searchPlaceholder="Search categories..."
        triggerClassName="w-36 h-10"
      />
      <SearchableSelect
        options={[
          { value: 'all', label: 'All Suppliers' },
          ...suppliers.map((sup) => ({
            value: String(sup.id),
            label: sup.name,
          })),
        ]}
        value={filters.supplierId}
        onValueChange={(value) => onChange({ ...filters, supplierId: value })}
        placeholder="All Suppliers"
        searchPlaceholder="Search suppliers..."
        triggerClassName="w-36 h-10"
      />

      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearFilters}
          className="h-9 px-3 text-sm"
        >
          Clear Filters
        </Button>
      )}
    </div>
  );
};
