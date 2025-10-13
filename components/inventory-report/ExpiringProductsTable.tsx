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
  Filter,
  Package2,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { TableExportMenu } from '@/components/TableExportMenu';
import { buildFilterSubtitle } from '@/lib/filterSubtitle';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { ExpiringProductData } from '@/types';
import { format } from 'date-fns';

interface Props {
  products: ExpiringProductData[];
  searchTerm: string;
  onSearchChange: (v: string) => void;
  expiryFilter: 'all' | '30days' | '60days' | '90days';
  onExpiryFilterChange: (v: 'all' | '30days' | '60days' | '90days') => void;
  // New status taxonomy: expired (<=0), expiring (1-90), warning (91-180), return (181-210)
  statusFilter?: 'all' | 'expired' | 'expiring' | 'warning' | 'return';
  onStatusFilterChange?: (
    v: 'all' | 'expired' | 'expiring' | 'warning' | 'return',
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
  const getDisplayDaysRemaining = (daysRemaining: number): string =>
    daysRemaining < 0 ? '0 days' : `${daysRemaining} days`;

  // Map daysRemaining to status token
  const getStatusToken = (
    daysRemaining: number,
  ): 'expired' | 'expiring' | 'warning' | 'return' | 'exclude' => {
    if (daysRemaining <= 0) return 'expired';
    if (daysRemaining <= 90) return 'expiring';
    if (daysRemaining <= 180) return 'warning';
    if (daysRemaining <= 210) return 'return';
    return 'exclude'; // beyond 7 months, excluded from report
  };

  const statusMeta = React.useMemo(
    () => ({
      expired: { text: 'Expired', className: 'bg-red-100 text-red-800' },
      expiring: {
        text: 'Expiring Soon',
        className: 'bg-yellow-100 text-yellow-800',
      },
      warning: { text: 'Warning', className: 'bg-amber-100 text-amber-800' },
      return: {
        text: 'For Return',
        className: 'bg-indigo-100 text-indigo-800',
      },
    }),
    [],
  );

  const getDisplayStatus = React.useCallback(
    (daysRemaining: number) => {
      const token = getStatusToken(daysRemaining);
      if (token === 'exclude')
        return { text: 'N/A', className: 'bg-muted text-muted-foreground' };
      return statusMeta[token];
    },
    [statusMeta],
  );

  // Internal unmanaged state fallbacks if parent did not pass handlers
  const [internalStatusFilter, setInternalStatusFilter] = React.useState<
    'all' | 'expired' | 'expiring' | 'warning' | 'return'
  >(statusFilter);
  const effectiveStatusFilter = onStatusFilterChange
    ? statusFilter
    : internalStatusFilter;
  const handleStatusChange = (
    v: 'all' | 'expired' | 'expiring' | 'warning' | 'return',
  ) => {
    if (onStatusFilterChange) onStatusFilterChange(v);
    else setInternalStatusFilter(v);
  };

  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const [sortField, setSortField] = React.useState<
    | 'product'
    | 'category'
    | 'lotNumber'
    | 'expiryDate'
    | 'daysRemaining'
    | 'quantity'
    | 'value'
    | 'status'
    | null
  >(null);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>(
    'asc',
  );

  const handleSort = (
    field:
      | 'product'
      | 'category'
      | 'lotNumber'
      | 'expiryDate'
      | 'daysRemaining'
      | 'quantity'
      | 'value'
      | 'status',
  ) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (
    field:
      | 'product'
      | 'category'
      | 'lotNumber'
      | 'expiryDate'
      | 'daysRemaining'
      | 'quantity'
      | 'value'
      | 'status',
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

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, expiryFilter, statusFilter, categoryFilter]);

