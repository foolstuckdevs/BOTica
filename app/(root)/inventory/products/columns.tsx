'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/DataTableColumnHeader';
import { Product } from '@/types';
import ProductActions from '@/components/ProductActions';
import { ImageIcon } from 'lucide-react';

export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: 'imageUrl',
    header: 'Image',
    cell: ({ row }) => {
      const imageUrl = row.getValue('imageUrl') as string;
      return (
        <div className="flex items-center justify-center w-12 h-12">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={row.getValue('name') as string}
              className="w-10 h-10 object-cover rounded-md border"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-gray-400" />
            </div>
          )}
        </div>
      );
    },
  },
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
