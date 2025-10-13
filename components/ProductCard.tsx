// components/ProductCard.tsx
import Image from 'next/image';
import { Button } from './ui/button';
import { getExpiryUrgency } from '@/lib/helpers/fefo-utils';
import {
  Package,
  Calendar,
  Hash,
  ShoppingCart,
  AlertTriangle,
} from 'lucide-react';

export const ProductCard = ({
  product,
  onAddToCart,
}: {
  product: {
    id: number;
    name: string;
    brandName?: string | null;
    genericName?: string | null;
    lotNumber: string | null;
    expiryDate: string | null;
    sellingPrice: string;
    imageUrl?: string | null;
    quantity: number;
    unit?: string | null;
    supplierName?: string | null;
  };
  onAddToCart: () => void;
}) => {
  const urgency = product.expiryDate
    ? getExpiryUrgency(product.expiryDate)
    : {
        level: 'no_expiry',
        days: null,
        color: 'bg-gray-100',
        textColor: 'text-gray-600',
        borderColor: 'border-gray-200',
        badge: 'NO EXPIRY',
        icon: '⚫',
      };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border ${urgency.borderColor} hover:-translate-y-1 overflow-hidden flex flex-col h-full`}
    >
      {/* Image Section */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 border-b-2 border-gray-200">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            priority
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <span className="text-xs text-gray-400">No Image</span>
            </div>
          </div>
        )}

        {/* Urgency Badge */}
        <div
          className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
            urgency.level === 'expiring_soon'
              ? 'bg-red-100 text-red-700 border border-red-200'
              : urgency.level === 'moderately_close'
              ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
              : 'bg-green-100 text-green-700 border border-green-200'
          }`}
        >
          {urgency.level === 'expiring_soon' && (
            <AlertTriangle className="w-3 h-3 inline mr-1" />
          )}
          {urgency.days}d
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Product Name */}
        <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 leading-tight">
          {product.name}
        </h3>

        {/* Product Details */}
        <div className="space-y-2">
          {product.brandName && (
            <div className="flex items-center gap-2 text-xs">
              <Package className="w-3 h-3 text-blue-500 flex-shrink-0" />
              <span className="text-gray-600 truncate">
                {product.brandName}
              </span>
            </div>
          )}
          {product.genericName && (
            <div className="flex items-center gap-2 text-xs">
              <Package className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              <span className="text-gray-600 truncate italic">
                {product.genericName}
              </span>
            </div>
          )}
          {product.supplierName && (
            <div className="flex items-center gap-2 text-xs">
              <Package className="w-3 h-3 text-purple-500 flex-shrink-0" />
              <span className="text-gray-600 truncate">
                {product.supplierName}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs">
            <Hash className="w-3 h-3 text-amber-500 flex-shrink-0" />
            <span className="text-gray-600 font-mono">
              {product.lotNumber || 'No lot number'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span
              className={`font-medium ${
                urgency.level === 'expiring_soon'
                  ? 'text-red-600'
                  : urgency.level === 'moderately_close'
                  ? 'text-yellow-600'
                  : urgency.level === 'no_expiry'
                  ? 'text-gray-500'
                  : 'text-green-600'
              }`}
            >
              {urgency.days ? `${urgency.days} days left` : 'No expiry'}
            </span>
          </div>
        </div>

        {/* Price, Stock, and Action */}
        <div className="mt-auto pt-2 border-t border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-bold text-lg text-blue-600">
              ₱{parseFloat(product.sellingPrice).toFixed(2)}
            </div>
            <div
              className={`text-xs font-medium px-2 py-1 rounded-full ${
                product.quantity > 0
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {product.quantity > 0
                ? `${product.quantity} ${product.unit?.toLowerCase() || 'pcs'}`
                : 'Out of stock'}
            </div>
          </div>

          <Button
            size="sm"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm hover:shadow-md transition-all duration-200"
            onClick={onAddToCart}
            disabled={product.quantity <= 0}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {product.quantity > 0 ? 'Add to Sale' : 'Out of Stock'}
          </Button>
        </div>
      </div>
    </div>
  );
};
