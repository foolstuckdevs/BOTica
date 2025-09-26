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
  };
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchConfig = {
    enabled: true,
    placeholder: 'Search...',
    globalFilter: false,
  },
  manualPagination,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState('');

  // When manual pagination is used, table state is driven externally.
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
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
        ? { pageIndex: manualPagination.pageIndex, pageSize: manualPagination.pageSize }
        : undefined,
    },
    onPaginationChange: (updater) => {
      if (!manualPagination) return; // local mode handled internally by react-table
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
    },
  });

  const searchValue = searchConfig.globalFilter
    ? globalFilter
    : (table.getColumn('name')?.getFilterValue() as string) ?? '';

  const setSearchValue = (value: string) => {
    if (searchConfig.globalFilter) {
      setGlobalFilter(value);
    } else {
      table.getColumn('name')?.setFilterValue(value);
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
      <div className="rounded-md border">
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
            {table.getRowModel().rows?.length ? (
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
              ))
            ) : (
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
        {manualPagination?.isLoading && (
          <div className="text-xs text-muted-foreground mt-1">Loading...</div>
        )}
      </div>
    </div>
  );
}
