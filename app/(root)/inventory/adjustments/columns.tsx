'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/DataTableColumnHeader';
import { Adjustment } from '@/types';

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
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Product" />
    ),
    cell: ({ getValue }) => (
      <span className="font-medium">{getValue<string>()}</span>
    ),
  },

  {
    accessorKey: 'quantityChange',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Qty Change" />
    ),
    cell: ({ getValue }) => {
      const value = getValue<number>();
      const isNegative = value < 0;
      return (
        <span className={isNegative ? 'text-red-500' : 'text-green-600'}>
          {isNegative ? '' : '+'}
          {value}
        </span>
      );
    },
  },
  {
    accessorKey: 'reason',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Reason" />
    ),
    cell: ({ getValue }) => (
      <span className="text-sm">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: 'notes',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Notes" />
    ),
    cell: ({ getValue }) => (
      <span className="text-muted-foreground text-sm line-clamp-1">
        {getValue<string>() || '—'}
      </span>
    ),
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
  },
];
