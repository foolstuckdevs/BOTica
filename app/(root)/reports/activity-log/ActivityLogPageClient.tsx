'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { columns, ActivityRow } from './columns';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';

interface ApiResponse {
  data: ActivityRow[];
  total: number;
  page: number; // 1-based
  pageSize: number;
  pageCount: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface FilterOptions {
  users: string[];
  prefixes: string[];
}

/** Map action prefixes to human-readable labels */
const PREFIX_LABELS: Record<string, string> = {
  'PRODUCT_': 'Product',
  'CATEGORY_': 'Category',
  'SUPPLIER_': 'Supplier',
  'ADJUSTMENT_': 'Adjustment',
  'SALE_': 'Sale',
  'AUTH_': 'Authentication',
  'STOCKIN_': 'Stock In',
  'STAFF_': 'Staff',
  'PROFILE_': 'Profile',
  'PASSWORD_': 'Password',
};

export function ActivityLogPageClient() {
  const [pageIndex, setPageIndex] = useState(0); // zero-based for table
  const [pageSize, setPageSize] = useState(50);
  const [serverPage, setServerPage] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    users: [],
    prefixes: [],
  });

  // Load filter options once on mount
  useEffect(() => {
    fetch('/api/activity/filters')
      .then((res) => res.json())
      .then((data: FilterOptions) => setFilterOptions(data))
      .catch(() => {});
  }, []);

  const load = useCallback(
    async (
      p: number,
      size: number,
      search?: string,
      user?: string,
      action?: string,
    ) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('page', String(p)); // 1-based
        params.set('pageSize', String(size));
        if (search) {
          params.set('search', search);
        }
        if (user && user !== 'all') {
          params.set('username', user);
        }
        if (action && action !== 'all') {
          params.set('prefixes', action);
        }
        const res = await fetch(`/api/activity?${params.toString()}`);
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const json: ApiResponse = await res.json();
        setServerPage(json);
      } catch (e: unknown) {
        if (e instanceof Error) setError(e.message);
        else setError('Failed to load');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Track initial load separate from serverPage to prevent effect re-trigger loops
  const didInitialLoadRef = useRef(false);
  useEffect(() => {
    if (!didInitialLoadRef.current) {
      didInitialLoadRef.current = true;
      load(1, pageSize, searchQuery, userFilter, actionFilter);
      return;
    }
    const handle = setTimeout(() => {
      load(pageIndex + 1, pageSize, searchQuery, userFilter, actionFilter);
    }, 300);
    return () => clearTimeout(handle);
  }, [pageIndex, pageSize, searchQuery, userFilter, actionFilter, load]);

  // Reset to first page when filters change
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      setPageIndex(0);
    },
    [],
  );

  const handleUserFilter = useCallback((value: string) => {
    setUserFilter(value);
    setPageIndex(0);
  }, []);

  const handleActionFilter = useCallback((value: string) => {
    setActionFilter(value);
    setPageIndex(0);
  }, []);

  const data: ActivityRow[] = serverPage?.data || [];

  return (
    <>
      {/* Search + Filters bar */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by user, action..."
            aria-label="Search activity logs"
            className="w-64 pl-9"
          />
        </div>

        {/* User Filter */}
        <Select value={userFilter} onValueChange={handleUserFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="All Users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {filterOptions.users.map((user) => (
              <SelectItem key={user} value={user}>
                {user}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Action Filter */}
        <Select value={actionFilter} onValueChange={handleActionFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {filterOptions.prefixes.map((prefix) => (
              <SelectItem key={prefix} value={prefix}>
                {PREFIX_LABELS[prefix] ?? prefix.replace(/_$/, '')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table card */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow border p-2">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-2">
            {error}
          </div>
        )}
        <DataTable
          columns={columns}
          data={data}
          isLoading={loading && !serverPage}
          showItemCount={false}
          searchConfig={{ enabled: false }}
          manualPagination={{
            pageIndex,
            pageSize,
            pageCount: serverPage?.pageCount || 1,
            onPageChange: setPageIndex,
            onPageSizeChange: (size) => setPageSize(size),
            isLoading: loading,
            totalItems: serverPage?.total,
          }}
        />
      </div>
    </>
  );
}
