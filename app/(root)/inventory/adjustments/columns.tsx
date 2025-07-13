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
  },
  {
    accessorKey: 'productName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Product" />
    ),
  },
  {
    accessorKey: 'quantityChange',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Quantity Change" />
    ),
  },
  {
    accessorKey: 'reason',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Reason" />
    ),
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt);
      return date.toLocaleString();
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => <AdjustmentActions adjustment={row.original} />, // Optional
  },
];
