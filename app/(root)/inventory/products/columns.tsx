'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/DataTableColumnHeader';
import { Product } from '@/types';
import ProductActions from '@/components/ProductActions';

export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Product Name" />
    ),
  },
  {
    accessorKey: 'genericName',
    header: 'Generic Name',
  },
  {
    accessorKey: 'quantity',
    header: 'Quantity',
  },
  {
    accessorKey: 'expiryDate',
    header: 'Expiry Date',
  },
  {
    accessorKey: 'sellingPrice',
    header: 'Price',
  },
  {
    header: 'Actions',
    id: 'actions',
    cell: ({ row }) => <ProductActions product={row.original} />,
  },
];