  // Apply status + exclusion filtering (exclude > 210 days)
  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      const token = getStatusToken(p.daysRemaining);
      if (token === 'exclude') return false;
      if (effectiveStatusFilter === 'all') return true;
      return token === effectiveStatusFilter;
    });
  }, [products, effectiveStatusFilter]);

  // Apply sorting
  const sortedProducts = React.useMemo(() => {
    if (!sortField) return filteredProducts;

    return [...filteredProducts].sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortField) {
        case 'product':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'category':
          aValue = a.categoryName.toLowerCase();
          bValue = b.categoryName.toLowerCase();
          break;
        case 'lotNumber':
          aValue = (a.lotNumber || '').toLowerCase();
          bValue = (b.lotNumber || '').toLowerCase();
          break;
        case 'expiryDate':
          aValue = a.expiryDate ? new Date(a.expiryDate).getTime() : 0;
          bValue = b.expiryDate ? new Date(b.expiryDate).getTime() : 0;
          break;
        case 'daysRemaining':
          aValue = a.daysRemaining;
          bValue = b.daysRemaining;
          break;
        case 'quantity':
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        case 'value':
          aValue = a.value;
          bValue = b.value;
          break;
        case 'status':
          aValue = getDisplayStatus(a.daysRemaining).text.toLowerCase();
          bValue = getDisplayStatus(b.daysRemaining).text.toLowerCase();
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProducts, sortField, sortDirection, getDisplayStatus]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedProducts.length / itemsPerPage),
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginated = sortedProducts.slice(startIndex, endIndex);

  // Build export data (full filtered list, not paginated)
  const exportRows = filteredProducts.map((p) => {
    const status = getDisplayStatus(p.daysRemaining).text;
    return {
      name: p.name + (p.brandName ? ` (${p.brandName})` : ''),
      brandName: p.brandName,
      categoryName: p.categoryName,
      lotNumber: p.lotNumber,
      expiryDate: p.expiryDate,
      daysRemaining: Math.max(0, p.daysRemaining),
      status,
      quantity: p.quantity,
      unit: p.unit,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
    };
  });
  const exportColumns = [
    { header: 'Product', key: 'name' },
    { header: 'Brand', key: 'brandName' },
    { header: 'Category', key: 'categoryName' },
    { header: 'Lot #', key: 'lotNumber' },
    { header: 'Expiry', key: 'expiryDate' },
    { header: 'Days Rem', key: 'daysRemaining', numeric: true },
    { header: 'Status', key: 'status' },
    { header: 'Qty', key: 'quantity', numeric: true },
    { header: 'Unit', key: 'unit' },
    { header: 'Cost Price', key: 'costPrice', currency: true },
    { header: 'Selling Price', key: 'sellingPrice', currency: true },
  ];
  const statusLabelMap: Record<
    'all' | 'expired' | 'expiring' | 'warning' | 'return',
    string
  > = {
    all: 'All',
    expired: 'Expired',
    expiring: 'Expiring Soon',
    warning: 'Warning',
    return: 'For Return',
  };
  const filterSubtitle = buildFilterSubtitle(
    [
      ['Expiry', expiryFilter],
      ['Status', statusLabelMap[effectiveStatusFilter]],
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
                  Expiring Products
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Monitor product expiry dates
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
                title="Expiring Products"
                subtitle="Expiry monitoring"
                dynamicSubtitle={`Filters: ${filterSubtitle}`}
                filenameBase="expiring-products"
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
                          value={effectiveStatusFilter}
                          onValueChange={(
                            v:
                              | 'all'
                              | 'expired'
                              | 'expiring'
                              | 'warning'
                              | 'return',
                          ) => handleStatusChange(v)}
                        >
                          <SelectTrigger className="h-8 w-full text-xs px-2 py-1 mt-1">
                            <SelectValue placeholder="Filter by urgency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                            <SelectItem value="expiring">
                              Expiring Soon (≤ 3 mo)
                            </SelectItem>
                            <SelectItem value="warning">
                              Warning (3–6 mo)
                            </SelectItem>
                            <SelectItem value="return">
                              For Return (6–7 mo)
                            </SelectItem>
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
                      onClick={() => handleSort('expiryDate')}
                    >
                      Expiry
                      {getSortIcon('expiryDate')}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-left font-medium">
                    <button
                      className="group flex items-center hover:text-foreground transition-colors"
                      onClick={() => handleSort('daysRemaining')}
                    >
                      Days Remaining
                      {getSortIcon('daysRemaining')}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-left font-medium">
                    <button
                      className="group flex items-center hover:text-foreground transition-colors"
                      onClick={() => handleSort('quantity')}
                    >
                      Quantity
                      {getSortIcon('quantity')}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-left font-medium">
                    <button
                      className="group flex items-center hover:text-foreground transition-colors"
                      onClick={() => handleSort('value')}
                    >
                      Value
                      {getSortIcon('value')}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-left font-medium">
                    <button
                      className="group flex items-center hover:text-foreground transition-colors"
                      onClick={() => handleSort('status')}
                    >
                      Status
                      {getSortIcon('status')}
                    </button>
                  </th>
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
                      <td className="py-3 px-4">
                        {product.lotNumber || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        {product.expiryDate
                          ? format(new Date(product.expiryDate), 'MMM d, yyyy')
                          : 'N/A'}
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
                {filteredProducts.length > 0 && (
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
