'use client';

import { Categories } from '@/types';
import { ColumnDef } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { DataTableColumnHeader } from '@/components/DataTableColumnHeader';

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
    cell: ({ row }) => {
      const category = row.original;

      return (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="xs"
            onClick={() => {
              // Handle edit action
              console.log('Edit category:', category);
            }}
          >
            <Pencil />
          </Button>
          <Button
            variant="destructive"
            size="xs"
            className=""
            onClick={() => {
              // Handle delete action
              // deleteCategory(category.id)
              console.log('Delete category:', category);
              // You might want to add a confirmation dialog here
            }}
          >
            <Trash2 />
          </Button>
        </div>
      );
    },
  },
];
