'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/DataTableColumnHeader';
import type { Transaction } from '@/types';
import { Eye, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ColumnsOpts = {
  onView: (tx: Transaction) => void;
};

export const columns = ({ onView }: ColumnsOpts): ColumnDef<Transaction>[] => [
  {
    accessorKey: 'invoiceNumber',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Invoice #" />
    ),
    cell: ({ row }) => {
      const isVoided = row.original.status === 'VOIDED';
      return (
        <span className={`font-medium ${isVoided ? 'line-through text-gray-400' : ''}`}>
          {row.original.invoiceNumber}
        </span>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ getValue }) => {
      const d = new Date(getValue<string | Date>());
      return (
        <span className="text-sm text-muted-foreground">
          {d.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: 'user.fullName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Cashier" />
    ),
    cell: ({ row }) => (
      <span className="text-sm">{row.original.user.fullName}</span>
    ),
  },
  {
    accessorKey: 'paymentMethod',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Method" />
    ),
    cell: ({ getValue }) => (
      <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5">
        {getValue<string>()}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.original.status;
      if (status === 'VOIDED') {
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full bg-red-100 text-red-700 px-2 py-0.5">
            <Ban className="w-3 h-3" />
            Voided
          </span>
        );
      }
      return (
        <span className="text-xs rounded-full bg-green-100 text-green-700 px-2 py-0.5 font-medium">
          Completed
        </span>
      );
    },
    enableSorting: true,
    filterFn: 'equals',
  },
  {
    accessorKey: 'discount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Discount" />
    ),
    cell: ({ row }) => {
      const discount = parseFloat(row.original.discount ?? '0');
      const total = parseFloat(row.original.totalAmount ?? '0');
      const pct = total > 0 && discount > 0 ? (discount / total) * 100 : 0;
      const hasDiscount = pct > 0;
      return (
        <span
          className={
            'text-sm ' +
            (hasDiscount ? 'text-red-600 font-medium' : 'text-muted-foreground')
          }
        >
          {pct.toFixed(0)}%
        </span>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: 'totalAmount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total" />
    ),
    cell: ({ row }) => {
      const isVoided = row.original.status === 'VOIDED';
      return (
        <span className={`font-semibold ${isVoided ? 'text-gray-400 line-through' : 'text-green-600'}`}>
          ₱{parseFloat(row.original.totalAmount).toFixed(2)}
        </span>
      );
    },
    enableSorting: true,
  },
  {
    id: 'actions',
    header: () => <div className="text-center">Actions</div>,
    cell: ({ row }) => (
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onView(row.original)}
          title="View details"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    ),
  },
];
