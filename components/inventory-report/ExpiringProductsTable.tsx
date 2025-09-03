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
import {
  ChevronLeft,
  ChevronRight,
  Search,
  FileDown,
  Filter,
  Package2,
  X,
} from 'lucide-react';
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
import type { ExpiringProductData } from '@/types';
import { format } from 'date-fns';
import {
  exportToExcel,
  exportToPDF,
  exportFormatters,
  type ExportTable,
} from '@/lib/exporters';

interface Props {
  products: ExpiringProductData[];
  searchTerm: string;
  onSearchChange: (v: string) => void;
  expiryFilter: 'all' | '30days' | '60days' | '90days';
  onExpiryFilterChange: (v: 'all' | '30days' | '60days' | '90days') => void;
  statusFilter?: 'all' | 'expired' | 'critical' | 'warning' | 'normal';
  onStatusFilterChange?: (
    v: 'all' | 'expired' | 'critical' | 'warning' | 'normal',
  ) => void;
  categoryFilter?: string;
  onCategoryFilterChange?: (v: string) => void;
}

export function ExpiringProductsTable({
  products,
  searchTerm,
  onSearchChange,
  expiryFilter,
  onExpiryFilterChange,
  statusFilter = 'all',
  onStatusFilterChange,
  categoryFilter = 'all',
  onCategoryFilterChange,
}: Props) {
  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const clearAllFilters = () => {
    onExpiryFilterChange('all');
    if (onStatusFilterChange) onStatusFilterChange('all');
    if (onCategoryFilterChange) onCategoryFilterChange('all');
    onSearchChange('');
  };

  const hasActiveFilters =
    expiryFilter !== 'all' ||
    statusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    searchTerm !== '';

  // Helper functions for display logic
  const getDisplayDaysRemaining = (daysRemaining: number): string => {
    return daysRemaining < 0 ? '0 days' : `${daysRemaining} days`;
  };

  const getDisplayStatus = (
    urgency: string,
    daysRemaining: number,
  ): { text: string; className: string } => {
    if (daysRemaining < 0) {
      return {
        text: 'Expired',
        className: 'bg-red-100 text-red-800',
      };
    }

    // Use original urgency for non-expired products
    switch (urgency) {
      case 'critical':
        return {
          text: 'Critical',
          className: 'bg-red-100 text-red-800',
        };
      case 'warning':
        return {
          text: 'Warning',
          className: 'bg-amber-100 text-amber-800',
        };
      default:
        return {
          text: 'Normal',
          className: 'bg-green-100 text-green-800',
        };
    }
  };

  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, expiryFilter, statusFilter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(products.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginated = products.slice(startIndex, endIndex);

  // Build export data
  const buildExport = (): ExportTable[] => {
    const columns = [
      { header: 'Product Name', key: 'name' },
      { header: 'Brand', key: 'brandName' },
      { header: 'Category', key: 'categoryName' },
      { header: 'Lot Number', key: 'lotNumber' },
      { header: 'Quantity', key: 'quantity' },
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
        header: 'Total Value',
        key: 'value',
        formatter: (v: unknown) => exportFormatters.phpCurrency(v),
      },
      {
        header: 'Expiry Date',
        key: 'expiryDate',
        formatter: (v: unknown) => exportFormatters.date(v),
      },
      {
        header: 'Days Remaining',
        key: 'daysRemaining',
        formatter: (v: unknown) => ((v as number) < 0 ? '0 days' : `${v} days`),
      },
      {
        header: 'Status',
        key: 'status',
      },
    ];

    const rows = products.map((product) => ({
      name: product.name,
      brandName: product.brandName || '',
      categoryName: product.categoryName,
      lotNumber: product.lotNumber,
      quantity: product.quantity,
      unit: product.unit || '',
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      value: product.value,
      expiryDate: product.expiryDate,
      daysRemaining: product.daysRemaining,
      status: getDisplayStatus(product.urgency, product.daysRemaining).text,
    }));

    return [{ name: 'Expiring Products', columns, rows }];
  };

  const getSubtitle = () => {
    const filterLabel = {
      all: 'All Products',
      '30days': 'Expiring in 30 Days',
      '60days': 'Expiring in 60 Days',
      '90days': 'Expiring in 90 Days',
    }[expiryFilter];

    const statusLabel =
      statusFilter !== 'all'
        ? ` • Status: ${
            statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)
          }`
        : '';

    const categoryLabel =
      categoryFilter !== 'all' ? ` • Category: ${categoryFilter}` : '';

    return `Filter: ${filterLabel}${statusLabel}${categoryLabel}${
      searchTerm ? ` • Search: "${searchTerm}"` : ''
    } • ${products.length} product${products.length !== 1 ? 's' : ''} found`;
  };

  const onExportPDF = () =>
    exportToPDF({
      title: 'Expiring Products Report',
      subtitle: getSubtitle(),
      tables: buildExport(),
      filename: 'expiring-products.pdf',
      orientation: 'landscape',
    });

  const onExportExcel = () =>
    exportToExcel({
      filename: 'expiring-products.xlsx',
      sheets: buildExport(),
    });

  return (
    <div className="flex flex-col space-y-2">
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg font-semibold">
                  Expiring Products
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Monitor product expiry dates and inventory health
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
                    <FileDown className="h-4 w-4 mr-1.5" />
                    Export
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
                    <Filter className="h-4 w-4 mr-1.5" />
                    Filters
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="end">
                  <div className="space-y-2">
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          Expiry
                        </label>
                        <Select
                          value={expiryFilter}
                          onValueChange={onExpiryFilterChange}
                        >
                          <SelectTrigger className="h-8 w-full text-xs px-2 py-1 mt-1">
                            <SelectValue placeholder="Filter by expiry" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Expiry</SelectItem>
                            <SelectItem value="30days">30 Days</SelectItem>
                            <SelectItem value="60days">60 Days</SelectItem>
                            <SelectItem value="90days">90 Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          Status
                        </label>
                        <Select
                          value={statusFilter}
                          onValueChange={onStatusFilterChange}
                        >
                          <SelectTrigger className="h-8 w-full text-xs px-2 py-1 mt-1">
                            <SelectValue placeholder="Filter by urgency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="warning">Warning</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
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
                  <th className="py-3 px-4 text-left font-medium">
                    Expiry Date
                  </th>
                  <th className="py-3 px-4 text-left font-medium">
                    Days Remaining
                  </th>
                  <th className="py-3 px-4 text-left font-medium">Quantity</th>
                  <th className="py-3 px-4 text-left font-medium">Value</th>
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
                        {format(new Date(product.expiryDate), 'MMM d, yyyy')}
                      </td>
                      <td className="py-3 px-4">
                        {getDisplayDaysRemaining(product.daysRemaining)}
                      </td>
                      <td className="py-3 px-4">
                        {product.quantity} {product.unit}
                      </td>
                      <td className="py-3 px-4">
                        {formatCurrency(product.value)}
                      </td>
                      <td className="py-3 px-4">
                        {(() => {
                          const statusInfo = getDisplayStatus(
                            product.urgency,
                            product.daysRemaining,
                          );
                          return (
                            <span
                              className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}
                            >
                              {statusInfo.text}
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-6 text-center text-muted-foreground"
                    >
                      No expiring products found
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                {products.length > 0 && (
                  <tr>
                    <td colSpan={8} className="py-2 px-2">
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
