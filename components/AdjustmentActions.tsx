'use client';

import React, { useState } from 'react';
import { Eye, FileText, Calendar, Package, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Adjustment } from '@/types';
import { format } from 'date-fns';

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

const AdjustmentActions = ({ adjustment }: { adjustment: Adjustment }) => {
  const [viewOpen, setViewOpen] = useState(false);

  const getReasonLabel = (reason: string) => {
    const labels = {
      DAMAGED: 'Damaged Product',
      EXPIRED: 'Expired Product',
      LOST_OR_STOLEN: 'Lost or Stolen',
      STOCK_CORRECTION: 'Stock Correction',
    };
    return labels[reason as keyof typeof labels] || reason;
  };

  return (
    <>
      <div className="flex items-center justify-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setViewOpen(true)}
          title="View Details"
        >
          <Eye className="h-4 w-4 text-gray-600" />
        </Button>
      </div>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
              Adjustment Details
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-10 pt-4">
            {/* First Row: Product Info & Adjustment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b pb-8">
              <Section
                title="Product Information"
                icon={<Package className="w-4 h-4" />}
                color="text-blue-600"
              >
                <InfoBlock label="Product Name" value={adjustment.name} />
                <InfoBlock label="Brand" value={adjustment.brandName} />
                <InfoBlock
                  label="Generic Name"
                  value={adjustment.genericName}
                />
                <InfoBlock label="Batch Number" value={adjustment.lotNumber} />
                <InfoBlock label="Supplier" value={adjustment.supplierName} />
                <InfoBlock
                  label="Expiry Date"
                  value={
                    adjustment.expiryDate
                      ? format(new Date(adjustment.expiryDate), 'MMM yyyy')
                      : null
                  }
                />
              </Section>

              <Section
                title="Adjustment Details"
                icon={<TrendingUp className="w-4 h-4" />}
                color="text-green-600"
              >
                <div className="space-y-1">
                  <Label>Quantity Change</Label>
                  <Value>
                    <span
                      className={
                        adjustment.quantityChange < 0
                          ? 'text-red-600'
                          : 'text-green-600'
                      }
                    >
                      {adjustment.quantityChange < 0 ? '' : '+'}
                      {adjustment.quantityChange}{' '}
                      {adjustment.unit?.toLowerCase() || 'units'}
                    </span>
                  </Value>
                </div>
                <div className="space-y-1">
                  <Label>Reason</Label>
                  <Value>
                    <span
                      className={`font-medium ${
                        adjustment.reason === 'DAMAGED' ||
                        adjustment.reason === 'LOST_OR_STOLEN'
                          ? 'text-red-600'
                          : adjustment.reason === 'EXPIRED'
                          ? 'text-amber-600'
                          : adjustment.reason === 'STOCK_CORRECTION'
                          ? 'text-blue-600'
                          : 'text-gray-600'
                      }`}
                    >
                      {getReasonLabel(adjustment.reason)}
                    </span>
                  </Value>
                </div>
                {adjustment.currentStock !== undefined && (
                  <InfoBlock
                    label="Current Stock"
                    value={`${adjustment.currentStock} ${
                      adjustment.unit?.toLowerCase() || 'units'
                    }`}
                  />
                )}
              </Section>
            </div>

            {/* Second Row: Timing & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Section
                title="Timing"
                icon={<Calendar className="w-4 h-4" />}
                color="text-purple-600"
              >
                <InfoBlock
                  label="Adjustment Date"
                  value={format(new Date(adjustment.createdAt), 'MMM dd, yyyy')}
                />
                <InfoBlock
                  label="Time"
                  value={format(new Date(adjustment.createdAt), 'HH:mm')}
                />
              </Section>

              {adjustment.notes && (
                <Section
                  title="Additional Information"
                  icon={<FileText className="w-4 h-4" />}
                  color="text-orange-600"
                >
                  <div className="space-y-1">
                    <Label>Notes</Label>
                    <div className="bg-gray-50 p-3 rounded-md border">
                      <p className="text-sm text-gray-700">
                        {adjustment.notes}
                      </p>
                    </div>
                  </div>
                </Section>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-6">
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdjustmentActions;
