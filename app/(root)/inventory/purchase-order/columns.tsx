'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/DataTableColumnHeader';
import { PurchaseOrder } from '@/types';
import PurchaseOrderActions from '@/components/PurchaseOrderActions';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/helpers/formatCurrency';

export const columns: ColumnDef<PurchaseOrder>[] = [
  {
    accessorKey: 'id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="PO #" />
    ),
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Supplier" />
    ),
  },
  {
    accessorKey: 'orderDate',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date Created" />
    ),
    cell: ({ row }) => {
      const dateValue = row.getValue<string>('orderDate');
      const date = new Date(dateValue);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue<string>('status');

      const badgeVariant =
        status === 'PENDING'
          ? 'warning'
          : status === 'RECEIVED'
          ? 'default'
          : 'destructive';

      return <Badge variant={badgeVariant}>{status}</Badge>;
    },
  },
  {
    accessorKey: 'totalItems',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Items" />
    ),
  },
  {
    accessorKey: 'totalQuantity',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Quantity" />
    ),
  },
  {
    accessorKey: 'totalCost',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total Cost" />
    ),
    cell: ({ row }) => {
      const cost = row.getValue<string>('totalCost');
      return <div>{formatCurrency(parseFloat(cost || '0'))}</div>;
    },
  },

  {
    id: 'actions',
    header: () => <div className="pl-3">Actions</div>,
    cell: ({ row }) => {
      const order = row.original;
      return <PurchaseOrderActions order={order} />;
    },
  },
];
