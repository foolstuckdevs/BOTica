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
import { formatCurrency } from '@/lib/helpers/formatCurrency';
import { formatExpiryDatePH } from '@/lib/date-format';

interface ProductViewDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
    {children}
  </p>
);

const Value = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm font-semibold text-foreground">{children}</p>
);

const InfoBlock = ({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) => (
  <div className="rounded-lg border bg-background/60 p-3 shadow-sm">
    <Label>{label}</Label>
    <div className="mt-1">
      <Value>{value || '—'}</Value>
    </div>
  </div>
);

const Section = ({
  title,
  icon,
  color,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-lg border bg-card p-5 space-y-5">
    <h3 className={`text-base font-bold flex items-center gap-2.5 ${color} pb-3 border-b`}>
      {icon}
      {title}
    </h3>
    <div className="grid gap-5">{children}</div>
  </div>
);

const ProductViewDialog = ({
  product,
  open,
  onOpenChange,
}: ProductViewDialogProps) => {
  const fields = [
    { label: 'Product Name', value: product.name },
    { label: 'Generic Name', value: product.genericName },
    { label: 'Category', value: product.categoryName },
    { label: 'Unit', value: product.unit },
    { label: 'Brand Name', value: product.brandName },
    { label: 'Lot Number', value: product.lotNumber },
    { label: 'Dosage Form', value: product.dosageForm },
    {
      label: 'Expiry Date',
      value: product.expiryDate ? formatExpiryDatePH(product.expiryDate) : undefined,
    },
    { label: 'Current Quantity', value: product.quantity },
    { label: 'Minimum Stock Level', value: product.minStockLevel },
    { label: 'Supplier', value: product.supplierName },
    { label: 'Cost Price', value: formatCurrency(Number(product.costPrice)) },
    { label: 'Selling Price', value: formatCurrency(Number(product.sellingPrice)) },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="p-2 rounded-lg bg-primary/10">
              <PackageIcon className="w-6 h-6 text-primary" />
            </div>
            Product Details
          </DialogTitle>
        </DialogHeader>

        <div className="py-1">
          <div className="rounded-xl border bg-muted/20 p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {fields.map((field) => (
                <InfoBlock key={field.label} label={field.label} value={field.value} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="px-6">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductViewDialog;
