'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { columns, ActivityRow } from './columns';

interface ApiResponse {
  data: ActivityRow[];
  total: number;
  page: number; // 1-based
  pageSize: number;
  pageCount: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function ActivityLogPageClient() {
  const [pageIndex, setPageIndex] = useState(0); // zero-based for table
  const [pageSize, setPageSize] = useState(50);
  const [serverPage, setServerPage] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async (p: number, size: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(p)); // 1-based
      params.set('pageSize', String(size));
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
  }, []);

  // Track initial load separate from serverPage to prevent effect re-trigger loops
  const didInitialLoadRef = useRef(false);
  useEffect(() => {
    if (!didInitialLoadRef.current) {
      didInitialLoadRef.current = true;
      load(1, pageSize);
      return;
    }
    const handle = setTimeout(() => {
      load(pageIndex + 1, pageSize);
    }, 250);
    return () => clearTimeout(handle);
  }, [pageIndex, pageSize, load]);

  const data: ActivityRow[] = serverPage?.data || [];

  return (
    <div className="space-y-4">
      {/* Search removed per request */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}
      <DataTable
        columns={columns}
        data={data}
        isLoading={loading && !serverPage}
        searchConfig={{ enabled: false }}
        manualPagination={{
          pageIndex,
          pageSize,
          pageCount: serverPage?.pageCount || 1,
          onPageChange: setPageIndex,
          onPageSizeChange: (size) => setPageSize(size),
          isLoading: loading,
        }}
      />
    </div>
  );
}
