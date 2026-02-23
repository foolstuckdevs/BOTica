'use client';

import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';
import type { TableMeta } from '@tanstack/react-table';

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import React from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { DataTablePagination } from '@/components/DataTablePagination';
import { DataTableViewOptions } from '@/components/DataTableViewOptions';

// ---------------------------------------------------------------------------
// URL Search‑Param helpers – keep table state across router.refresh()
// ---------------------------------------------------------------------------
const DT_PARAM = {
  PAGE: 'dt_page',
  PAGE_SIZE: 'dt_size',
  SORT: 'dt_sort',
  SEARCH: 'dt_q',
  COLS: 'dt_cols',
} as const;

/** Parse sorting string  "col.desc,col2.asc" → SortingState */
function parseSorting(raw: string | null): SortingState {
  if (!raw) return [];
  return raw.split(',').map((s) => {
    const [id, dir] = s.split('.');
    return { id, desc: dir === 'desc' };
  });
}

/** Serialize SortingState → "col.desc,col2.asc" */
function serializeSorting(sorting: SortingState): string {
  return sorting.map((s) => `${s.id}.${s.desc ? 'desc' : 'asc'}`).join(',');
}

/** Parse hidden-columns param  "col1,col2" → VisibilityState */
function parseVisibility(raw: string | null): VisibilityState {
  if (!raw) return {};
  const vis: VisibilityState = {};
  raw.split(',').forEach((col) => {
    if (col) vis[col] = false;
  });
  return vis;
}

