'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/DataTableColumnHeader';
import { CategoryActions } from '@/components/CategoryActions';
import { Category } from '@/types';

export const columns: ColumnDef<Category>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Category Name" />
    ),
    cell: ({ getValue }) => (
      <span className="font-medium">{getValue<string>()}</span>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'description',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground">
        {getValue<string>() || '-'}
      </span>
    ),
    enableSorting: false,
  },
  {
    id: 'actions',
    header: () => <div className="pl-3">Actions</div>,
    cell: ({ row }) => <CategoryActions category={row.original} />,
    enableSorting: false,
  },
];
