'use client';

import { Categories } from '@/types';
import { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from '@/components/DataTableColumnHeader';
import { CategoryActions } from '@/components/CategoryActions';

export const columns: ColumnDef<Categories>[] = [
  {
    accessorKey: 'id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID" />
    ),
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
  },
  {
    accessorKey: 'description',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
  },
  {
    header: 'Actions',
    id: 'actions',
    cell: ({ row }) => <CategoryActions category={row.original} />,
  },
];
