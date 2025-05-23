'use client';

import {
  PackageIcon,
  Banknote,
  InfoIcon,
  BoxIcon,
  LayersIcon,
} from 'lucide-react';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ProductViewDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ProductViewDialog = ({
  product,
  open,
  onOpenChange,
}: ProductViewDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <PackageIcon className="w-5 h-5 text-primary" />
            Product Details
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-600">
              <InfoIcon className="w-5 h-5" />
              Basic Information
            </h3>
            <div className="pl-6 space-y-2 text-sm">
              <div>
                <p className="text-gray-500">Product Name</p>
                <p className="font-medium">{product.name}</p>
              </div>
              {product.genericName && (
                <div>
                  <p className="text-gray-500">Generic Name</p>
                  <p className="font-medium">{product.genericName}</p>
                </div>
              )}
              {product.categoryName && (
                <div>
                  <p className="text-gray-500">Category</p>
                  <p className="font-medium">{product.categoryName}</p>
                </div>
              )}
              <div>
                <p className="text-gray-500">Unit</p>
                <p className="font-medium">{product.unit}</p>
              </div>
            </div>
          </div>

          {/* Inventory Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-green-600">
              <BoxIcon className="w-5 h-5" />
              Inventory Details
            </h3>
            <div className="pl-6 space-y-2 text-sm">
              <div>
                <p className="text-gray-500">Batch Number</p>
                <p className="font-medium">{product.batchNumber}</p>
              </div>
              {product.barcode && (
                <div>
                  <p className="text-gray-500">Barcode</p>
                  <p className="font-medium">{product.barcode}</p>
                </div>
              )}
              <div>
                <p className="text-gray-500">Expiry Date</p>
                <p className="font-medium">
                  {product.expiryDate
                    ? new Date(product.expiryDate).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Quantity</p>
                <p className="font-medium">{product.quantity}</p>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-yellow-600">
              <Banknote className="w-5 h-5" />
              Pricing
            </h3>
            <div className="pl-6 space-y-2 text-sm">
              <div>
                <p className="text-gray-500">Cost Price</p>
                <p className="font-medium">{product.costPrice}</p>
              </div>
              <div>
                <p className="text-gray-500">Selling Price</p>
                <p className="font-medium">{product.sellingPrice}</p>
              </div>
            </div>
          </div>

          {/* Stock Management */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-purple-600">
              <LayersIcon className="w-5 h-5" />
              Stock Management
            </h3>
            <div className="pl-6 space-y-2 text-sm">
              {product.minStockLevel !== undefined && (
                <div>
                  <p className="text-gray-500">Minimum Stock Level</p>
                  <p className="font-medium">{product.minStockLevel}</p>
                </div>
              )}
              {product.supplierName && (
                <div>
                  <p className="text-gray-500">Supplier</p>
                  <p className="font-medium">{product.supplierName}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductViewDialog;
