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
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createProduct, updateProduct } from '@/lib/actions/products';
import { getCategories } from '@/lib/actions/categories';
import { Calendar } from './ui/calendar';
import {
  CalendarIcon,
  PackageIcon,
  TagIcon,
  Banknote,
  LayoutGrid,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { getSuppliers } from '@/lib/actions/suppliers';
import { ImageUpload } from './ImageUpload';

interface Props extends Partial<Product> {
  type?: 'create' | 'update';
}

const ProductForm = ({ type = 'create', ...product }: Props) => {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]); // ([]) It initializes the state with an empty array.
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

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
          : await updateProduct(product.id!, apiData); // Pass id and params separately

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
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">
        {type === 'create' ? 'Add New Product' : 'Edit Product'}
      </h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-6">
            {/* Product Information Section */}
            <div className="bg-gray-50 p-6 rounded-lg shadow-sm space-y-6">
              <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 flex items-center">
                <span className="h-5 w-1 bg-blue-600 rounded-full mr-2"></span>
                <PackageIcon className="w-5 h-5 mr-2 text-blue-600" />
                Product Information
              </h3>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Product Name*
                    </FormLabel>
                    <FormControl>
                      <Input
                        required
                        placeholder="e.g., Paracetamol 500mg"
                        {...field}
                        className="focus:ring-2 focus:ring-blue-500 border-gray-300"
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-600" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="genericName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Generic Name
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Acetaminophen" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs text-red-600" />
                  </FormItem>
                )}
              />

              {/* Category Selection Field */}
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Category
                    </FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(Number(value) || undefined)
                      }
                      value={field.value?.toString() || undefined}
                      disabled={isLoading || categories.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full border-gray-300 focus:ring-2 focus:ring-blue-500">
                          <SelectValue placeholder="Select a category" />
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
                    <FormMessage className="text-xs text-red-600" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Unit*
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full border-gray-300 focus:ring-2 focus:ring-blue-500">
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
                    <FormMessage className="text-xs text-red-600" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
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
                    <FormMessage className="text-xs text-red-600" />
                  </FormItem>
                )}
              />
            </div>

            {/* Inventory Details Section */}
            <div className="bg-gray-50 p-6 rounded-lg shadow-sm space-y-6">
              <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 flex items-center">
                <span className="h-5 w-1 bg-green-600 rounded-full mr-2"></span>
                <LayoutGrid className="w-5 h-5 mr-2 text-green-600" />
                Inventory Details
              </h3>

              <FormField
                control={form.control}
                name="batchNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Batch Number*
                    </FormLabel>
                    <FormControl>
                      <Input
                        required
                        placeholder="e.g., BX2023-001"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-600" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Barcode
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Scan or enter barcode" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs text-red-600" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Expiry Date*
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full pl-3 text-left font-normal border-gray-300',
                              !field.value && 'text-muted-foreground',
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage className="text-xs text-red-600" />
                  </FormItem>
                )}
              />
            </div>

            {/* Pricing Section */}
            <div className="bg-gray-50 p-6 rounded-lg shadow-sm space-y-6">
              <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 flex items-center">
                <span className="h-5 w-1 bg-yellow-500 rounded-full mr-2"></span>
                <Banknote className="w-5 h-5 mr-2 text-yellow-600" />
                Pricing
              </h3>

              <FormField
                control={form.control}
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Cost Price*
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-2">$</span>
                        <Input
                          placeholder="0.00"
                          {...field}
                          className="pl-8"
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                              field.onChange(value);
                            }
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs text-red-600" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sellingPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Selling Price*
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-2">$</span>
                        <Input
                          placeholder="0.00"
                          {...field}
                          className="pl-8"
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                              field.onChange(value);
                            }
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs text-red-600" />
                  </FormItem>
                )}
              />
            </div>

            {/* Stock Management Section */}
            <div className="bg-gray-50 p-6 rounded-lg shadow-sm space-y-6">
              <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 flex items-center">
                <span className="h-5 w-1 bg-purple-600 rounded-full mr-2"></span>
                <TagIcon className="w-5 h-5 mr-2 text-purple-600" />
                Stock Management
              </h3>

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Quantity*
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
                    <FormMessage className="text-xs text-red-600" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minStockLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Minimum Stock Level
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Set alert threshold"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || undefined)
                        }
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-600" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Supplier
                    </FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(Number(value) || undefined)
                      }
                      value={field.value?.toString() || undefined}
                      disabled={isLoading || suppliers.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full border-gray-300 focus:ring-2 focus:ring-blue-500">
                          <SelectValue placeholder="Select a supplier" />
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
                    <FormMessage className="text-xs text-red-600" />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/inventory/products')}
              className="px-8 py-2 rounded-lg border-gray-300 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="px-8 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              {type === 'create' ? 'Add Product' : 'Update Product'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ProductForm;
