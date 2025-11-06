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
import { Input } from '@/components/ui/input';
import { DataTablePagination } from '@/components/DataTablePagination';
import { DataTableViewOptions } from '@/components/DataTableViewOptions';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  showItemCount?: boolean;
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
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState('');
  // Local pagination state for non-manual mode to avoid undefined pagination during initial render
  const [localPagination, setLocalPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

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
