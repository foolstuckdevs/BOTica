'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { productFormSchema } from '@/lib/validations';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { Category, Product, Supplier, DosageFormType, UnitType } from '@/types';
import { Button } from '@/components/ui/button';
import { useMemo, useState } from 'react';
import { ImageUpload } from './ImageUpload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Calendar } from './ui/calendar';
import {
  Calendar as CalendarIcon,
  PackageIcon,
  TagIcon,
  Banknote,
  LayoutGrid,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { createProduct, updateProduct } from '@/lib/actions/products';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Props extends Partial<Product> {
  type?: 'create' | 'update';
  categories: Category[];
  suppliers: Supplier[];
  pharmacyId: number;
  returnUrl?: string;
}

const UNIT_OPTIONS: { value: UnitType; label: string }[] = [
  { value: 'PIECE', label: 'Piece' },
  { value: 'BOX', label: 'Box' },
];

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

const ProductForm = ({
  type = 'create',
  categories,
  suppliers,
  pharmacyId,
  returnUrl,
  ...product
}: Props) => {
  const router = useRouter();
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpiryOpen, setIsExpiryOpen] = useState(false);
  const today = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return base;
  }, []);

  const form = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product.name || '',
      genericName: product.genericName || '',
      categoryId: product.categoryId || undefined,
      lotNumber: product.lotNumber || '',
      brandName: product.brandName || '',
      dosageForm:
        (product.dosageForm as DosageFormType | undefined) ?? undefined,
      expiryDate: product.expiryDate ? new Date(product.expiryDate) : undefined,
      quantity: product.quantity ?? 0,
      costPrice: product.costPrice || '',
      sellingPrice: product.sellingPrice || '',
      minStockLevel: product.minStockLevel || 10,
      unit: (product.unit as UnitType | undefined) ?? undefined,
      supplierId: product.supplierId || undefined,
      imageUrl: product.imageUrl || '',
    },
  });

  const watchedCostPrice = form.watch('costPrice');

  const onSubmit = async (values: z.infer<typeof productFormSchema>) => {
    try {
      setIsSubmitting(true);

      let imageUrl = values.imageUrl || '';

      if (selectedImageFile) {
        const formData = new FormData();
        formData.append('file', selectedImageFile);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Image upload failed');
        }

        imageUrl = data.url;
      }

      const apiData = {
        ...values,
        expiryDate: values.expiryDate?.toISOString(),
        imageUrl,
        minStockLevel:
          typeof values.minStockLevel === 'number' &&
          !isNaN(values.minStockLevel)
            ? values.minStockLevel
            : 10,
      };

      // On update, prune fields that are server-restricted to improve UX
      const toSend: Partial<typeof apiData> = { ...apiData };
      if (type === 'update' && (product as Product).hasReferences) {
        // Never allow client-side quantity edits via update
        delete toSend.quantity;
        // Freeze identity/traceability
        delete toSend.lotNumber;
        delete toSend.expiryDate; // server validates too; UI stays disabled
        delete toSend.unit;
        delete toSend.dosageForm;
        delete toSend.supplierId;
        // Optionally freeze costPrice after sales; server enforces strictly
      }

      const result =
        type === 'create'
          ? await createProduct({ ...apiData, pharmacyId })
          : await updateProduct(product.id!, toSend, pharmacyId);

      if (result?.success) {
        toast.success(`Product ${type === 'create' ? 'added' : 'updated'}`);
        form.reset();
        setSelectedImageFile(null);
        // Use returnUrl to preserve pagination state, fallback to default
        router.push(returnUrl || '/inventory/products');
      } else {
        toast.error(result?.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error(error instanceof Error ? error.message : 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {type === 'create' ? 'Add New Product' : 'Edit Product'}
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            {type === 'create'
              ? 'Fill in the details to add a new product to your inventory'
              : 'Update the product information as needed'}
          </p>
        </div>
        <Badge
          variant={type === 'create' ? 'default' : 'secondary'}
          className="text-sm"
        >
          {type === 'create' ? 'New Product' : 'Editing Mode'}
        </Badge>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Product Information */}
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <PackageIcon className="w-5 h-5 text-blue-600" />
                    <span>Product Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* First row - 2 columns */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Product Name
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            required
                            placeholder="e.g., Paracetamol 500mg"
                            {...field}
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Unit
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={
                              type === 'update' &&
                              (product as Product).hasReferences
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {UNIT_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="brandName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Brand Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Biogesic"
                            {...field}
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dosageForm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Dosage Form
                        </FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={
                              type === 'update' &&
                              (product as Product).hasReferences
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select dosage form" />
                            </SelectTrigger>
                            <SelectContent>
                              {DOSAGE_FORM_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Second row - 2 columns */}
                  <FormField
                    control={form.control}
                    name="genericName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Generic Name
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertCircle className="w-4 h-4 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>The scientific name of the product</p>
                            </TooltipContent>
                          </Tooltip>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Acetaminophen"
                            {...field}
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Category
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <SearchableSelect
                            options={categories.map((category) => ({
                              value: String(category.id),
                              label: category.name,
                            }))}
                            value={
                              field.value !== undefined
                                ? String(field.value)
                                : undefined
                            }
                            onValueChange={(value) =>
                              field.onChange(Number(value) || undefined)
                            }
                            placeholder="Select category"
                            searchPlaceholder="Search categories..."
                            disabled={categories.length === 0}
                            triggerClassName="w-full h-10"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Product Image</FormLabel>
                        <FormControl>
                          <ImageUpload
                            value={field.value}
                            onChange={(file, previewUrl) => {
                              setSelectedImageFile(file);
                              if (previewUrl) {
                                field.onChange(previewUrl);
                              } else {
                                field.onChange('');
                              }
                            }}
                            disabled={false}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-green-600" />
                    <span>Inventory Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="lotNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Lot Number
                        </FormLabel>
                        <FormControl>
                          <div className="w-full">
                            <Input
                              placeholder="e.g., LOT2025-001"
                              {...field}
                              className="w-full"
                              readOnly={
                                type === 'update' &&
                                (product as Product).hasReferences
                              }
                              disabled={
                                type === 'update' &&
                                (product as Product).hasReferences
                              }
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expiryDate"
                    render={({ field }) => {
                      const expiryDisabled =
                        type === 'update' && (product as Product).hasReferences;
                      const selectedDate = field.value
                        ? new Date(field.value)
                        : undefined;
                      const currentYear = today.getFullYear();
                      const dropdownStartYear = selectedDate
                        ? Math.min(currentYear, selectedDate.getFullYear())
                        : currentYear;
                      const dropdownEndYear = selectedDate
                        ? Math.max(currentYear + 10, selectedDate.getFullYear())
                        : currentYear + 10;

                      return (
                        <FormItem className="flex flex-col">
                          <FormLabel className="flex items-center gap-1">
                            Expiry Date
                          </FormLabel>
                          <FormControl>
                            <Popover
                              open={expiryDisabled ? false : isExpiryOpen}
                              onOpenChange={(open) => {
                                if (!expiryDisabled) {
                                  setIsExpiryOpen(open);
                                }
                              }}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={expiryDisabled}
                                  className={cn(
                                    'w-full justify-start text-left font-normal',
                                    !selectedDate && 'text-muted-foreground',
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {selectedDate
                                    ? format(selectedDate, 'MMM yyyy')
                                    : 'Select date'}
                                </Button>
                              </PopoverTrigger>
                              {!expiryDisabled && (
                                <PopoverContent
                                  className="w-auto p-0"
                                  align="start"
                                >
                                  <Calendar
                                    mode="single"
                                    captionLayout="dropdown"
                                    selected={selectedDate}
                                    defaultMonth={selectedDate ?? today}
                                    onSelect={(date) => {
                                      if (!date) {
                                        return;
                                      }

                                      field.onChange(date);
                                      setIsExpiryOpen(false);
                                    }}
                                    disabled={{ before: today }}
                                    fromYear={dropdownStartYear}
                                    toYear={dropdownEndYear}
                                    initialFocus
                                    className="rounded-md border border-emerald-100 p-2"
                                  />
                                  {selectedDate && (
                                    <div className="border-t p-2">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        className="w-full justify-center text-xs"
                                        onClick={() => {
                                          field.onChange(undefined);
                                          setIsExpiryOpen(false);
                                        }}
                                      >
                                        Clear date
                                      </Button>
                                    </div>
                                  )}
                                </PopoverContent>
                              )}
                            </Popover>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier</FormLabel>
                        <FormControl>
                          <div className="w-full">
                            <Select
                              onValueChange={(value) =>
                                field.onChange(Number(value) || undefined)
                              }
                              value={field.value?.toString() || undefined}
                              disabled={
                                suppliers.length === 0 ||
                                (type === 'update' &&
                                  (product as Product).hasReferences)
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select supplier" />
                              </SelectTrigger>
                              <SelectContent>
                                {suppliers.length === 0 ? (
                                  <div className="p-2 text-sm text-gray-500">
                                    No suppliers available
                                  </div>
                                ) : (
                                  suppliers.map((supplier) => (
                                    <SelectItem
                                      key={supplier.id}
                                      value={supplier.id.toString()}
                                    >
                                      {supplier.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Pricing and Stock */}
            <div className="space-y-6">
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-yellow-600" />
                    <span>Pricing</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <FormField
                    control={form.control}
                    name="costPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Cost Price
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="₱ 0.00"
                            className="w-full"
                            value={field.value}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^\d.]/g, '');
                              if (raw === '' || /^\d*\.?\d{0,2}$/.test(raw)) {
                                field.onChange(raw);
                              }
                            }}
                            onBlur={() => {
                              const value = parseFloat(field.value);
                              if (!isNaN(value)) {
                                field.onChange(value.toFixed(2));
                              }
                            }}
                            readOnly={
                              type === 'update' &&
                              (product as Product).hasReferences
                            }
                            disabled={
                              type === 'update' &&
                              (product as Product).hasReferences
                            }
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sellingPrice"
                    render={({ field }) => {
                      const cost = parseFloat(watchedCostPrice || '0');
                      const selling = parseFloat(field.value || '0');
                      const profitMargin =
                        selling > 0 ? ((selling - cost) / selling) * 100 : 0;
                      const isLowerThanCost = selling > 0 && selling < cost;

                      return (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            Selling Price
                            <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative w-full">
                              <Input
                                placeholder="₱ 0.00"
                                className="w-full"
                                value={field.value}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(
                                    /[^\d.]/g,
                                    '',
                                  );
                                  if (
                                    raw === '' ||
                                    /^\d*\.?\d{0,2}$/.test(raw)
                                  ) {
                                    field.onChange(raw);
                                  }
                                }}
                                onBlur={() => {
                                  const value = parseFloat(field.value);
                                  if (!isNaN(value)) {
                                    field.onChange(value.toFixed(2));
                                  }
                                }}
                              />
                            </div>
                          </FormControl>
                          {isLowerThanCost && (
                            <p className="text-[0.7rem] pl-1 font-medium text-destructive mt-1">
                              Note: Selling price is lower than cost price
                            </p>
                          )}
                          <FormMessage className="text-xs" />
                        </FormItem>
                      );
                    }}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <TagIcon className="w-5 h-5 text-purple-600" />
                    <span>Stock Management</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Quantity
                        </FormLabel>
                        <FormControl>
                          <div className="w-full">
                            <Input
                              type="number"
                              min={0}
                              max={9999} // ⬅️ limit to 9999
                              placeholder="Enter quantity"
                              {...field}
                              className="w-full"
                              onChange={(e) =>
                                field.onChange(
                                  Math.min(9999, parseInt(e.target.value) || 0),
                                )
                              }
                              readOnly={type === 'update'}
                              disabled={type === 'update'}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="minStockLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Minimum Stock Level
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertCircle className="w-4 h-4 text-gray-400 cursor-help ml-1" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Set to receive low stock alerts</p>
                            </TooltipContent>
                          </Tooltip>
                        </FormLabel>
                        <FormControl>
                          <div className="w-full">
                            <Input
                              type="number"
                              min={0}
                              placeholder="Set alert threshold"
                              {...field}
                              className="w-full"
                              value={field.value || ''}
                              onChange={(e) =>
                                field.onChange(
                                  parseInt(e.target.value) || undefined,
                                )
                              }
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(returnUrl || '/inventory/products')}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={isSubmitting}
              aria-label={
                isSubmitting
                  ? type === 'create'
                    ? 'Adding product'
                    : 'Updating product'
                  : type === 'create'
                  ? 'Add product'
                  : 'Update product'
              }
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    aria-label="Loading"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span className="sr-only">Loading</span>
                  {type === 'create' ? 'Adding...' : 'Updating...'}
                </span>
              ) : type === 'create' ? (
                'Add Product'
              ) : (
                'Update Product'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ProductForm;
