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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Filter, X, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  const [open, setOpen] = React.useState(false);

  const handleClearFilters = () => {
    onChange({
      search: '',
      categoryId: 'all',
      supplierId: 'all',
      status: 'all',
    });
  };

  // Count active filters (excluding search)
  const activeFilterCount = [
    filters.categoryId !== 'all',
    filters.supplierId !== 'all',
    filters.status !== 'all',
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0 || filters.search !== '';

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Search Input - always visible for quick access */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          value={filters.search}
          onChange={(event) =>
            onChange({ ...filters, search: event.target.value })
          }
          placeholder="Search products..."
          aria-label="Search products"
          className="w-64 pl-9"
        />
      </div>

      {/* Filters Dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-medium"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4" align="start">
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Filter Products</h4>

            {/* Status Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Status
              </label>
              <Select
                value={filters.status}
                onValueChange={(value) => onChange({ ...filters, status: value })}
              >
                <SelectTrigger className="w-full h-9">
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
            </div>

            {/* Category Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Category
              </label>
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
                triggerClassName="w-full h-9"
              />
            </div>

            {/* Supplier Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Supplier
              </label>
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
                triggerClassName="w-full h-9"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          {filters.status !== 'all' && (
            <Badge variant="secondary" className="gap-1 pr-1">
              {filters.status === 'low' && 'Low Stock'}
              {filters.status === 'out' && 'Out of Stock'}
              {filters.status === 'expiring' && 'Expiring Soon'}
              {filters.status === 'expired' && 'Expired'}
              <button
                onClick={() => onChange({ ...filters, status: 'all' })}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.categoryId !== 'all' && (
            <Badge variant="secondary" className="gap-1 pr-1">
              {categories.find((c) => String(c.id) === filters.categoryId)?.name || 'Category'}
              <button
                onClick={() => onChange({ ...filters, categoryId: 'all' })}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.supplierId !== 'all' && (
            <Badge variant="secondary" className="gap-1 pr-1">
              {suppliers.find((s) => String(s.id) === filters.supplierId)?.name || 'Supplier'}
              <button
                onClick={() => onChange({ ...filters, supplierId: 'all' })}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
