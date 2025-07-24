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

interface ProductViewDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="text-muted-foreground text-xs">{children}</p>
);

const Value = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm font-medium">{children}</p>
);

const InfoBlock = ({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) =>
  value ? (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Value>{value}</Value>
    </div>
  ) : null;

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
  <div className="space-y-4">
    <h3 className={`text-sm font-semibold flex items-center gap-2 ${color}`}>
      {icon}
      {title}
    </h3>
    <div className="grid gap-4 pl-5">{children}</div>
  </div>
);

const ProductViewDialog = ({
  product,
  open,
  onOpenChange,
}: ProductViewDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <PackageIcon className="w-5 h-5 text-primary" />
            Product Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-10 pt-4">
          {/* First Row: Basic Info & Inventory Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b pb-8">
            <Section
              title="Basic Information"
              icon={<InfoIcon className="w-4 h-4" />}
              color="text-blue-600"
            >
              <InfoBlock label="Product Name" value={product.name} />
              <InfoBlock label="Generic Name" value={product.genericName} />
              <InfoBlock label="Category" value={product.categoryName} />
              <InfoBlock label="Unit" value={product.unit} />
            </Section>

            <Section
              title="Inventory Details"
              icon={<BoxIcon className="w-4 h-4" />}
              color="text-green-600"
            >
              <InfoBlock label="Lot Number" value={product.lotNumber} />
              <InfoBlock label="Dosage Form" value={product.dosageForm} />
              <InfoBlock label="Brand Name" value={product.brandName} />
              <InfoBlock label="Barcode" value={product.barcode} />
              <InfoBlock
                label="Expiry Date"
                value={
                  product.expiryDate
                    ? new Date(product.expiryDate).toLocaleDateString()
                    : 'N/A'
                }
              />
              <InfoBlock label="Quantity" value={product.quantity} />
            </Section>
          </div>

          {/* Second Row: Pricing & Stock */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Section
              title="Pricing"
              icon={<Banknote className="w-4 h-4" />}
              color="text-yellow-600"
            >
              <InfoBlock
                label="Cost Price"
                value={formatCurrency(Number(product.costPrice))}
              />
              <InfoBlock
                label="Selling Price"
                value={formatCurrency(Number(product.sellingPrice))}
              />
            </Section>

            <Section
              title="Stock Management"
              icon={<LayersIcon className="w-4 h-4" />}
              color="text-purple-600"
            >
              <InfoBlock
                label="Minimum Stock Level"
                value={product.minStockLevel}
              />
              <InfoBlock label="Supplier" value={product.supplierName} />
            </Section>
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductViewDialog;
