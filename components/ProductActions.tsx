'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Product } from '@/types';
import { deleteProduct, getProductById } from '@/lib/actions/products';
import { toast } from 'sonner';
import ProductViewDialog from './ProductViewDialog';
import { DeleteDialog } from './DeleteDialog';
import { Eye, Pencil, Trash2 } from 'lucide-react';

const ProductActions = ({ product }: { product: Product }) => {
  const router = useRouter();
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productDetails, setProductDetails] = useState<Product | null>(null);
  const pharmacyId = 1; // hardcoded for now fetch from session later

  const handleView = async () => {
    try {
      const productDetails = await getProductById(product.id, pharmacyId);
      if (productDetails) {
        setProductDetails(productDetails);
        setViewOpen(true);
      }
    } catch (error) {
      console.log(error);
      toast.error('Failed to load product details');
    }
  };

  const handleDelete = async () => {
    const result = await deleteProduct(product.id, pharmacyId);
    if (!result.success) {
      toast.message('Failed to delete product');
      return;
    }
    toast.success('Product deleted');
    setDeleteDialogOpen(false);
    router.refresh();
  };

  return (
    <div className="flex space-x-2">
      {/* View Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={handleView}
        className="h-8 w-8"
        aria-label="View product"
      >
        <Eye className="h-4 w-4" />
      </Button>

      {/* Edit Button */}
      <Button
        variant="outline"
        size="icon"
        asChild
        className="h-8 w-8"
        aria-label="Edit product"
      >
        <Link href={`/inventory/products/${product.id}/edit`}>
          <Pencil className="h-4 w-4" />
        </Link>
      </Button>

      {/* Delete Button */}
      <Button
        variant="destructive"
        size="icon"
        onClick={() => setDeleteDialogOpen(true)}
        className="h-8 w-8"
        aria-label="Delete product"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      {/* View Dialog */}
      {productDetails && (
        <ProductViewDialog
          product={productDetails}
          open={viewOpen}
          onOpenChange={setViewOpen}
        />
      )}

      {/* Delete Dialog */}
      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        entityName="Product"
      />
    </div>
  );
};

export default ProductActions;
