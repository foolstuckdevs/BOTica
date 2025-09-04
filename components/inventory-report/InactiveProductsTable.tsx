'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  FileDown,
  PackageX,
  Filter,
  X,
} from 'lucide-react';
import type { InventoryProductRow } from '@/types';
import {
  exportToExcel,
  exportToPDF,
  exportFormatters,
  type ExportTable,
} from '@/lib/exporters';

interface Props {
  products: InventoryProductRow[];
  searchTerm: string;
  onSearchChange: (v: string) => void;
  categoryFilter?: string;
  onCategoryFilterChange?: (v: string) => void;
}

export function InactiveProductsTable({
  products,
  searchTerm,
  onSearchChange,
  categoryFilter = 'all',
  onCategoryFilterChange,
}: Props) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, itemsPerPage]);

  const clearAllFilters = () => {
    if (onCategoryFilterChange) onCategoryFilterChange('all');
    onSearchChange('');
  };
  const hasActiveFilters = categoryFilter !== 'all' || searchTerm !== '';

  const filtered = React.useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.brandName || '').toLowerCase().includes(term) ||
          p.categoryName.toLowerCase().includes(term) ||
          p.lotNumber.toLowerCase().includes(term),
      )
      .filter(
        (p) => categoryFilter === 'all' || p.categoryName === categoryFilter,
      );
  }, [products, searchTerm, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginated = filtered.slice(startIndex, endIndex);

  const columns = [
    { header: 'Product', key: 'name' },
    { header: 'Brand', key: 'brandName' },
    { header: 'Category', key: 'categoryName' },
    { header: 'Lot #', key: 'lotNumber' },
    {
      header: 'Expiry',
      key: 'expiryDate',
      formatter: (v: unknown) => exportFormatters.date(v),
    },
    { header: 'Qty', key: 'quantity' },
    { header: 'Unit', key: 'unit' },
    {
      header: 'Cost Price',
      key: 'costPrice',
      formatter: (v: unknown) => exportFormatters.phpCurrency(v),
    },
    {
      header: 'Selling Price',
      key: 'sellingPrice',
      formatter: (v: unknown) => exportFormatters.phpCurrency(v),
    },
    {
      header: 'Deleted At',
      key: 'deletedAt',
      formatter: (v: unknown) => (v ? exportFormatters.date(v) : '-'),
    },
  ];

  const buildExport = (): ExportTable[] => {
    const rows = filtered.map((p) => ({
      name: p.name,
      brandName: p.brandName || '',
      categoryName: p.categoryName,
      lotNumber: p.lotNumber,
      expiryDate: p.expiryDate,
      quantity: p.quantity,
      unit: p.unit || '',
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      deletedAt: p.deletedAt ?? '',
    }));
    return [{ name: 'Inactive Products', columns, rows }];
  };

  const getSubtitle = () => {
    const categoryLabel =
      categoryFilter !== 'all' ? ` • Category: ${categoryFilter}` : '';
    return `Filter: All Inactive${categoryLabel}${
      searchTerm ? ` • Search: "${searchTerm}"` : ''
    } • ${filtered.length} item${filtered.length !== 1 ? 's' : ''} found`;
  };

  const onExportPDF = () =>
    exportToPDF({
      title: 'Inactive Products',
      subtitle: getSubtitle(),
      tables: buildExport(),
      filename: 'inactive-products.pdf',
      orientation: 'landscape',
    });

  const onExportExcel = () =>
    exportToExcel({
      filename: 'inactive-products.xlsx',
      sheets: buildExport(),
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
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="h-8 w-[240px] text-sm py-2 pl-10 pr-3"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-sm"
                  >
                    <FileDown className="h-4 w-4 mr-1.5" /> Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onExportPDF}>
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onExportExcel}>
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                        onValueChange={onCategoryFilterChange}
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
                  {columns.map((c) => (
                    <th
                      key={c.header}
                      className="py-3 px-4 text-left font-medium"
                    >
                      {c.header}
                    </th>
                  ))}
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
                      {exportFormatters.date(p.expiryDate)}
                    </td>
                    <td className="py-3 px-4">{p.quantity}</td>
                    <td className="py-3 px-4">{p.unit || '-'}</td>
                    <td className="py-3 px-4">
                      {exportFormatters.phpCurrency(p.costPrice)}
                    </td>
                    <td className="py-3 px-4">
                      {exportFormatters.phpCurrency(p.sellingPrice)}
                    </td>
                    <td className="py-3 px-4">
                      {p.deletedAt ? exportFormatters.date(p.deletedAt) : '-'}
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
