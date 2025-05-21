'use client';

import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Product } from '@/types';
import { deleteProduct, getProductById } from '@/lib/actions/products';
import { toast } from 'sonner';
import ProductViewDialog from './ProductViewDialog';

const ProductActions = ({ product }: { product: Product }) => {
  const router = useRouter();
  const [viewOpen, setViewOpen] = useState(false);
  const [fullProduct, setFullProduct] = useState<Product | null>(null);

  const handleView = async () => {
    try {
      const productWithCategory = await getProductById(product.id);
      if (productWithCategory) {
        setFullProduct(productWithCategory);
        setViewOpen(true);
      }
    } catch (error) {
      console.log(error);
      toast.error('Failed to load product details');
    }
  };

  const handleDelete = async () => {
    const confirmDelete = confirm(
      'Are you sure you want to delete this product?',
    );
    if (!confirmDelete) return;

    const result = await deleteProduct(product.id);
    if (!result.success) {
      toast.message('Failed to delete product');
      return;
    }

    toast.success('Product deleted successfully');
    router.refresh();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleView}>
            {' '}
            {/* Updated this line */}
            View
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/inventory/products/${product.id}/edit`}>Edit</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDelete} className="text-red-600">
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {fullProduct && (
        <ProductViewDialog
          product={fullProduct}
          open={viewOpen}
          onOpenChange={setViewOpen}
        />
      )}
    </>
  );
};

export default ProductActions;
