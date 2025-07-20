// components/ProductCard.tsx
import Image from 'next/image';
import { Button } from './ui/button';

export const ProductCard = ({
  product,
  onAddToCart,
}: {
  product: {
    id: number;
    name: string;
    sellingPrice: string;
    imageUrl?: string | null;
    quantity: number;
  };
  onAddToCart: () => void;
}) => {
  return (
    <div className="flex flex-col border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="relative aspect-square bg-gray-100">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            No Image
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col flex-grow">
        <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-bold text-primary">
            ₱{parseFloat(product.sellingPrice).toFixed(2)}
          </span>
          <span
            className={`text-xs ${
              product.quantity > 0 ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {product.quantity > 0 ? `${product.quantity} in stock` : 'Out of stock'}
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