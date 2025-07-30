'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/DataTableColumnHeader';
import { Adjustment } from '@/types';
import AdjustmentActions from '@/components/AdjustmentActions';

export const columns: ColumnDef<Adjustment>[] = [
  {
    accessorKey: 'id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID" />
    ),
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue<number>()}</span>
    ),
    enableSorting: true,
    size: 60,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Product" />
    ),
    cell: ({ row }) => {
      const adjustment = row.original;
      return (
        <div className="space-y-1">
          <span className="font-medium text-gray-900">{adjustment.name}</span>
          {adjustment.genericName && (
            <p className="text-xs text-gray-500">{adjustment.genericName}</p>
          )}
        </div>
      );
    },
    size: 180,
  },
  {
    accessorKey: 'brandName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Brand" />
    ),
    cell: ({ row }) => {
      const brandName = row.original.brandName;
      return (
        <div className="text-sm">
          {brandName ? (
            <span className="text-gray-900 font-medium">{brandName}</span>
          ) : (
            <span className="text-gray-400 text-xs">—</span>
          )}
        </div>
      );
    },
    size: 120,
  },
  {
    accessorKey: 'lotNumber',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Batch" />
    ),
    cell: ({ row }) => {
      const lotNumber = row.original.lotNumber;
      return (
        <div className="text-sm">
          {lotNumber ? (
            <span className="bg-gray-50 text-gray-700 px-2 py-1 rounded text-xs font-mono">
              {lotNumber}
            </span>
          ) : (
            <span className="text-gray-400 text-xs">—</span>
          )}
        </div>
      );
    },
    size: 120,
  },
  {
    accessorKey: 'quantityChange',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Adjustment" />
    ),
    cell: ({ row }) => {
      const value = row.original.quantityChange;
      const unit = row.original.unit;
      const isNegative = value < 0;
      return (
        <div className="flex flex-col">
          <span
            className={`text-sm font-medium ${
              isNegative ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {isNegative ? '' : '+'}
            {value} {unit?.toLowerCase() || 'pcs'}
          </span>
        </div>
      );
    },
    size: 100,
  },
  {
    accessorKey: 'reason',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Reason" />
    ),
    cell: ({ getValue }) => (
      <span className="text-sm">{getValue<string>()}</span>
    ),
    size: 100,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ getValue }) => {
      const date = new Date(getValue<string>());
      return (
        <span className="text-sm text-muted-foreground">
          {date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
          })}
        </span>
      );
    },
    size: 120,
  },
  {
    id: 'actions',
    header: () => <div className="text-center">Actions</div>,
    cell: ({ row }) => <AdjustmentActions adjustment={row.original} />,
    size: 80,
  },
];
