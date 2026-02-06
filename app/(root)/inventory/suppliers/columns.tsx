'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/DataTableColumnHeader';
import { Supplier } from '@/types';
import SupplierActions from '@/components/SupplierActions';
import usePermissions from '@/hooks/use-permissions';

const ActionsHeader = () => {
  const { canEditMasterData } = usePermissions();
  return canEditMasterData ? <div className="pl-3">Actions</div> : null;
};

export const columns: ColumnDef<Supplier>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Supplier" />
    ),
    cell: ({ getValue }) => (
      <span className="font-medium">{getValue<string>()}</span>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'contactPerson',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Contact Person" />
    ),
    cell: ({ getValue }) => (
      <span className="text-sm">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: 'phone',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Phone" />
    ),
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground">
        {getValue<string>() || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground">
        {getValue<string>() || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'address',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Address" />
    ),
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground line-clamp-1">
        {getValue<string>() || '—'}
      </span>
    ),
  },
  {
    id: 'actions',
    header: ActionsHeader,
    cell: ({ row }) => <SupplierActions supplier={row.original} />,
    enableSorting: false,
  },
];
