'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/DataTableColumnHeader';
import { StaffActions } from '@/components/StaffActions';
import { StaffMember } from '@/types';

export const columns: ColumnDef<StaffMember>[] = [
  {
    accessorKey: 'fullName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Full Name" />
    ),
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
  },
  {
    accessorKey: 'role',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Role" />
    ),
    cell: ({ row }) => {
      const role = row.getValue('role') as string;
      return (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            role === 'Admin'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-blue-100 text-blue-800'
          }`}
        >
          {role}
        </span>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => {
      const date = row.getValue('createdAt') as Date | null;
      return date ? new Date(date).toLocaleDateString() : 'N/A';
    },
  },
  {
    accessorKey: 'isActive',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const isActive = row.getValue('isActive') as boolean;
      return (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {isActive ? 'Active' : 'Inactive'}
        </span>
      );
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => <StaffActions user={row.original} />,
  },
];