/** Serialize VisibilityState → "col1,col2" (only hidden ones) */
function serializeVisibility(v: VisibilityState): string {
  return Object.entries(v)
    .filter(([, visible]) => !visible)
    .map(([col]) => col)
    .join(',');
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  showItemCount?: boolean;
  /** Set to true to disable URL persistence (e.g. for nested/modal tables) */
  disableUrlState?: boolean;
  searchConfig?: {
    enabled: boolean;
    placeholder?: string;
    searchableColumns?: string[]; // Column keys to search in
    globalFilter?: boolean; // Use global filter vs column-specific filter
  };
  manualPagination?: {
    pageIndex: number; // zero-based
    pageSize: number;
    pageCount: number; // total number of pages (for server mode)
    onPageChange: (nextPageIndex: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    isLoading?: boolean;
    totalItems?: number;
  };
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  searchConfig = {
    enabled: true,
    placeholder: 'Search...',
    globalFilter: false,
  },
  manualPagination,
  showItemCount = true,
  disableUrlState = false,
}: DataTableProps<TData, TValue>) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Determine whether we should use URL persistence
  // Disable for manual-pagination tables (they manage their own URL state)
  const useUrlState = !disableUrlState && !manualPagination;

  // ---------------------------------------------------------------------------
  // Initialise state from URL search params (survives router.refresh)
  // ---------------------------------------------------------------------------
  const [sorting, setSorting] = React.useState<SortingState>(() =>
    useUrlState ? parseSorting(searchParams.get(DT_PARAM.SORT)) : [],
  );
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() =>
      useUrlState ? parseVisibility(searchParams.get(DT_PARAM.COLS)) : {},
    );
  const [globalFilter, setGlobalFilter] = React.useState(() =>
    useUrlState ? searchParams.get(DT_PARAM.SEARCH) ?? '' : '',
  );
  // Local pagination state for non-manual mode
  const [localPagination, setLocalPagination] = React.useState(() => {
    if (!useUrlState) return { pageIndex: 0, pageSize: 10 };
    const page = parseInt(searchParams.get(DT_PARAM.PAGE) ?? '1', 10);
    const size = parseInt(searchParams.get(DT_PARAM.PAGE_SIZE) ?? '10', 10);
    return {
      pageIndex: Math.max(0, page - 1),
      pageSize: Math.max(1, Math.min(100, size)),
    };
  });

  // ---------------------------------------------------------------------------
  // Sync state → URL (debounced to avoid excessive history pushes)
  // ---------------------------------------------------------------------------
  const urlSyncRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!useUrlState) return;

    if (urlSyncRef.current) clearTimeout(urlSyncRef.current);
    urlSyncRef.current = setTimeout(() => {
      // Read current URL params directly to avoid stale searchParams closure
      const params = new URLSearchParams(window.location.search);

      // Page (1-based in URL for readability)
      if (localPagination.pageIndex > 0) {
        params.set(DT_PARAM.PAGE, String(localPagination.pageIndex + 1));
      } else {
        params.delete(DT_PARAM.PAGE);
      }

      // Page size
      if (localPagination.pageSize !== 10) {
        params.set(DT_PARAM.PAGE_SIZE, String(localPagination.pageSize));
      } else {
        params.delete(DT_PARAM.PAGE_SIZE);
      }

      // Sorting
      const sortStr = serializeSorting(sorting);
      if (sortStr) {
        params.set(DT_PARAM.SORT, sortStr);
      } else {
        params.delete(DT_PARAM.SORT);
      }

      // Search / global filter
      if (globalFilter) {
        params.set(DT_PARAM.SEARCH, globalFilter);
      } else {
        params.delete(DT_PARAM.SEARCH);
      }

      // Hidden columns
      const colStr = serializeVisibility(columnVisibility);
      if (colStr) {
        params.set(DT_PARAM.COLS, colStr);
      } else {
        params.delete(DT_PARAM.COLS);
      }

      const qs = params.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;

      // Use replaceState to update URL without triggering Next.js navigation
      window.history.replaceState(window.history.state, '', url);
    }, 300);

    return () => {
      if (urlSyncRef.current) clearTimeout(urlSyncRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    useUrlState,
    localPagination.pageIndex,
    localPagination.pageSize,
    sorting,
    globalFilter,
    columnVisibility,
  ]);

  // ---------------------------------------------------------------------------
  // Auto-clamp page index when data shrinks (e.g. after delete on last page)
  // ---------------------------------------------------------------------------
  React.useEffect(() => {
    if (manualPagination) return; // manual mode handles this externally
    const totalRows = data.length;
    const maxPage = Math.max(0, Math.ceil(totalRows / localPagination.pageSize) - 1);
    if (localPagination.pageIndex > maxPage) {
      setLocalPagination((prev) => ({ ...prev, pageIndex: maxPage }));
    }
  }, [data.length, localPagination.pageSize, localPagination.pageIndex, manualPagination]);

  // When manual pagination is used, table state is driven externally.
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: manualPagination
      ? undefined
      : getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    manualPagination: !!manualPagination,
    pageCount: manualPagination ? manualPagination.pageCount : undefined,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
      pagination: manualPagination
        ? {
            pageIndex: manualPagination.pageIndex,
            pageSize: manualPagination.pageSize,
          }
        : localPagination,
    },
    onPaginationChange: (updater) => {
      if (manualPagination) {
        const current = {
          pageIndex: manualPagination.pageIndex,
          pageSize: manualPagination.pageSize,
        };
        const nextState =
          typeof updater === 'function' ? updater(current) : updater;
        if (nextState.pageSize !== current.pageSize) {
          manualPagination.onPageSizeChange(nextState.pageSize);
        }
        if (nextState.pageIndex !== current.pageIndex) {
          manualPagination.onPageChange(nextState.pageIndex);
        }
      } else {
        setLocalPagination((prev) => {
          const nextState =
            typeof updater === 'function' ? updater(prev) : updater;
          return {
            pageIndex: nextState.pageIndex ?? prev.pageIndex,
            pageSize: nextState.pageSize ?? prev.pageSize,
          };
        });
      }
    },
    meta: {
      totalItems: manualPagination?.totalItems,
      showItemCount,
    } as TableMeta<TData>,
  });

  // Determine which column to apply a column-specific filter to (when not using global filter)
  const targetColumnId = React.useMemo(() => {
    if (!searchConfig.enabled || searchConfig.globalFilter) return undefined;

    const allCols = table.getAllColumns();
    const colIds = new Set(allCols.map((c) => c.id));

    // 1. Explicit searchableColumns list
    if (searchConfig.searchableColumns?.length) {
      for (const id of searchConfig.searchableColumns) {
        if (colIds.has(id)) return id;
      }
    }
    // 2. Backwards compat 'name' only if it actually exists
    if (colIds.has('name')) return 'name';
    // 3. First filterable column
    const firstFilterable = allCols.find((c) => c.getCanFilter());
    return firstFilterable?.id;
  }, [
    searchConfig.enabled,
    searchConfig.globalFilter,
    searchConfig.searchableColumns,
    table,
  ]);

  // Restore column-specific search from URL (must run after targetColumnId is resolved)
  const columnSearchRestoredRef = React.useRef(false);
  React.useEffect(() => {
    if (columnSearchRestoredRef.current) return;
    if (!useUrlState || !targetColumnId || searchConfig.globalFilter) return;
    const urlSearch = searchParams.get(DT_PARAM.SEARCH);
    if (urlSearch) {
      table.getColumn(targetColumnId)?.setFilterValue(urlSearch);
      columnSearchRestoredRef.current = true;
    }
  }, [useUrlState, targetColumnId, searchConfig.globalFilter, searchParams, table]);

  // For column-specific search, also sync the filter value → URL
  React.useEffect(() => {
    if (!useUrlState || searchConfig.globalFilter || !targetColumnId) return;
    const colVal =
      (table.getColumn(targetColumnId)?.getFilterValue() as string) ?? '';
    // We only sync to URL — the actual state is in columnFilters
    if (urlSyncRef.current) clearTimeout(urlSyncRef.current);
    urlSyncRef.current = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (colVal) {
        params.set(DT_PARAM.SEARCH, colVal);
      } else {
        params.delete(DT_PARAM.SEARCH);
      }
      const qs = params.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      window.history.replaceState(window.history.state, '', url);
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnFilters]);

  const searchValue = React.useMemo(() => {
    if (!searchConfig.enabled) return '';
    if (searchConfig.globalFilter) return globalFilter;
    if (targetColumnId) {
      return (
        (table.getColumn(targetColumnId)?.getFilterValue() as string) || ''
      );
    }
    return '';
  }, [
    searchConfig.enabled,
    searchConfig.globalFilter,
    globalFilter,
    targetColumnId,
    table,
  ]);

  const setSearchValue = (value: string) => {
    if (!searchConfig.enabled) return; // no-op when search disabled
    if (searchConfig.globalFilter) {
      setGlobalFilter(value);
    } else if (targetColumnId) {
      table.getColumn(targetColumnId)?.setFilterValue(value);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        {searchConfig.enabled && (
          <Input
            placeholder={searchConfig.placeholder || 'Search...'}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            className="max-w-sm"
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <DataTableViewOptions table={table} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border relative min-h-[160px]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 rounded-full border-4 border-muted border-t-primary animate-spin" />
              <span className="text-xs text-muted-foreground tracking-wide">
                Loading...
              </span>
            </div>
          </div>
        )}
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {!isLoading &&
              table.getRowModel().rows?.length > 0 &&
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && table.getRowModel().rows?.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="mt-2">
        <DataTablePagination table={table} />
        {manualPagination?.isLoading && !isLoading && (
          <div className="text-xs text-muted-foreground mt-1">Loading...</div>
        )}
      </div>
    </div>
  );
}
