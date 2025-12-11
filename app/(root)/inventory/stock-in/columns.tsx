'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/DataTableColumnHeader';
import type { StockIn } from '@/types';
import { formatDatePH } from '@/lib/date-format';
import { formatCurrency } from '@/lib/helpers/formatCurrency';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import Link from 'next/link';

export const columns: ColumnDef<StockIn>[] = [
  {
    accessorKey: 'supplierName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Supplier" />
    ),
    cell: ({ row }) => (
      <span className="font-medium text-gray-900">
        {row.original.supplierName || '—'}
      </span>
    ),
    size: 200,
  },
  {
    accessorKey: 'deliveryDate',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Delivery Date" />
    ),
    cell: ({ getValue }) => {
      const value = getValue<string>();
      return (
        <span className="text-sm text-muted-foreground">
          {formatDatePH(value)}
        </span>
      );
    },
    size: 140,
  },
  {
    accessorKey: 'total',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total" />
    ),
    cell: ({ getValue }) => {
      const value = Number.parseFloat(getValue<string>() || '0');
      return (
        <span className="text-sm font-semibold text-gray-900">
          {formatCurrency(Number.isNaN(value) ? 0 : value)}
        </span>
      );
    },
    size: 120,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Recorded" />
    ),
    cell: ({ getValue }) => (
      <span className="text-xs text-muted-foreground">
        {formatDatePH(getValue<string>())}
      </span>
    ),
    size: 140,
  },
  {
    id: 'actions',
    header: () => <span className="text-xs font-medium">Actions</span>,
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" asChild className="h-8 px-2">
        <Link href={`/inventory/stock-in/${row.original.id}`}>
          <Eye className="h-4 w-4 mr-1" />
          View
        </Link>
      </Button>
    ),
    size: 80,
  },
];
