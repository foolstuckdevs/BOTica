'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import { Category, Product, Supplier } from '@/types';
import { productSchema } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { getCategories } from '@/lib/actions/categories';
import { getSuppliers } from '@/lib/actions/suppliers';
import { ImageUpload } from './ImageUpload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from './ui/calendar';
import {
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

interface Props extends Partial<Product> {
  type?: 'create' | 'update';
}

const ProductForm = ({ type = 'create', ...product }: Props) => {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch both categories and suppliers
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setIsLoading(true);

        const [categoriesData, suppliersData] = await Promise.all([
          getCategories(),
          getSuppliers(),
        ]);

        if (!isMounted) return;

        setCategories(categoriesData);
        setSuppliers(suppliersData);

        if (categoriesData.length === 0) {
          toast.warning('No categories found', {
            action: {
              label: 'Create',
              onClick: () => (window.location.href = '/inventory/categories'),
            },
          });
        }

        if (suppliersData.length === 0) {
          toast.warning('No suppliers found', {
            action: {
              label: 'Create',
              onClick: () => (window.location.href = '/inventory/suppliers'),
            },
          });
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load required data');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product.name || '',
      genericName: product.genericName || '',
      categoryId: product.categoryId || undefined,
      barcode: product.barcode || '',
      batchNumber: product.batchNumber || '',
      expiryDate: product.expiryDate
        ? new Date(product.expiryDate)
        : new Date(),
      quantity: product.quantity || 1,
      costPrice: product.costPrice || '',
      sellingPrice: product.sellingPrice || '',
      minStockLevel: product.minStockLevel || undefined,
      unit: product.unit || 'TABLET',
      supplierId: product.supplierId || undefined,
      imageUrl: product.imageUrl || '',
    },
  });

  const onSubmit = async (values: z.infer<typeof productSchema>) => {
    try {
      setIsSubmitting(true);
      let imageUrl = values.imageUrl || '';

      // Upload image if a new file is selected
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
        expiryDate: values.expiryDate.toISOString(),
        imageUrl,
      };

      const result =
        type === 'create'
          ? await createProduct(apiData)
          : await updateProduct(product.id!, apiData);

      if (result?.success) {
        toast.success(`Product ${type === 'create' ? 'added' : 'updated'}`);
        form.reset();
        setSelectedImageFile(null);
        router.push('/inventory/products');
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
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="flex items-center gap-1">
                          Product Name
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            required
                            placeholder="e.g., Paracetamol 500mg"
                            {...field}
                            className="focus:ring-2 focus:ring-blue-500"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

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
                          <Input placeholder="e.g., Acetaminophen" {...field} />
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
                        <FormLabel>Category</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(Number(value) || undefined)
                          }
                          value={field.value?.toString() || undefined}
                          disabled={isLoading || categories.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoading ? (
                              <div className="p-2 text-sm text-gray-500">
                                Loading categories...
                              </div>
                            ) : categories.length === 0 ? (
                              <div className="p-2 text-sm text-gray-500">
                                No categories available
                              </div>
                            ) : (
                              categories.map((category) => (
                                <SelectItem
                                  key={category.id}
                                  value={category.id.toString()}
                                >
                                  {category.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
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
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="TABLET">Tablet</SelectItem>
                            <SelectItem value="CAPSULE">Capsule</SelectItem>
                            <SelectItem value="ML">Milliliter (ML)</SelectItem>
                            <SelectItem value="GM">Gram (GM)</SelectItem>
                            <SelectItem value="UNIT">Unit</SelectItem>
                            <SelectItem value="VIAL">Vial</SelectItem>
                          </SelectContent>
                        </Select>
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
                    name="batchNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Batch Number
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            required
                            placeholder="e.g., BX2023-001"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barcode</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Scan or enter barcode"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expiryDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="flex items-center gap-1">
                          Expiry Date
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <Calendar
                          selected={field.value}
                          onChange={field.onChange}
                          minDate={new Date()}
                          placeholderText="Pick a date"
                          className="rounded-md border"
                        />
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(Number(value) || undefined)
                          }
                          value={field.value?.toString() || undefined}
                          disabled={isLoading || suppliers.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select supplier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoading ? (
                              <div className="p-2 text-sm text-gray-500">
                                Loading suppliers...
                              </div>
                            ) : suppliers.length === 0 ? (
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
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-500">
                              $
                            </span>
                            <Input
                              placeholder="0.00"
                              {...field}
                              className="pl-8"
                              onChange={(e) => {
                                const value = e.target.value;
                                if (
                                  value === '' ||
                                  /^\d*\.?\d{0,2}$/.test(value)
                                ) {
                                  field.onChange(value);
                                }
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sellingPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Selling Price
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-500">
                              $
                            </span>
                            <Input
                              placeholder="0.00"
                              {...field}
                              className="pl-8"
                              onChange={(e) => {
                                const value = e.target.value;
                                if (
                                  value === '' ||
                                  /^\d*\.?\d{0,2}$/.test(value)
                                ) {
                                  field.onChange(value);
                                }
                              }}
                            />
                          </div>
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
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            placeholder="Enter quantity"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value))
                            }
                          />
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
                          <Input
                            type="number"
                            min={0}
                            placeholder="Set alert threshold"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) =>
                              field.onChange(
                                parseInt(e.target.value) || undefined,
                              )
                            }
                          />
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
              onClick={() => router.push('/inventory/products')}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
