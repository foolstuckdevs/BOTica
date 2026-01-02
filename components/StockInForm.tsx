'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { stockInItemSchema, stockInSchema } from '@/lib/validations/stock-in';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Calendar as CalendarIcon,
  Loader2,
  Plus,
  Trash2,
  ChevronLeft,
  Search,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createStockIn } from '@/lib/actions/stock-in';
import type { Supplier } from '@/types';
import { Separator } from '@/components/ui/separator';
import { QuickAddProductDialog } from '@/components/QuickAddProductDialog';
import { supabase } from '@/database/supabase';

interface LightweightProduct {
  id: number;
  name: string;
  brandName: string | null;
  genericName: string | null;
  unit: string | null;
}

interface ProductLookupResult extends LightweightProduct {
  quantity: number;
  lotNumber?: string | null;
  expiryDate?: string | null;
  costPrice?: string | null;
  sellingPrice?: string | null;
}

const stockInItemFormSchema = stockInItemSchema.extend({
  expiryDate: z.date().optional(),
  sellingPrice: z.string().optional(),
});

const stockInFormSchema = stockInSchema.extend({
  deliveryDate: z.date({ message: 'Delivery date is required.' }),
  attachmentUrl: z.string().min(1, 'Receipt image/PDF is required.'),
  discount: z
    .string()
    .regex(/^(?:\d{1,9})(?:\.\d{1,2})?$/, 'Discount must be valid.')
    .optional(),
  subtotal: z.string().optional(),
  total: z.string().optional(),
  items: z.array(stockInItemFormSchema).min(1),
});

type StockInFormValues = z.infer<typeof stockInFormSchema>;

interface Category {
  id: number;
  name: string;
}

interface StockInFormProps {
  pharmacyId: number;
  userId: string;
  suppliers: Supplier[];
  products: LightweightProduct[];
  categories: Category[];
}

type SerializedStockInFormValues = Omit<
  StockInFormValues,
  'deliveryDate' | 'items'
> & {
  deliveryDate: string | null;
  items: Array<
    Omit<StockInFormValues['items'][number], 'expiryDate'> & {
      expiryDate: string | null;
    }
  >;
};

interface StockInDraftPayload {
  formValues: SerializedStockInFormValues;
  selectedProducts: Record<number, ProductLookupResult>;
  pendingAttachmentName?: string | null;
  savedAt: string;
}

const createDefaultStockInValues = (): StockInFormValues => ({
  supplierId: undefined,
  deliveryDate: new Date(),
  attachmentUrl: '',
  discount: '0.00',
  subtotal: undefined,
  total: undefined,
  items: [],
});

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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatDateForApi = (date: Date) => format(date, 'yyyy-MM-dd');

const normalizeToMonthStart = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const serializeFormValues = (
  values: StockInFormValues,
): SerializedStockInFormValues => {
  const { deliveryDate, items, ...rest } = values;
  return {
    ...rest,
    deliveryDate: deliveryDate ? deliveryDate.toISOString() : null,
    items: items.map((item) => {
      const { expiryDate, ...itemRest } = item;
      return {
        ...itemRest,
        expiryDate: expiryDate ? expiryDate.toISOString() : null,
      };
    }),
  };
};

const deserializeFormValues = (
  values: SerializedStockInFormValues,
): StockInFormValues => ({
  supplierId: values.supplierId ?? undefined,
  deliveryDate: values.deliveryDate
    ? new Date(values.deliveryDate)
    : new Date(),
  attachmentUrl: values.attachmentUrl ?? '',
  discount: values.discount ?? '0.00',
  subtotal: values.subtotal ?? undefined,
  total: values.total ?? undefined,
  items:
    values.items?.map((item) => ({
      ...item,
      expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
    })) ?? [],
});

