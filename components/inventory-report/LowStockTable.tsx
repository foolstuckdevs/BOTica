'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TableExportMenu } from '@/components/TableExportMenu';
import { buildFilterSubtitle } from '@/lib/filterSubtitle';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Package2,
  Filter,
  X,
} from 'lucide-react';
import type { LowStockProductData } from '@/types';

interface Props {
  products: LowStockProductData[];
  searchTerm: string;
  onSearchChange: (v: string) => void;
  statusFilter?: 'all' | 'out_of_stock' | 'critical' | 'low';
  onStatusFilterChange?: (
    v: 'all' | 'out_of_stock' | 'critical' | 'low',
  ) => void;
  categoryFilter?: string;
  onCategoryFilterChange?: (v: string) => void;
}

export function LowStockTable({
  products,
  searchTerm,
  onSearchChange,
  statusFilter = 'all',
  onStatusFilterChange,
  categoryFilter = 'all',
  onCategoryFilterChange,
}: Props) {
  const clearAllFilters = () => {
    if (onStatusFilterChange) onStatusFilterChange('all');
    if (onCategoryFilterChange) onCategoryFilterChange('all');
    onSearchChange('');
  };

  const hasActiveFilters =
    statusFilter !== 'all' || categoryFilter !== 'all' || searchTerm !== '';

  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(products.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginated = products.slice(startIndex, endIndex);

  // Build export data (full list respects current filters already applied upstream if any)
  const exportRows = products.map((p) => ({
    name: p.name + (p.brandName ? ` (${p.brandName})` : ''),
    brandName: p.brandName,
    categoryName: p.categoryName,
    lotNumber: p.lotNumber,
    quantity: p.quantity,
    reorderPoint: p.reorderPoint,
    supplierName: p.supplierName,
    status: p.status,
    unit: p.unit,
  }));
  const exportColumns = [
    { header: 'Product', key: 'name' },
    { header: 'Brand', key: 'brandName' },
    { header: 'Category', key: 'categoryName' },
    { header: 'Lot #', key: 'lotNumber' },
    { header: 'Qty', key: 'quantity', numeric: true },
    { header: 'Reorder Pt', key: 'reorderPoint', numeric: true },
    { header: 'Supplier', key: 'supplierName' },
    { header: 'Status', key: 'status' },
  ];
  const filterSubtitle = buildFilterSubtitle(
    [
      ['Status', statusFilter],
      ['Category', categoryFilter],
    ],
    { searchTerm },
  );

  return (
    <div className="flex flex-col space-y-2">
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg font-semibold">
                  Low Stock Products
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Products with quantity below their minimum quantity
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="h-8 w-[240px] text-sm py-2 pl-10 pr-3"
                />
              </div>
              <TableExportMenu
                title="Low Stock Products"
                subtitle="Below minimum quantity"
                dynamicSubtitle={`Filters: ${filterSubtitle}`}
                filenameBase="low-stock-products"
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
                    <Filter className="h-4 w-4 mr-1.5" />
                    Filters
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="end">
                  <div className="space-y-2">
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          Status
                        </label>
                        <Select
                          value={statusFilter}
                          onValueChange={onStatusFilterChange}
                        >
                          <SelectTrigger className="h-8 w-full text-xs px-2 py-1 mt-1">
                            <SelectValue placeholder="Filter by status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="out_of_stock">
                              Out of Stock
                            </SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          Category
                        </label>
                        <Select
                          value={categoryFilter}
                          onValueChange={onCategoryFilterChange}
                        >
                          <SelectTrigger className="h-8 w-full text-xs px-2 py-1 mt-1">
                            <SelectValue placeholder="Filter by category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {/* Get unique categories from products */}
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
                    </div>
                    {hasActiveFilters && (
                      <div className="pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearAllFilters}
                          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground w-full"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Clear filters
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
                  <th className="py-3 px-4 text-left font-medium">Product</th>
                  <th className="py-3 px-4 text-left font-medium">Category</th>
                  <th className="py-3 px-4 text-left font-medium">
                    Lot Number
                  </th>
                  <th className="py-3 px-4 text-left font-medium">Quantity</th>
                  <th className="py-3 px-4 text-left font-medium">
                    Minimum Qty
                  </th>
                  <th className="py-3 px-4 text-left font-medium">Supplier</th>
                  <th className="py-3 px-4 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length > 0 ? (
                  paginated.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{product.name}</div>
                          {product.brandName && (
                            <div className="text-xs text-muted-foreground">
                              {product.brandName}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">{product.categoryName}</td>
                      <td className="py-3 px-4">{product.lotNumber}</td>
                      <td className="py-3 px-4">
                        {product.quantity} {product.unit}
                      </td>
                      <td className="py-3 px-4">{product.reorderPoint}</td>
                      <td className="py-3 px-4">{product.supplierName}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            product.status === 'out_of_stock'
                              ? 'bg-gray-100 text-gray-800'
                              : product.status === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {product.status === 'out_of_stock'
                            ? 'Out of Stock'
                            : product.status === 'critical'
                            ? 'Critical'
                            : 'Low'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-6 text-center text-muted-foreground"
                    >
                      No low stock products found
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                {products.length > 0 && (
                  <tr>
                    <td colSpan={7} className="py-2 px-2">
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
                        <div className="flex items-center space-x-6 lg:space-x-8">
                          <div className="flex w-[120px] items-center justify-center text-sm font-medium">
                            Page {currentPage} of {totalPages}
                          </div>
                          <div className="flex items-center space-x-2">
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
