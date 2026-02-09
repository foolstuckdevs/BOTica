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
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { createProduct } from '@/lib/actions/products';
import type { DosageFormType } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
  supplierId?: number | null;
  initialName?: string;
  onProductCreated: (product: QuickAddProductResult) => void;
}

export function QuickAddProductDialog({
  open,
  onOpenChange,
  categories,
  pharmacyId,
  supplierId,
  initialName = '',
  onProductCreated,
}: QuickAddProductDialogProps) {
  const [openExpiryPopover, setOpenExpiryPopover] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: initialName,
    brandName: '',
    genericName: '',
    categoryId: '',
    unit: 'PIECE' as 'PIECE' | 'BOX',
    dosageForm: '' as DosageFormType | '',
    costPrice: '',
    sellingPrice: '',
    expiryDate: '',
    lotNumber: '',
  });

  const resetForm = () => {
    setFormData({
      name: initialName,
      brandName: '',
      genericName: '',
      categoryId: '',
      unit: 'PIECE',
      dosageForm: '',
      costPrice: '',
      sellingPrice: '',
      expiryDate: '',
      lotNumber: '',
    });
    setErrors({});
  };

  // Reset form when dialog opens or closes
  const handleOpenChange = (isOpen: boolean) => {
    resetForm();
    onOpenChange(isOpen);
  };

  const sanitizeMoneyInput = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    if (!cleaned) return '';

    const [intPart, ...rest] = cleaned.split('.');
    const decimalsRaw = rest.join('');
    const decimals = decimalsRaw.slice(0, 2);
    const hasDecimal = rest.length > 0 || cleaned.endsWith('.');
    const normalizedInt = intPart.replace(/^0+(?=\d)/, '') || '0';

    if (decimals) return `${normalizedInt}.${decimals}`;
    if (hasDecimal) return `${normalizedInt}.`;
    return normalizedInt;
  };

  const handleSubmit = async () => {
    const name = formData.name.trim();
    const brandName = formData.brandName.trim();
    const genericName = formData.genericName.trim();
    const lotNumber = formData.lotNumber.trim();
    const costPrice = formData.costPrice.trim();
    const sellingPrice = formData.sellingPrice.trim();
    const expiryDate = formData.expiryDate.trim();

    // Validate all fields and collect errors
    const newErrors: Record<string, string> = {};

    if (!name) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Category is required';
    }

    if (!lotNumber) {
      newErrors.lotNumber = 'Lot/Batch number is required';
    }

    if (!costPrice || Number(costPrice) === 0) {
      newErrors.costPrice = 'Cost price is required';
    } else if (!/^\d+(?:\.\d{0,2})?$/.test(costPrice)) {
      newErrors.costPrice = 'Cost price must be a valid number';
    } else {
      const costVal = Number(costPrice);
      if (!Number.isFinite(costVal) || costVal < 0 || costVal > 10_000) {
        newErrors.costPrice = 'Cost price must be at least 0.00 up to 10,000.00';
      }
    }

    if (!sellingPrice || Number(sellingPrice) === 0) {
      newErrors.sellingPrice = 'Selling price is required';
    } else if (!/^\d+(?:\.\d{0,2})?$/.test(sellingPrice)) {
      newErrors.sellingPrice = 'Selling price must be a valid number';
    } else {
      const sellVal = Number(sellingPrice);
      if (!Number.isFinite(sellVal) || sellVal < 1 || sellVal > 10_000) {
        newErrors.sellingPrice = 'Selling price must be at least 1.00 up to 10,000.00';
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    const parsedCost = Number.parseFloat(costPrice);
    const parsedSelling = Number.parseFloat(sellingPrice);

    const normalizedCostPrice = parsedCost.toFixed(2);
    const normalizedSellingPrice = parsedSelling.toFixed(2);

    setLoading(true);
    try {
      const result = await createProduct({
        pharmacyId,
        name,
        brandName: brandName || undefined,
        genericName: genericName || undefined,
        categoryId: formData.categoryId
          ? parseInt(formData.categoryId)
          : undefined,
        lotNumber,
        unit: formData.unit,
        dosageForm: formData.dosageForm || undefined,
        // Not shown in UI per request, keep a sensible default
        minStockLevel: 10,
        quantity: 0,
        costPrice: normalizedCostPrice,
        sellingPrice: normalizedSellingPrice,
        expiryDate: expiryDate || undefined,
        supplierId: supplierId ?? undefined,
      });

      if (result.success && result.data) {
        toast.success(`Product "${formData.name}" created`);

        // Prepare for the next add by clearing the form fields
        resetForm();

        onProductCreated({
          id: result.data.id,
          name: result.data.name,
          brandName: result.data.brandName ?? null,
          genericName: result.data.genericName ?? null,
          unit: result.data.unit ?? 'PIECE',
          quantity: 0,
          lotNumber: result.data.lotNumber ?? lotNumber,
          expiryDate: (result.data.expiryDate ?? expiryDate) || null,
          costPrice: result.data.costPrice ?? normalizedCostPrice,
          sellingPrice: result.data.sellingPrice ?? normalizedSellingPrice,
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
      <DialogContent
        className="sm:max-w-xl p-0 overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-5 pt-5 pb-2 text-left">
          <DialogTitle className="text-base font-semibold">
            Quick Add Product
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Create product with batch details.
          </p>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                Product Details
              </span>
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="quickadd-name"
                className="text-xs font-medium text-slate-700"
              >
                Product Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quickadd-name"
                value={formData.name}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, name: e.target.value }));
                  if (errors.name) setErrors((prev) => { const { name, ...rest } = prev; return rest; });
                }}
                placeholder="e.g., Biogesic 500mg Tablet"
                className={cn('h-9', errors.name && 'border-red-500')}
                autoFocus
              />
              {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label
                  htmlFor="quickadd-brand"
                  className="text-xs font-medium text-slate-700"
                >
                  Brand
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
              <div className="space-y-1">
                <Label
                  htmlFor="quickadd-generic"
                  className="text-xs font-medium text-slate-700"
                >
                  Generic
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label
                  htmlFor="quickadd-category"
                  className="text-xs font-medium text-slate-700"
                >
                  Category <span className="text-red-500">*</span>
                </Label>
                <SearchableSelect
                  options={categories.map((category) => ({
                    value: category.id.toString(),
                    label: category.name,
                  }))}
                  value={formData.categoryId}
                  onValueChange={(value) => {
                    setFormData((prev) => ({ ...prev, categoryId: value }));
                    if (errors.categoryId) setErrors((prev) => { const { categoryId, ...rest } = prev; return rest; });
                  }}
                  placeholder="Select"
                  searchPlaceholder="Search categories..."
                  triggerClassName={cn('h-9 w-full', errors.categoryId && 'border-red-500')}
                />
                {errors.categoryId && <p className="text-xs text-red-500 mt-0.5">{errors.categoryId}</p>}
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="quickadd-dosage"
                  className="text-xs font-medium text-slate-700"
                >
                  Dosage Form
                </Label>
                <Select
                  value={formData.dosageForm}
                  onValueChange={(value: DosageFormType) =>
                    setFormData((prev) => ({ ...prev, dosageForm: value }))
                  }
                >
                  <SelectTrigger id="quickadd-dosage" className="h-9 w-full">
                    <SelectValue placeholder="Select" />
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
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Batch & Pricing
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label
                  htmlFor="quickadd-lot"
                  className="text-xs font-medium text-slate-700"
                >
                  Lot / Batch <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="quickadd-lot"
                  value={formData.lotNumber}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      lotNumber: e.target.value,
                    }));
                    if (errors.lotNumber) setErrors((prev) => { const { lotNumber, ...rest } = prev; return rest; });
                  }}
                  placeholder="e.g., BATCH-2026A"
                  className={cn('h-9', errors.lotNumber && 'border-red-500')}
                />
                {errors.lotNumber && <p className="text-xs text-red-500 mt-0.5">{errors.lotNumber}</p>}
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="quickadd-expiry"
                  className="text-xs font-medium text-slate-700"
                >
                  Expiry Date
                </Label>
                <Popover
                  open={openExpiryPopover}
                  onOpenChange={setOpenExpiryPopover}
                  modal={true}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal h-9',
                        !formData.expiryDate && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {formData.expiryDate
                        ? format(new Date(formData.expiryDate), 'MMM yyyy')
                        : 'Select'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0"
                    align="start"
                    sideOffset={4}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    style={{ zIndex: 9999 }}
                  >
                    <Calendar
                      mode="single"
                      captionLayout="dropdown"
                      defaultMonth={
                        formData.expiryDate
                          ? new Date(formData.expiryDate)
                          : new Date()
                      }
                      selected={
                        formData.expiryDate
                          ? new Date(formData.expiryDate)
                          : undefined
                      }
                      onSelect={(date) => {
                        if (date) {
                          // Normalize to first day of month
                          const normalized = new Date(
                            date.getFullYear(),
                            date.getMonth(),
                            1,
                          );
                          setFormData((prev) => ({
                            ...prev,
                            expiryDate: format(normalized, 'yyyy-MM-dd'),
                          }));
                          setOpenExpiryPopover(false);
                        }
                      }}
                      onMonthChange={(month) => {
                        // Update date when navigating months
                        const normalized = new Date(
                          month.getFullYear(),
                          month.getMonth(),
                          1,
                        );
                        setFormData((prev) => ({
                          ...prev,
                          expiryDate: format(normalized, 'yyyy-MM-dd'),
                        }));
                      }}
                      startMonth={new Date(new Date().getFullYear(), 0)}
                      endMonth={new Date(new Date().getFullYear() + 10, 11)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label
                  htmlFor="quickadd-unit"
                  className="text-xs font-medium text-slate-700"
                >
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
              <div className="space-y-1">
                <Label
                  htmlFor="quickadd-cost"
                  className="text-xs font-medium text-slate-700"
                >
                  Cost <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="quickadd-cost"
                  value={formData.costPrice}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      costPrice: sanitizeMoneyInput(e.target.value),
                    }));
                    if (errors.costPrice) setErrors((prev) => { const { costPrice, ...rest } = prev; return rest; });
                  }}
                  placeholder="0.00"
                  className={cn('h-9', errors.costPrice && 'border-red-500')}
                />
                {errors.costPrice && <p className="text-xs text-red-500 mt-0.5">{errors.costPrice}</p>}
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="quickadd-selling"
                  className="text-xs font-medium text-slate-700"
                >
                  Selling <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="quickadd-selling"
                  value={formData.sellingPrice}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      sellingPrice: sanitizeMoneyInput(e.target.value),
                    }));
                    if (errors.sellingPrice) setErrors((prev) => { const { sellingPrice, ...rest } = prev; return rest; });
                  }}
                  placeholder="0.00"
                  className={cn('h-9', errors.sellingPrice && 'border-red-500')}
                />
                {errors.sellingPrice && <p className="text-xs text-red-500 mt-0.5">{errors.sellingPrice}</p>}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 rounded px-2 ">
              <span className="text-slate-400">*</span>
              <span>
                Quantity is set in Stock-In after creating the product.
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 py-2 gap-2 border-t bg-slate-50">
          <Button
            type="button"
            variant="ghost"
            onClick={() => { resetForm(); onOpenChange(false); }}
            disabled={loading}
            size="sm"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !formData.name.trim()}
            size="sm"
          >
            {loading ? 'Creating...' : 'Create & Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