const StockInForm = ({
  pharmacyId,
  userId,
  suppliers,
  products,
  categories,
}: StockInFormProps) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductLookupResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<
    Record<number, ProductLookupResult>
  >({});
  const [showQuickAddDialog, setShowQuickAddDialog] = useState(false);
  const [quickAddInitialName, setQuickAddInitialName] = useState('');
  const [openExpiryPopover, setOpenExpiryPopover] = useState<number | null>(
    null,
  );
  const [openDeliveryDatePopover, setOpenDeliveryDatePopover] = useState(false);
  const [pendingAttachmentName, setPendingAttachmentName] = useState('');

  const draftStorageKey = useMemo(
    () => `stock-in-draft:${pharmacyId}:${userId}`,
    [pharmacyId, userId],
  );
  const isRestoringDraft = useRef(false);

  const form = useForm<StockInFormValues>({
    resolver: zodResolver(stockInFormSchema),
    defaultValues: createDefaultStockInValues(),
  });

  const staticProductLookup = useMemo(() => {
    const map: Record<number, LightweightProduct> = {};
    for (const product of products) {
      map[product.id] = product;
    }
    return map;
  }, [products]);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState,
    reset,
  } = form;
  const { isSubmitting } = formState;
  const fieldArray = useFieldArray({ control, name: 'items' });

  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.removeItem(draftStorageKey);
    } catch (error) {
      console.error('Failed to clear stock-in draft:', error);
    }
  }, [draftStorageKey]);

  const persistDraft = useCallback(
    (currentValues: StockInFormValues) => {
      if (typeof window === 'undefined' || isRestoringDraft.current) {
        return;
      }

      const hasMeaningfulData =
        currentValues.items.length > 0 ||
        !!currentValues.supplierId ||
        !!currentValues.attachmentUrl ||
        (currentValues.discount && currentValues.discount !== '0.00') ||
        !!pendingAttachmentName ||
        Object.keys(selectedProducts).length > 0;

      try {
        if (!hasMeaningfulData) {
          sessionStorage.removeItem(draftStorageKey);
          return;
        }

        const payload: StockInDraftPayload = {
          formValues: serializeFormValues(currentValues),
          selectedProducts,
          pendingAttachmentName: pendingAttachmentName || null,
          savedAt: new Date().toISOString(),
        };

        sessionStorage.setItem(draftStorageKey, JSON.stringify(payload));
      } catch (error) {
        console.error('Failed to persist stock-in draft:', error);
      }
    },
    [draftStorageKey, pendingAttachmentName, selectedProducts],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = sessionStorage.getItem(draftStorageKey);
    if (!raw) return;

    try {
      const parsed: StockInDraftPayload = JSON.parse(raw);
      const hydrated = deserializeFormValues(parsed.formValues);

      if (parsed.pendingAttachmentName) {
        hydrated.attachmentUrl = '';
      }

      isRestoringDraft.current = true;
      reset(hydrated);
      setSelectedProducts(parsed.selectedProducts || {});

      if (parsed.pendingAttachmentName) {
        setPendingAttachmentName(parsed.pendingAttachmentName);
        toast.info(
          'Draft restored. Please reattach the pending receipt before saving.',
        );
      } else {
        toast.info('Restored unsaved Stock-In draft.');
      }
    } catch (error) {
      console.error('Failed to restore stock-in draft:', error);
      sessionStorage.removeItem(draftStorageKey);
    } finally {
      isRestoringDraft.current = false;
    }
  }, [draftStorageKey, reset]);

  useEffect(() => {
    const subscription = watch((currentValues) => {
      persistDraft(currentValues as StockInFormValues);
    });

    return () => subscription.unsubscribe();
  }, [watch, persistDraft]);

  useEffect(() => {
    persistDraft(getValues() as StockInFormValues);
  }, [selectedProducts, pendingAttachmentName, persistDraft, getValues]);

  const items = watch('items');
  const discount = Number.parseFloat(watch('discount') || '0');

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        const params = new URLSearchParams({
          search: trimmed,
          limit: '20',
        });
        const response = await fetch(
          `/api/products/lookup?${params.toString()}`,
          {
            signal: controller.signal,
            cache: 'no-store',
          },
        );
        if (!response.ok) {
          throw new Error(`Lookup failed: ${response.statusText}`);
        }
        const json = await response.json();
        const list: ProductLookupResult[] = json.data || [];
        setSearchResults(list);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setSearchError(
            error instanceof Error
              ? error.message
              : 'Failed to search products.',
          );
        }
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const appendProduct = useCallback(
    (product: ProductLookupResult) => {
      fieldArray.prepend({
        productId: product.id,
        quantity: 1,
        unitCost: product.costPrice ?? '0.00',
        amount: '0.00',
        lotNumber: product.lotNumber ?? '',
        expiryDate: product.expiryDate
          ? new Date(product.expiryDate)
          : undefined,
        sellingPrice: product.sellingPrice ?? '',
      });
      setSelectedProducts((prev) => ({
        ...prev,
        [product.id]: product,
      }));
    },
    [fieldArray],
  );

  const handleProductSelect = useCallback(
    (product: ProductLookupResult) => {
      setSelectedProducts((prev) => ({
        ...prev,
        [product.id]: product,
      }));

      const existingIndex = items.findIndex(
        (item) => item.productId === product.id,
      );

      if (existingIndex !== -1) {
        toast.info(
          `${product.name} is already in this Stock-In form. Adjust the quantity in the list.`,
        );
        setSearchQuery('');
        setSearchResults([]);
        setSearchError(null);
        setShowResults(false);
        searchInputRef.current?.blur();
        return;
      } else {
        appendProduct(product);
        toast.success(`${product.name} added to the list.`);
      }

      setSearchQuery('');
      setSearchResults([]);
      setSearchError(null);
      setShowResults(false);
      searchInputRef.current?.blur();
    },
    [appendProduct, items],
  );

  const removeItem = useCallback(
    (index: number) => {
      const currentItems = getValues('items');
      const productId = currentItems[index]?.productId;
      fieldArray.remove(index);
      if (productId) {
        setSelectedProducts((prev) => {
          const next = { ...prev };
          delete next[productId];
          return next;
        });
      }
    },
    [fieldArray, getValues, setSelectedProducts],
  );

  const handleOpenQuickAdd = () => {
    setQuickAddInitialName(searchQuery.trim());
    setShowQuickAddDialog(true);
    setShowResults(false);
  };

  const handleQuickAddProductCreated = (product: ProductLookupResult) => {
    handleProductSelect(product);
    setSearchQuery('');
  };

  const uploadReceiptDirect = useCallback(async () => {
    if (!selectedFile) return '';

    // Validate again defensively
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error(
        'Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed.',
      );
      return '';
    }

    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || 'file';
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from('stock-in-receipts')
      .upload(fileName, selectedFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: selectedFile.type,
      });

    if (error) {
      toast.error(error.message || 'Failed to upload receipt');
      return '';
    }

    const { data } = supabase.storage
      .from('stock-in-receipts')
      .getPublicUrl(fileName);
    return data.publicUrl || '';
  }, [selectedFile]);

  const handleCancel = useCallback(() => {
    clearDraft();
    reset(createDefaultStockInValues());
    setSelectedProducts({});
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setPendingAttachmentName('');
    router.push('/inventory/stock-in');
  }, [clearDraft, reset, router]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      const amount = item.quantity * Number.parseFloat(item.unitCost || '0');
      return sum + (Number.isNaN(amount) ? 0 : amount);
    }, 0);
    const total = Math.max(
      subtotal - (Number.isNaN(discount) ? 0 : discount),
      0,
    );
    return {
      subtotal,
      total,
    };
  }, [items, discount]);

  const onSubmit = async (values: StockInFormValues) => {
    try {
      // Upload file first if selected
      let attachmentUrl = values.attachmentUrl;
      const pendingUpload = attachmentUrl?.startsWith('pending:');

      if (!selectedFile && (pendingUpload || !attachmentUrl)) {
        toast.error('Please select or reattach a receipt image/PDF.');
        return;
      }

      if (selectedFile) {
        const uploadedUrl = await uploadReceiptDirect();
        if (!uploadedUrl) {
          return;
        }
        attachmentUrl = uploadedUrl;
      }

      if (!attachmentUrl) {
        toast.error('Please select a receipt image/PDF');
        return;
      }

      const payload = {
        supplierId: values.supplierId,
        deliveryDate: formatDateForApi(values.deliveryDate),
        attachmentUrl,
        discount: values.discount,
        subtotal: totals.subtotal.toFixed(2),
        total: totals.total.toFixed(2),
        items: values.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          amount: (
            item.quantity * Number.parseFloat(item.unitCost || '0')
          ).toFixed(2),
          lotNumber: item.lotNumber || undefined,
          expiryDate: item.expiryDate
            ? formatDateForApi(item.expiryDate)
            : undefined,
        })),
      };

      const response = await createStockIn({
        ...payload,
        pharmacyId,
        createdBy: userId,
      });

      if (!response?.success) {
        toast.error('Failed to record stock in.');
        return;
      }

      toast.success('Stock in recorded successfully.');
      clearDraft();
      reset(createDefaultStockInValues());
      setSelectedProducts({});
      setSelectedFile(null);
      setFilePreviewUrl(null);
      setPendingAttachmentName('');
      router.push('/inventory/stock-in');
    } catch (error) {
      console.error('Stock in error:', error);
      toast.error('Something went wrong while recording stock in.');
    }
  };

  if (products.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-8 space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/inventory/stock-in')}
          className="group flex items-center gap-2 w-fit text-muted-foreground hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Stock In
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>No products available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Add products to inventory before recording a stock-in entry.
            </p>
            <div className="mt-4">
              <Button onClick={() => router.push('/inventory/products/new')}>
                Go to Add Product
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <Button
        variant="ghost"
        onClick={() => router.push('/inventory/stock-in')}
        className="group flex items-center gap-2 rounded-full text-sm text-muted-foreground hover:text-primary hover:bg-accent transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4 group-hover:translate-x-[-2px] transition-transform" />
        <span>Back to Stock In</span>
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">New Stock-In</h1>
          <p className="text-sm text-gray-500">
            Add received products to your inventory
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Delivery Details Section */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-lg font-medium text-gray-900">
                    Delivery Details
                  </h2>
                  <p className="text-sm text-gray-500">
                    Enter the delivery receipt information
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField
                    control={control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(
                              value ? Number.parseInt(value) : undefined,
                            )
                          }
                          value={field.value ? String(field.value) : undefined}
                        >
                          <FormControl>
                            <SelectTrigger className="h-10 w-full">
                              <SelectValue placeholder="Select supplier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {suppliers.map((supplier) => (
                              <SelectItem
                                key={supplier.id}
                                value={String(supplier.id)}
                              >
                                {supplier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="deliveryDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Delivery Date</FormLabel>
                        <Popover
                          open={openDeliveryDatePopover}
                          onOpenChange={setOpenDeliveryDatePopover}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                className={cn(
                                  'justify-start text-left font-normal h-10',
                                  !field.value && 'text-muted-foreground',
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value
                                  ? format(field.value, 'PPP')
                                  : 'Pick a date'}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              captionLayout="dropdown"
                              defaultMonth={field.value || new Date()}
                              selected={field.value}
                              onSelect={(date) => {
                                if (date) {
                                  field.onChange(date);
                                }
                                setOpenDeliveryDatePopover(false);
                              }}
                              startMonth={new Date(2020, 0)}
                              endMonth={
                                new Date(new Date().getFullYear() + 1, 11)
                              }
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="attachmentUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Receipt Image/PDF *</FormLabel>
                        <FormControl>
                          <Input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;

                              // Validate file type
                              const allowedTypes = [
                                'image/jpeg',
                                'image/jpg',
                                'image/png',
                                'image/webp',
                                'application/pdf',
                              ];
                              if (!allowedTypes.includes(file.type)) {
                                toast.error(
                                  'Invalid file type. Only images and PDFs are allowed.',
                                );
                                return;
                              }

                              // Validate file size (10MB)
                              if (file.size > 10 * 1024 * 1024) {
                                toast.error(
                                  'File too large. Maximum size is 10MB.',
                                );
                                return;
                              }

                              // Store file for later upload
                              setSelectedFile(file);
                              setPendingAttachmentName(file.name);

                              // Create preview URL for images
                              if (file.type.startsWith('image/')) {
                                const url = URL.createObjectURL(file);
                                setFilePreviewUrl(url);
                              } else {
                                setFilePreviewUrl(null);
                              }

                              // Set a placeholder value to pass validation
                              field.onChange(`pending:${file.name}`);
                            }}
                            className="h-10 file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="discount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="0.00"
                            {...field}
                            onChange={(event) =>
                              field.onChange(event.target.value)
                            }
                            className="h-10"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Selected File Info - Below the grid */}
                {selectedFile && (
                  <div className="mt-4 flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <span className="text-xs text-green-700 flex-1 truncate">
                      ✓ {selectedFile.name}
                    </span>
                    {filePreviewUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-blue-600 hover:text-blue-800"
                        onClick={() => window.open(filePreviewUrl, '_blank')}
                      >
                        Preview
                      </Button>
                    )}
                    {selectedFile.type === 'application/pdf' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-blue-600 hover:text-blue-800"
                        onClick={() => {
                          const url = URL.createObjectURL(selectedFile);
                          window.open(url, '_blank');
                        }}
                      >
                        Open PDF
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-red-500 hover:text-red-700"
                      onClick={() => {
                        setSelectedFile(null);
                        setFilePreviewUrl(null);
                        setPendingAttachmentName('');
                        // Reset the file input
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                        // Clear the form field
                        setValue('attachmentUrl', '');
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                )}

                {!selectedFile && pendingAttachmentName && (
                  <div className="mt-4 flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    Receipt &quot;{pendingAttachmentName}&quot; needs to be
                    reattached before saving.
                  </div>
                )}
              </div>

              {/* Line Items Section */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">
                      Products
                    </h2>
                    <p className="text-sm text-gray-500">
                      Add each product with quantity and cost
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenQuickAdd}
                    className="w-fit"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    New product
                  </Button>
                </div>

                {/* Search Box */}
                <div ref={searchContainerRef} className="relative mb-6">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    ref={searchInputRef}
                    placeholder="Search by name, brand, lot number, or generic name..."
                    value={searchQuery}
                    onFocus={() => setShowResults(true)}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setShowResults(true);
                    }}
                    className="pl-10 pr-4 py-3 h-auto"
                  />
                  {searchError && (
                    <p className="mt-2 text-xs text-red-600">{searchError}</p>
                  )}

                  {showResults && (
                    <div className="absolute left-0 right-0 top-full mt-2 z-50 border rounded-lg bg-white shadow-xl mb-6">
                      {searchLoading ? (
                        <div className="px-4 py-3 text-sm text-gray-500">
                          Searching...
                        </div>
                      ) : searchQuery.trim().length < 2 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">
                          Type at least 2 characters to search
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="px-4 py-6 text-center">
                          <Package className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm text-gray-500 mb-3">
                            No products found for &quot;{searchQuery}&quot;
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleOpenQuickAdd}
                            className="gap-1"
                          >
                            <Plus className="h-4 w-4" />
                            Create &quot;{searchQuery.trim().slice(0, 30)}&quot;
                          </Button>
                        </div>
                      ) : (
                        <div className="overflow-y-auto max-h-110 p-1.5 bg-white rounded-lg">
                          {searchResults.map((product) => {
                            const expiryDate = product.expiryDate
                              ? new Date(product.expiryDate)
                              : null;
                            const isExpiringSoon =
                              expiryDate &&
                              expiryDate <=
                                new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
                            const isExpired =
                              expiryDate && expiryDate < new Date();

                            return (
                              <button
                                key={product.id}
                                type="button"
                                className="w-full text-left px-3 py-2.5 rounded-md hover:bg-gray-50 transition-colors group border-b border-gray-100 last:border-0 bg-white"
                                onClick={() => handleProductSelect(product)}
                              >
                                {/* Product Name + Unit */}
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-medium text-gray-900 group-hover:text-blue-600 text-sm leading-tight">
                                    {product.name}
                                  </span>
                                  <span className="text-xs text-gray-400 uppercase shrink-0 mt-0.5">
                                    {product.unit || 'PIECE'}
                                  </span>
                                </div>
                                {/* Details row: Brand, Lot, Expiry, Stock */}
                                <div className="flex items-center gap-3 mt-1 text-xs">
                                  {product.brandName && (
                                    <span className="text-blue-600 font-medium">
                                      {product.brandName}
                                    </span>
                                  )}
                                  {product.lotNumber && (
                                    <span className="font-mono text-gray-500">
                                      Lot: {product.lotNumber}
                                    </span>
                                  )}
                                  {expiryDate && (
                                    <span
                                      className={cn(
                                        isExpired
                                          ? 'text-red-600'
                                          : isExpiringSoon
                                          ? 'text-amber-600'
                                          : 'text-green-600',
                                      )}
                                    >
                                      Exp: {format(expiryDate, 'MMM d, yyyy')}
                                    </span>
                                  )}
                                  <span className="text-gray-400 ml-auto">
                                    Stock: {product.quantity}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Spacer when dropdown is showing */}
                {showResults && searchResults.length > 0 && (
                  <div className="h-64" />
                )}

                {/* Line Items List */}
                <div className="space-y-3">
                  {fieldArray.fields.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
                      <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                      <h3 className="text-base font-medium text-gray-500">
                        No products added
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Use the search bar to find and add products
                      </p>
                    </div>
                  ) : (
                    fieldArray.fields.map((field, index) => {
                      const productId = watch(`items.${index}.productId`);
                      const selected =
                        selectedProducts[productId] ||
                        staticProductLookup[productId];
                      const productName = selected?.name || 'Product removed';
                      const unitLabel = selected?.unit || 'units';
                      const lineTotal =
                        items[index].quantity *
                        Number.parseFloat(items[index].unitCost || '0');

                      // Check if this is a new batch (lot/expiry/cost differs)
                      const currentLot = items[index].lotNumber?.trim() || '';
                      const currentExpiry = items[index].expiryDate;
                      const currentCost = Number.parseFloat(
                        items[index].unitCost || '0',
                      );

                      const originalLot =
                        (selected as ProductLookupResult)?.lotNumber?.trim() ||
                        '';
                      const originalExpiryStr = (
                        selected as ProductLookupResult
                      )?.expiryDate;
                      const originalExpiry = originalExpiryStr
                        ? new Date(originalExpiryStr)
                        : null;
                      const originalCost = Number.parseFloat(
                        (selected as ProductLookupResult)?.costPrice || '0',
                      );
                      const originalSellingPrice = Number.parseFloat(
                        (selected as ProductLookupResult)?.sellingPrice || '0',
                      );

                      const lotDiffers =
                        currentLot && currentLot !== originalLot;
                      const expiryDiffers =
                        currentExpiry &&
                        originalExpiry &&
                        currentExpiry.toISOString().slice(0, 10) !==
                          originalExpiry.toISOString().slice(0, 10);
                      const costDiffers =
                        originalCost > 0 &&
                        Math.abs(currentCost - originalCost) >= 0.01;

                      const isNewBatch = lotDiffers || expiryDiffers;
                      // Only show selling price field when there's a new batch OR cost changed
                      // New batch = new product entry required
                      // Cost only change = update existing product
                      const showSellingPrice = isNewBatch || costDiffers;

                      return (
                        <div
                          key={field.id}
                          className={cn(
                            'rounded-lg border bg-white p-4 shadow-sm',
                            showSellingPrice
                              ? 'border-amber-300'
                              : 'border-gray-200',
                          )}
                        >
                          {/* Product Header */}
                          <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-gray-100">
                            <FormField
                              control={control}
                              name={`items.${index}.productId`}
                              render={({ field: itemField }) => (
                                <FormItem className="flex-1 min-w-0">
                                  <input type="hidden" {...itemField} />
                                  <p className="font-medium text-gray-900 leading-tight">
                                    {productName}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    Unit: {unitLabel}
                                  </p>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(index)}
                              className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* New Batch / Cost Change Warning */}
                          {showSellingPrice && (
                            <div
                              className={cn(
                                'mb-4 p-3 rounded-lg border',
                                isNewBatch
                                  ? 'bg-blue-50 border-blue-200'
                                  : 'bg-amber-50 border-amber-200',
                              )}
                            >
                              <p
                                className={cn(
                                  'text-xs font-medium',
                                  isNewBatch
                                    ? 'text-blue-800'
                                    : 'text-amber-800',
                                )}
                              >
                                {isNewBatch
                                  ? `📦 New batch - will create a separate product entry`
                                  : '💰 Unit cost differs from current (₱' +
                                    originalCost.toFixed(2) +
                                    ')'}
                              </p>
                              {isNewBatch && (
                                <p className="text-xs text-blue-600 mt-1">
                                  {lotDiffers && expiryDiffers
                                    ? `Different lot (${
                                        originalLot || 'none'
                                      } → ${
                                        currentLot || 'none'
                                      }) and expiry date`
                                    : lotDiffers
                                    ? `Different lot number: ${
                                        originalLot || 'none'
                                      } → ${currentLot || 'none'}`
                                    : `Different expiry date: ${
                                        originalExpiry
                                          ? format(
                                              originalExpiry,
                                              'MMM d, yyyy',
                                            )
                                          : 'none'
                                      } → ${
                                        currentExpiry
                                          ? format(currentExpiry, 'MMM d, yyyy')
                                          : 'none'
                                      }`}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Form Fields Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <FormField
                              control={control}
                              name={`items.${index}.quantity`}
                              render={({ field: itemField }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium text-gray-600">
                                    Quantity
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={itemField.value}
                                      onChange={(event) =>
                                        itemField.onChange(
                                          Number.parseInt(event.target.value) ||
                                            0,
                                        )
                                      }
                                      className="h-9"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={control}
                              name={`items.${index}.unitCost`}
                              render={({ field: itemField }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium text-gray-600">
                                    Unit Cost
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="0.00"
                                      value={itemField.value}
                                      onChange={(event) =>
                                        itemField.onChange(
                                          sanitizeMoneyInput(
                                            event.target.value,
                                          ),
                                        )
                                      }
                                      className="h-9"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={control}
                              name={`items.${index}.lotNumber`}
                              render={({ field: itemField }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium text-gray-600">
                                    Lot / Batch
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Optional"
                                      {...itemField}
                                      className="h-9"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={control}
                              name={`items.${index}.expiryDate`}
                              render={({ field: itemField }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium text-gray-600">
                                    Expiry Date
                                  </FormLabel>
                                  <Popover
                                    open={openExpiryPopover === index}
                                    onOpenChange={(open) =>
                                      setOpenExpiryPopover(open ? index : null)
                                    }
                                  >
                                    <PopoverTrigger asChild>
                                      <FormControl>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          className={cn(
                                            'justify-start text-left font-normal w-full h-9 text-sm',
                                            !itemField.value &&
                                              'text-muted-foreground',
                                          )}
                                        >
                                          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                          {itemField.value
                                            ? format(
                                                itemField.value,
                                                'MMM d, yyyy',
                                              )
                                            : 'Select'}
                                        </Button>
                                      </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent
                                      className="w-auto p-0"
                                      align="start"
                                    >
                                      <Calendar
                                        mode="single"
                                        captionLayout="dropdown"
                                        defaultMonth={
                                          itemField.value || new Date()
                                        }
                                        selected={itemField.value}
                                        onSelect={(date) => {
                                          if (date) {
                                            itemField.onChange(
                                              normalizeToMonthStart(date),
                                            );
                                            setOpenExpiryPopover(null);
                                          }
                                        }}
                                        onMonthChange={(month) => {
                                          const updated =
                                            normalizeToMonthStart(month);
                                          itemField.onChange(updated);
                                        }}
                                        startMonth={
                                          new Date(new Date().getFullYear(), 0)
                                        }
                                        endMonth={
                                          new Date(
                                            new Date().getFullYear() + 10,
                                            11,
                                          )
                                        }
                                      />
                                    </PopoverContent>
                                  </Popover>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Selling Price Field - Only shows when batch/cost differs */}
                          {showSellingPrice && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <FormField
                                control={control}
                                name={`items.${index}.sellingPrice`}
                                render={({ field: itemField }) => (
                                  <FormItem>
                                    <FormLabel
                                      className={cn(
                                        'text-xs font-medium',
                                        isNewBatch
                                          ? 'text-blue-700'
                                          : 'text-amber-700',
                                      )}
                                    >
                                      {isNewBatch
                                        ? 'Selling Price *'
                                        : 'Update Selling Price (optional)'}
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder={
                                          isNewBatch
                                            ? 'Required'
                                            : 'Leave blank to keep current'
                                        }
                                        value={itemField.value || ''}
                                        onChange={(event) =>
                                          itemField.onChange(event.target.value)
                                        }
                                        className={cn(
                                          'h-9',
                                          isNewBatch
                                            ? 'border-blue-300 focus:border-blue-500'
                                            : 'border-amber-300 focus:border-amber-500',
                                        )}
                                      />
                                    </FormControl>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Current: ₱
                                      {originalSellingPrice.toFixed(2)}
                                      {!isNewBatch &&
                                        ' • Only updates if you enter a new price'}
                                    </p>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}

                          {/* Line Total */}
                          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                            <div className="text-sm">
                              <span className="text-gray-500">
                                Line total:{' '}
                              </span>
                              <span className="font-semibold text-gray-900">
                                ₱{lineTotal.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 space-y-6 z-10">
                {/* Summary Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Summary
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="font-medium text-gray-900">
                        ₱{formatCurrency(totals.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Discount</span>
                      <span className="text-gray-700">
                        -₱
                        {formatCurrency(Number.isNaN(discount) ? 0 : discount)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="text-lg font-bold text-gray-900">
                        ₱{formatCurrency(totals.total)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-gray-500">
                    Stock levels will be updated immediately after saving.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Saving...</span>
                      </div>
                    ) : (
                      'Save Stock-In'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  Product not found? Search and click &quot;Create&quot; to add
                  it.
                </p>
                <p className="text-xs text-amber-700 text-center bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  Uploading receipts can take a few seconds. Please stay on this
                  page until you see the success message.
                </p>
              </div>
            </div>
          </div>
        </form>
      </Form>

      {/* Quick Add Product Dialog */}
      <QuickAddProductDialog
        open={showQuickAddDialog}
        onOpenChange={setShowQuickAddDialog}
        categories={categories}
        pharmacyId={pharmacyId}
        initialName={quickAddInitialName}
        onProductCreated={handleQuickAddProductCreated}
      />
    </div>
  );
};

export default StockInForm;
