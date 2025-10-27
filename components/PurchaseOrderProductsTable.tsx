'use client';

import React, { useState, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Product {
  id: string | number;
  name: string;
  brandName?: string | null;
  categoryName?: string | null;
  quantity: number;
  minStockLevel: number | null;
}

interface Props {
  products: Product[];
  onAddProduct: (product: Product) => void;
  addedProductIds: (string | number)[];
}

type SortColumn = 'name' | 'category' | 'quantity';
type SortDirection = 'asc' | 'desc' | null;

export default function PurchaseOrderProductsTable({
  products,
  onAddProduct,
  addedProductIds,
}: Props) {
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('out');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Extract unique categories
  const categories = React.useMemo(
    () =>
      Array.from(new Set(products.map((p) => p.categoryName)))
        .filter(Boolean)
        .sort() as string[],
    [products],
  );

  // Filter and sort products
  const filteredAndSortedProducts = React.useMemo(() => {
    const filtered = products.filter((p) => {
      // Search filter
      const searchLower = search.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(searchLower) ||
        (p.brandName?.toLowerCase().includes(searchLower) ?? false) ||
        (p.categoryName?.toLowerCase().includes(searchLower) ?? false);

      if (!matchesSearch) return false;

      // Stock filter
      if (stockFilter === 'out' && p.quantity !== 0) return false;
      if (
        stockFilter === 'low' &&
        (p.quantity === 0 || p.quantity > (p.minStockLevel ?? 0))
      )
        return false;

      // Category filter
      if (categoryFilter !== 'all' && p.categoryName !== categoryFilter)
        return false;

      return true;
    });

    // Sort
    if (sortDirection) {
      filtered.sort((a, b) => {
        let aVal: string | number;
        let bVal: string | number;

        switch (sortColumn) {
          case 'name':
            aVal = a.name.toLowerCase();
            bVal = b.name.toLowerCase();
            break;
          case 'category':
            aVal = (a.categoryName ?? '').toLowerCase();
            bVal = (b.categoryName ?? '').toLowerCase();
            break;
          case 'quantity':
            aVal = a.quantity;
            bVal = b.quantity;
            break;
          default:
            return 0;
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        } else {
          return sortDirection === 'asc'
            ? (aVal as number) - (bVal as number)
            : (bVal as number) - (aVal as number);
        }
      });
    }

    return filtered;
  }, [
    products,
    search,
    stockFilter,
    categoryFilter,
    sortColumn,
    sortDirection,
  ]);

  // Handle filter changes - reset to page 1
  const handleFilterChange = useCallback((cb: () => void) => {
    cb();
    setCurrentPage(1);
  }, []);

  // Handle sorting
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn('name');
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Render sort icon
  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column || !sortDirection) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-50" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-1 h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="ml-1 h-3.5 w-3.5" />
    );
  };

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedProducts.length / itemsPerPage),
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredAndSortedProducts.slice(
    startIndex,
    endIndex,
  );

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {/* Search Input - Left side */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) =>
                handleFilterChange(() => setSearch(e.target.value))
              }
              className="pl-9"
            />
          </div>

          {/* Filters - Right side */}
          <div className="flex gap-2">
            {/* Stock Filter */}
            <Select
              value={stockFilter}
              onValueChange={(val) =>
                handleFilterChange(() =>
                  setStockFilter(val as 'all' | 'low' | 'out'),
                )
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select
              value={categoryFilter}
              onValueChange={(val) =>
                handleFilterChange(() => setCategoryFilter(val))
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Products Table */}
        {filteredAndSortedProducts.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        Product {getSortIcon('name')}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('category')}
                    >
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        Category {getSortIcon('category')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                      Status
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('quantity')}
                    >
                      <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                        Stock {getSortIcon('quantity')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                      Min Qty
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedProducts.map((product) => {
                    const alreadyAdded = addedProductIds.includes(product.id);
                    const isOutOfStock = product.quantity === 0;

                    return (
                      <tr
                        key={product.id}
                        className={`hover:bg-gray-50 ${
                          alreadyAdded ? 'opacity-50' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-sm text-gray-900">
                              {product.name}
                            </p>
                            {product.brandName && (
                              <p className="text-xs text-gray-500">
                                {product.brandName}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">
                            {product.categoryName || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 min-w-[90px]">
                              Out of Stock
                            </span>
                          ) : product.quantity <=
                            (product.minStockLevel ?? 0) ? (
                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 min-w-[90px]">
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 min-w-[90px]">
                              In Stock
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`text-sm font-medium ${
                              isOutOfStock ? 'text-red-600' : 'text-yellow-600'
                            }`}
                          >
                            {product.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm text-gray-600">
                            {product.minStockLevel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {alreadyAdded ? (
                            <span className="text-xs text-gray-400">Added</span>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-xs h-8"
                              onClick={() => onAddProduct(product)}
                            >
                              Add to Order
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {filteredAndSortedProducts.length > 0 && (
              <div className="bg-gray-50 border-t px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">Rows per page</p>
                    <Select
                      value={`${itemsPerPage}`}
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue placeholder={itemsPerPage} />
                      </SelectTrigger>
                      <SelectContent side="top">
                        {[10, 20, 30, 40, 50].map((pageSize) => (
                          <SelectItem key={pageSize} value={`${pageSize}`}>
                            {pageSize}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-6 lg:space-x-8">
                    <div className="flex w-[120px] items-center justify-center text-sm font-medium">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1}
                      >
                        <span className="sr-only">Go to previous page</span>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                      >
                        <span className="sr-only">Go to next page</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-gray-500 border rounded-lg">
            No products found matching your filters.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
