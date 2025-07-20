import { Product } from '@/types';

export default function ProductGrid({
  products,
  addToCart,
}: {
  products: Product[];
  addToCart: (product: Product) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map(product => (
        <div
          key={product.id}
          className="border rounded p-4 cursor-pointer hover:bg-gray-50"
          onClick={() => addToCart(product)}
        >
          <h3 className="font-medium">{product.name}</h3>
          {product.genericName && (
            <p className="text-sm text-gray-500">{product.genericName}</p>
          )}
          <p className="mt-2 font-bold">₱{product.sellingPrice}</p>
          <p className="text-sm">Stock: {product.quantity}</p>
        </div>
      ))}
    </div>
  );
}