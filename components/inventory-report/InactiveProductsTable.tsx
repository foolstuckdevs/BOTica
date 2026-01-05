'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TableExportMenu } from '@/components/TableExportMenu';
import { buildFilterSubtitle } from '@/lib/filterSubtitle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  PackageX,
  Filter,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
} from 'lucide-react';
import type { InventoryProductRow } from '@/types';
import { formatQuantityWithUnit, formatUnitLabel } from '@/lib/utils';

interface Props {
  products: InventoryProductRow[];
  onRestore?: (product: InventoryProductRow) => Promise<void> | void;
}

// Debounce hook for search input
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function InactiveProductsTableInner({ products, onRestore }: Props) {
  // Local state - isolated from other tabs
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [sortField, setSortField] = useState<
    | 'product'
    | 'brand'
    | 'category'
    | 'lotNumber'
    | 'expiry'
    | 'quantity'
    | 'costPrice'
    | 'sellingPrice'
    | 'deletedAt'
    | null
  >(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Debounce search to reduce re-renders while typing
  const searchTerm = useDebouncedValue(searchInput, 300);

  const handleSort = useCallback(
    (
      field:
        | 'product'
        | 'brand'
        | 'category'
        | 'lotNumber'
        | 'expiry'
        | 'quantity'
        | 'costPrice'
        | 'sellingPrice'
        | 'deletedAt',
    ) => {
      setSortField((prev) => {
        if (prev === field) {
          setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
          return prev;
        }
        setSortDirection('asc');
        return field;
      });
    },
    [],
  );

  const getSortIcon = (
    field:
      | 'product'
      | 'brand'
      | 'category'
      | 'lotNumber'
      | 'expiry'
      | 'quantity'
      | 'costPrice'
      | 'sellingPrice'
      | 'deletedAt',
  ) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-50" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-1 h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="ml-1 h-3.5 w-3.5" />
    );
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, itemsPerPage]);

  const clearAllFilters = useCallback(() => {
    setCategoryFilter('all');
    setSearchInput('');
  }, []);

  const hasActiveFilters = categoryFilter !== 'all' || searchInput !== '';

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.brandName || '').toLowerCase().includes(term) ||
          p.categoryName.toLowerCase().includes(term) ||
          (p.lotNumber || '').toLowerCase().includes(term),
      )
      .filter(
        (p) => categoryFilter === 'all' || p.categoryName === categoryFilter,
      );
  }, [products, searchTerm, categoryFilter]);

  // Apply sorting
  const sorted = useMemo(() => {
    if (!sortField) return filtered;

    return [...filtered].sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortField) {
        case 'product':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'brand':
          aValue = (a.brandName || '').toLowerCase();
          bValue = (b.brandName || '').toLowerCase();
          break;
        case 'category':
          aValue = a.categoryName.toLowerCase();
          bValue = b.categoryName.toLowerCase();
          break;
        case 'lotNumber':
          aValue = (a.lotNumber || '').toLowerCase();
          bValue = (b.lotNumber || '').toLowerCase();
          break;
        case 'expiry':
          aValue = a.expiryDate ? new Date(a.expiryDate).getTime() : 0;
          bValue = b.expiryDate ? new Date(b.expiryDate).getTime() : 0;
          break;
        case 'quantity':
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        case 'costPrice':
          aValue = a.costPrice;
          bValue = b.costPrice;
          break;
        case 'sellingPrice':
          aValue = a.sellingPrice;
          bValue = b.sellingPrice;
          break;
        case 'deletedAt':
          aValue = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
          bValue = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginated = sorted.slice(startIndex, endIndex);

  const columns = [
    { header: 'Product', key: 'name' },
    { header: 'Brand', key: 'brandName' },
    { header: 'Category', key: 'categoryName' },
    { header: 'Lot #', key: 'lotNumber' },
    { header: 'Expiry', key: 'expiryDate' },
    { header: 'Qty', key: 'quantity' },
    { header: 'Cost Price', key: 'costPrice' },
    { header: 'Selling Price', key: 'sellingPrice' },
    { header: 'Deleted At', key: 'deletedAt' },
    { header: 'Actions', key: 'actions' },
  ];
  const exportRows = filtered.map((p) => ({
    name: p.name + (p.brandName ? ` (${p.brandName})` : ''),
    brandName: p.brandName,
    categoryName: p.categoryName,
    lotNumber: p.lotNumber,
    expiryDate: p.expiryDate,
    quantity: p.quantity,
    unit: formatUnitLabel(p.unit, '-'),
    costPrice: p.costPrice,
    sellingPrice: p.sellingPrice,
    deletedAt: p.deletedAt,
  }));
  const exportColumns = [
    { header: 'Product', key: 'name' },
    { header: 'Brand', key: 'brandName' },
    { header: 'Category', key: 'categoryName' },
    { header: 'Lot #', key: 'lotNumber' },
    { header: 'Expiry', key: 'expiryDate' },
    { header: 'Qty', key: 'quantity', numeric: true },
    { header: 'Unit', key: 'unit' },
    { header: 'Cost Price', key: 'costPrice', currency: true },
    { header: 'Selling Price', key: 'sellingPrice', currency: true },
    { header: 'Deleted At', key: 'deletedAt' },
  ];
  const filterSubtitle = buildFilterSubtitle([['Category', categoryFilter]], {
    searchTerm,
  });

  return (
    <div className="flex flex-col space-y-2">
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PackageX className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg font-semibold">
                  Inactive Products
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Soft-deleted products
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search products..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-8 w-[240px] text-sm py-2 pl-10 pr-3"
                />
              </div>
              <TableExportMenu
                title="Inactive Products"
                subtitle="Soft-deleted inventory"
                dynamicSubtitle={`Filters: ${filterSubtitle}`}
                filenameBase="inactive-products"
                columns={exportColumns}
                rows={exportRows as unknown as Record<string, unknown>[]}
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-sm"
                  >
                    <Filter className="h-4 w-4 mr-1.5" /> Filters
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="end">
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Category
                      </label>
                      <Select
                        value={categoryFilter}
                        onValueChange={setCategoryFilter}
                      >
                        <SelectTrigger className="h-8 w-full text-xs px-2 py-1 mt-1">
                          <SelectValue placeholder="Filter by category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {Array.from(
                            new Set(products.map((p) => p.categoryName)),
                          )
                            .sort()
                            .map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {hasActiveFilters && (
                      <div className="pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearAllFilters}
                          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground w-full"
                        >
                          <X className="h-3 w-3 mr-1" /> Clear filters
                        </Button>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-3 px-4 text-left font-medium">
                    <button
                      className="group flex items-center hover:text-foreground transition-colors"
                      onClick={() => handleSort('product')}
                    >
                      Product
                      {getSortIcon('product')}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-left font-medium">
                    <button
                      className="group flex items-center hover:text-foreground transition-colors"
                      onClick={() => handleSort('brand')}
                    >
                      Brand
                      {getSortIcon('brand')}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-left font-medium">
                    <button
                      className="group flex items-center hover:text-foreground transition-colors"
                      onClick={() => handleSort('category')}
                    >
                      Category
                      {getSortIcon('category')}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-left font-medium">
                    <button
                      className="group flex items-center hover:text-foreground transition-colors"
                      onClick={() => handleSort('lotNumber')}
                    >
                      Lot #{getSortIcon('lotNumber')}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-left font-medium">
                    <button
                      className="group flex items-center hover:text-foreground transition-colors"
                      onClick={() => handleSort('expiry')}
                    >
                      Expiry
                      {getSortIcon('expiry')}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-left font-medium">
                    <button
                      className="group flex items-center hover:text-foreground transition-colors"
                      onClick={() => handleSort('quantity')}
                    >
                      Qty
                      {getSortIcon('quantity')}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-left font-medium">
                    <button
                      className="group flex items-center hover:text-foreground transition-colors"
                      onClick={() => handleSort('costPrice')}
                    >
                      Cost Price
                      {getSortIcon('costPrice')}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-left font-medium">
                    <button
                      className="group flex items-center hover:text-foreground transition-colors"
                      onClick={() => handleSort('sellingPrice')}
                    >
                      Selling Price
                      {getSortIcon('sellingPrice')}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-left font-medium">
                    <button
                      className="group flex items-center hover:text-foreground transition-colors"
                      onClick={() => handleSort('deletedAt')}
                    >
                      Deleted At
                      {getSortIcon('deletedAt')}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-3 px-4">{p.name}</td>
                    <td className="py-3 px-4">{p.brandName || '-'}</td>
                    <td className="py-3 px-4">{p.categoryName}</td>
                    <td className="py-3 px-4">{p.lotNumber}</td>
                    <td className="py-3 px-4">
                      {p.expiryDate
                        ? new Date(p.expiryDate).toISOString().slice(0, 10)
                        : ''}
                    </td>
                    <td className="py-3 px-4">
                      {formatQuantityWithUnit(p.quantity, p.unit)}
                    </td>
                    <td className="py-3 px-4">
                      {p.costPrice.toLocaleString('en-PH', {
                        style: 'currency',
                        currency: 'PHP',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      {p.sellingPrice.toLocaleString('en-PH', {
                        style: 'currency',
                        currency: 'PHP',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      {p.deletedAt
                        ? new Date(p.deletedAt).toISOString().slice(0, 10)
                        : '-'}
                    </td>
                    <td className="py-3 px-4">
                      {onRestore && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => onRestore(p)}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" /> Restore
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="py-6 text-center text-muted-foreground"
                    >
                      No products found
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                {products.length > 0 && (
                  <tr>
                    <td colSpan={columns.length} className="py-2 px-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium">Rows per page</p>
                          <Select
                            value={`${itemsPerPage}`}
                            onValueChange={(v) => setItemsPerPage(Number(v))}
                          >
                            <SelectTrigger className="h-8 w-[70px]">
                              <SelectValue placeholder={itemsPerPage} />
                            </SelectTrigger>
                            <SelectContent side="top">
                              {[10, 20, 30, 40, 50].map((pageSize) => (
                                <SelectItem
                                  key={pageSize}
                                  value={`${pageSize}`}
                                >
                                  {pageSize}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium text-muted-foreground">
                            Page {currentPage} of {totalPages}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={() =>
                                setCurrentPage(Math.max(1, currentPage - 1))
                              }
                              disabled={currentPage === 1}
                            >
                              <span className="sr-only">
                                Go to previous page
                              </span>
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="min-w-[68px] text-center text-xs text-muted-foreground">
                              {sorted.length.toLocaleString('en-PH')}{' '}
                              {sorted.length === 1 ? 'item' : 'items'}
                            </div>
                            <Button
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={() =>
                                setCurrentPage(
                                  Math.min(totalPages, currentPage + 1),
                                )
                              }
                              disabled={currentPage === totalPages}
                            >
                              <span className="sr-only">Go to next page</span>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Memoize the component to prevent re-renders when parent state changes
// Only re-renders when products array reference changes or onRestore callback changes
export const InactiveProductsTable = React.memo(
  InactiveProductsTableInner,
  (prevProps, nextProps) => {
    return (
      prevProps.products === nextProps.products &&
      prevProps.onRestore === nextProps.onRestore
    );
  },
);
