'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/DataTableColumnHeader';
import { PurchaseOrder } from '@/types';
import PurchaseOrderActions from '@/components/PurchaseOrderActions';
import { Badge } from '@/components/ui/badge';

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
      <DataTableColumnHeader column={column} title="Order Date" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue('orderDate'));
      return date.toLocaleDateString();
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as string;

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
    id: 'actions',
    header: () => <div className="pl-3">Actions</div>,
    cell: ({ row }) => {
      const order = row.original;
      return <PurchaseOrderActions order={order} />;
    },
  },
];
