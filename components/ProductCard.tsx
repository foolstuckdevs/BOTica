// components/ProductCard.tsx
import Image from 'next/image';
import { Button } from './ui/button';
import { getExpiryUrgency } from '@/lib/helpers/fefo-utils';

export const ProductCard = ({
  product,
  onAddToCart,
}: {
  product: {
    id: number;
    name: string;
    brandName?: string | null;
    lotNumber: string;
    expiryDate: string;
    sellingPrice: string;
    imageUrl?: string | null;
    quantity: number;
  };
  onAddToCart: () => void;
}) => {
  const urgency = getExpiryUrgency(product.expiryDate);

  return (
    <div
      className={`flex flex-col border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow ${urgency.borderColor}`}
    >
      <div className="relative aspect-square bg-gray-100">
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
          <div className="flex items-center justify-center h-full text-gray-400">
            No Image
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col flex-grow">
        <h3 className="font-medium text-sm line-clamp-2 mb-1">
          {product.name}
        </h3>

        {/* Product details */}
        <div className="space-y-1 mb-2">
          {product.brandName && (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-blue-600 font-medium">Brand:</span>
              <span className="text-gray-700">{product.brandName}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-amber-600 font-medium">Lot:</span>
            <span className="text-gray-700">{product.lotNumber}</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span
              className={`font-medium ${
                urgency.level === 'expiring_soon'
                  ? 'text-red-600'
                  : urgency.level === 'moderately_close'
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`}
            >
              Expires in:
            </span>
            <span
              className={`text-xs ${
                urgency.level === 'expiring_soon'
                  ? 'text-red-700 font-medium'
                  : urgency.level === 'moderately_close'
                  ? 'text-yellow-700 font-medium'
                  : 'text-gray-700'
              }`}
            >
              {urgency.days} days
            </span>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <span className="font-bold text-primary">
            ₱{parseFloat(product.sellingPrice).toFixed(2)}
          </span>
          <span
            className={`text-xs ${
              product.quantity > 0 ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {product.quantity > 0 ? `${product.quantity} left` : 'Out of stock'}
          </span>
        </div>
        <Button
          size="sm"
          className="mt-2 w-full"
          onClick={onAddToCart}
          disabled={product.quantity <= 0}
        >
          Add to Cart
        </Button>
      </div>
    </div>
  );
};
