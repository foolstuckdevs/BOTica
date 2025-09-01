'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import { Product } from '@/types';
import { getProductById, deleteProduct } from '@/lib/actions/products';
import { DeleteDialog } from './DeleteDialog';
import ProductViewDialog from './ProductViewDialog';

const ProductActions = ({ product }: { product: Product }) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productDetails, setProductDetails] = useState<Product | null>(null);

  if (!session?.user?.pharmacyId) {
    return null; // Don't render actions if no pharmacy access
  }

  const pharmacyId = session.user.pharmacyId;

  const handleView = async () => {
    try {
      const details = await getProductById(product.id, pharmacyId);
      if (details) {
        const d = details as Product;
        setProductDetails({
          ...d,
          dosageForm: d.dosageForm,
          brandName: d.brandName ?? '',
        });
        setViewOpen(true);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load product details');
    }
  };

  const handleDelete = async () => {
    const result = await deleteProduct(product.id, pharmacyId);
    if (!result.success) {
      toast.error('Failed to delete product');
      return;
    }

    toast.success('Product deleted');
    setDeleteDialogOpen(false);
    router.refresh();
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={handleView} title="View">
          <Eye className="h-4 w-4 text-gray-600" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/inventory/products/${product.id}/edit`)}
          title="Edit"
        >
          <Pencil className="h-4 w-4 text-gray-600" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDeleteDialogOpen(true)}
          title="Delete"
        >
          <Trash2 className="h-4 w-4 text-red-600" />
        </Button>
      </div>

      {productDetails && (
        <ProductViewDialog
          product={productDetails}
          open={viewOpen}
          onOpenChange={setViewOpen}
        />
      )}

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        entityName={product.name}
        entityType="product"
      />
    </>
  );
};

export default ProductActions;
