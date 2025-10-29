'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/DataTableColumnHeader';
import { Product } from '@/types';
import ProductActions from '@/components/ProductActions';
import { ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/helpers/formatCurrency';

export const buildColumns = (
  onProductDeleted?: (productId: number) => void,
): ColumnDef<Product>[] => [
  {
    accessorKey: 'imageUrl',
    header: 'Image',
    cell: ({ row }) => {
      const imageUrl = row.getValue('imageUrl') as string;
      const name = row.getValue('name') as string;

      return (
        <div className="flex items-center justify-center w-16 h-16 relative rounded-lg overflow-hidden bg-gray-50">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50px, 64px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <ImageIcon className="w-6 h-6 text-gray-400" />
            </div>
          )}
        </div>
      );
    },
    size: 80,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Product Name" />
    ),
    cell: ({ row }) => (
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-gray-900 line-clamp-2">
          {row.getValue('name')}
        </p>
        <p className="text-xs text-gray-500">
          {(row.original as Product).genericName}
        </p>
      </div>
    ),
    size: 180,
  },
  {
    accessorKey: 'brandName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Brand" />
    ),
    cell: ({ row }) => {
      const brandName = (row.original as Product).brandName;
      return (
        <div className="text-sm">
          {brandName ? (
            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
              {brandName}
            </span>
          ) : (
            <span className="text-gray-400 text-xs">—</span>
          )}
        </div>
      );
    },
    size: 120,
  },
  {
    accessorKey: 'lotNumber',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Batch" />
    ),
    cell: ({ row }) => {
      const lotNumber = (row.original as Product).lotNumber;
      return (
        <div className="text-sm">
          {lotNumber ? (
            <span className="bg-gray-50 text-gray-700 px-2 py-1 rounded text-xs font-mono">
              {lotNumber}
            </span>
          ) : (
            <span className="text-gray-400 text-xs">—</span>
          )}
        </div>
      );
    },
    size: 120,
  },
  {
    accessorKey: 'quantity',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Stock" />
    ),
    cell: ({ row }) => {
      const quantity = parseFloat(row.getValue('quantity'));
      const unit = (row.original as Product).unit;
      const minStockLevel = (row.original as Product).minStockLevel;
      const isLow = minStockLevel ? quantity <= minStockLevel : quantity <= 5;
      const isOut = quantity === 0;

      return (
        <div className="flex flex-col">
          <span
            className={`text-sm font-medium ${
              isOut
                ? 'text-red-600'
                : isLow
                ? 'text-amber-600'
                : 'text-gray-900'
            }`}
          >
            {isOut ? '0' : quantity} {unit?.toLowerCase() || 'pcs'}
          </span>
          {isOut && <span className="text-xs text-red-500">Out of stock</span>}
          {!isOut && isLow && (
            <span className="text-xs text-amber-500">Low stock</span>
          )}
        </div>
      );
    },
    size: 100,
  },
  {
    accessorKey: 'expiryDate',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Expiry" />
    ),
    cell: ({ row }) => {
      const rawExpiry = row.getValue('expiryDate');
      const expiry = rawExpiry ? new Date(rawExpiry as string) : null;
      const formatted = expiry ? format(expiry, 'MMM dd, yyyy') : 'N/A';

      const today = new Date();
      const isExpired = expiry && expiry < today;
      const isNearExpiry =
        expiry &&
        expiry > today &&
        expiry.getTime() - today.getTime() < 30 * 24 * 60 * 60 * 1000;

      return (
        <div className="flex flex-col">
          <span
            className={`text-sm font-medium ${
              isExpired
                ? 'text-red-600'
                : isNearExpiry
                ? 'text-amber-600'
                : 'text-gray-700'
            }`}
          >
            {formatted}
          </span>
          {isExpired && <span className="text-xs text-red-500">Expired</span>}
          {isNearExpiry && !isExpired && (
            <span className="text-xs text-amber-500">Expires soon</span>
          )}
        </div>
      );
    },
    size: 110,
  },
  {
    accessorKey: 'supplierName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Supplier" />
    ),
    cell: ({ row }) => {
      const supplierName = (row.original as Product).supplierName;
      return (
        <div className="text-sm text-gray-700">
          {supplierName ? (
            <span className="truncate">{supplierName}</span>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </div>
      );
    },
    size: 120,
  },
  {
    accessorKey: 'sellingPrice',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Price" />
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('sellingPrice'));
      return (
        <div className="text-sm font-medium text-gray-900">
          {formatCurrency(amount)}
        </div>
      );
    },
    size: 100,
  },
  {
    id: 'actions',
    header: () => <div className="pl-3">Actions</div>,
    cell: ({ row }) => (
      <ProductActions product={row.original} onDeleted={onProductDeleted} />
    ),
    size: 80,
  },
];
