'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { createProduct } from '@/lib/actions/products';
import type { DosageFormType } from '@/types';

const DOSAGE_FORM_OPTIONS: { value: DosageFormType; label: string }[] = [
  { value: 'TABLET', label: 'Tablet' },
  { value: 'CAPSULE', label: 'Capsule' },
  { value: 'CHEWABLE_TABLET', label: 'Chewable Tablet' },
  { value: 'SYRUP', label: 'Syrup' },
  { value: 'SUSPENSION', label: 'Suspension' },
  { value: 'GRANULES', label: 'Granules' },
  { value: 'INJECTION', label: 'Injection' },
  { value: 'DROPS', label: 'Drops' },
  { value: 'SOLUTION', label: 'Solution' },
  { value: 'SUPPOSITORY', label: 'Suppository' },
  { value: 'INHALER', label: 'Inhaler' },
  { value: 'CREAM', label: 'Cream' },
  { value: 'OINTMENT', label: 'Ointment' },
  { value: 'GEL', label: 'Gel' },
  { value: 'LOTION', label: 'Lotion' },
  { value: 'PATCH', label: 'Patch' },
];

interface Category {
  id: number;
  name: string;
}

interface QuickAddProductResult {
  id: number;
  name: string;
  brandName: string | null;
  genericName: string | null;
  unit: string | null;
  quantity: number;
  lotNumber: string | null;
  expiryDate: string | null;
  costPrice: string | null;
  sellingPrice: string | null;
}

interface QuickAddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  pharmacyId: number;
  initialName?: string;
  onProductCreated: (product: QuickAddProductResult) => void;
}

export function QuickAddProductDialog({
  open,
  onOpenChange,
  categories,
  pharmacyId,
  initialName = '',
  onProductCreated,
}: QuickAddProductDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: initialName,
    brandName: '',
    genericName: '',
    categoryId: '',
    unit: 'PIECE' as 'PIECE' | 'BOX',
    dosageForm: '' as DosageFormType | '',
    minStockLevel: '10',
  });

  // Reset form when dialog opens with new initial name
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setFormData({
        name: initialName,
        brandName: '',
        genericName: '',
        categoryId: '',
        unit: 'PIECE',
        dosageForm: '',
        minStockLevel: '10',
      });
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    setLoading(true);
    try {
      const result = await createProduct({
        pharmacyId,
        name: formData.name.trim(),
        brandName: formData.brandName.trim() || undefined,
        genericName: formData.genericName.trim() || undefined,
        categoryId: formData.categoryId
          ? parseInt(formData.categoryId)
          : undefined,
        unit: formData.unit,
        dosageForm: formData.dosageForm || undefined,
        minStockLevel: parseInt(formData.minStockLevel) || 10,
        quantity: 0, // Start with 0 - stock-in will add the actual quantity
        costPrice: '0.00',
        sellingPrice: '0.00',
      });

      if (result.success && result.data) {
        toast.success(`Product "${formData.name}" created`);

        onProductCreated({
          id: result.data.id,
          name: result.data.name,
          brandName: result.data.brandName ?? null,
          genericName: result.data.genericName ?? null,
          unit: result.data.unit ?? 'PIECE',
          quantity: 0,
          lotNumber: null,
          expiryDate: null,
          costPrice: '0.00',
          sellingPrice: '0.00',
        });

        onOpenChange(false);
      } else {
        toast.error(result.message || 'Failed to create product');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Quick Add Product</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Create a new product to add to this stock-in
          </p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Product Name - Full Width, Prominent */}
          <div className="space-y-1.5">
            <Label htmlFor="quickadd-name" className="text-sm font-medium">
              Product Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="quickadd-name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g., Biogesic 500mg Tablet"
              className="h-10"
              autoFocus
            />
          </div>

          {/* Brand & Generic - Side by Side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="quickadd-brand" className="text-sm font-medium">
                Brand Name
              </Label>
              <Input
                id="quickadd-brand"
                value={formData.brandName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    brandName: e.target.value,
                  }))
                }
                placeholder="e.g., Unilab"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quickadd-generic" className="text-sm font-medium">
                Generic Name
              </Label>
              <Input
                id="quickadd-generic"
                value={formData.genericName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    genericName: e.target.value,
                  }))
                }
                placeholder="e.g., Paracetamol"
                className="h-9"
              />
            </div>
          </div>

          {/* Category & Dosage Form */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="quickadd-category"
                className="text-sm font-medium"
              >
                Category
              </Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, categoryId: value }))
                }
              >
                <SelectTrigger id="quickadd-category" className="h-9 w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id.toString()}
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quickadd-dosage" className="text-sm font-medium">
                Dosage Form
              </Label>
              <Select
                value={formData.dosageForm}
                onValueChange={(value: DosageFormType) =>
                  setFormData((prev) => ({ ...prev, dosageForm: value }))
                }
              >
                <SelectTrigger id="quickadd-dosage" className="h-9 w-full">
                  <SelectValue placeholder="Select form" />
                </SelectTrigger>
                <SelectContent>
                  {DOSAGE_FORM_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Unit & Min Stock Level */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="quickadd-unit" className="text-sm font-medium">
                Unit
              </Label>
              <Select
                value={formData.unit}
                onValueChange={(value: 'PIECE' | 'BOX') =>
                  setFormData((prev) => ({ ...prev, unit: value }))
                }
              >
                <SelectTrigger id="quickadd-unit" className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIECE">Piece</SelectItem>
                  <SelectItem value="BOX">Box</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="quickadd-minstock"
                className="text-sm font-medium"
              >
                Min Stock Level
              </Label>
              <Input
                id="quickadd-minstock"
                type="number"
                min="0"
                max="999"
                value={formData.minStockLevel}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    minStockLevel: e.target.value,
                  }))
                }
                placeholder="10"
                className="h-9"
              />
            </div>
          </div>

          {/* Info Note */}
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5">
            <p className="text-xs text-blue-700">
              💡 Cost price, selling price, lot number, and expiry date will be
              set in the stock-in line item after creating.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !formData.name.trim()}
          >
            {loading ? 'Creating...' : 'Create & Add to List'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
