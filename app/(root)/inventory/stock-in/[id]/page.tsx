'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getStockInById } from '@/lib/actions/stock-in';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChevronLeft,
  FileText,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';
import { formatDatePH, formatExpiryDatePH } from '@/lib/date-format';
import { formatCurrency } from '@/lib/helpers/formatCurrency';
import type { StockIn } from '@/types';
import { useSession } from 'next-auth/react';

const StockInViewPage = () => {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [stockIn, setStockIn] = useState<StockIn | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStockIn = async () => {
      if (!session?.user?.pharmacyId || !params.id) return;

      try {
        const data = await getStockInById(
          Number(params.id),
          session.user.pharmacyId,
        );
        setStockIn(data);
      } catch (error) {
        console.error('Error fetching stock-in:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStockIn();
  }, [params.id, session?.user?.pharmacyId]);

  if (loading) {
    return (
      <div className="px-6 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!stockIn) {
    return (
      <div className="px-6 py-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900">
            Stock-in not found
          </h2>
          <p className="text-gray-500 mt-2">
            The stock-in record you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button
            className="mt-4"
            onClick={() => router.push('/inventory/stock-in')}
          >
            Back to Stock-In List
          </Button>
        </div>
      </div>
    );
  }

  const isPdf = stockIn.attachmentUrl?.toLowerCase().endsWith('.pdf');

  const sortedItems = [...(stockIn.items || [])].sort((a, b) => {
    const aName = (a.productName || `Product #${a.productId}`).toLowerCase();
    const bName = (b.productName || `Product #${b.productId}`).toLowerCase();
    return aName.localeCompare(bName);
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/inventory/stock-in')}
        className="group flex items-center gap-2 rounded-full text-sm text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
      >
        <ChevronLeft className="w-4 h-4 group-hover:translate-x-[-2px] transition-transform" />
        <span>Back to Stock-In</span>
      </Button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Stock-In Details
        </h1>
        <p className="text-sm text-gray-500">
          Recorded on {formatDatePH(stockIn.createdAt)}
        </p>
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Delivery Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Column 1: Supplier and Attachment */}
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Supplier
                </p>
                <p className="font-medium text-gray-900 mt-1">
                  {stockIn.supplierName || '—'}
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Receipt Attachment
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    {stockIn.attachmentUrl ? 'Available' : 'Not uploaded'}
                  </p>
                </div>
                {stockIn.attachmentUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(stockIn.attachmentUrl!, '_blank')
                    }
                    className="gap-2"
                  >
                    {isPdf ? (
                      <FileText className="h-4 w-4" />
                    ) : (
                      <ImageIcon className="h-4 w-4" />
                    )}
                    {isPdf ? 'View PDF' : 'View Image'}
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Column 2: Delivery Date and Discount */}
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Delivery Date
                </p>
                <p className="font-medium text-gray-900 mt-1">
                  {formatDatePH(stockIn.deliveryDate)}
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Discount
                </p>
                <p className="font-medium text-gray-900 mt-1">
                  {formatCurrency(Number(stockIn.discount))}
                </p>
              </div>
            </div>

            {/* Column 3: Subtotal and Total */}
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Subtotal
                </p>
                <p className="font-medium text-gray-900 mt-1">
                  {formatCurrency(Number(stockIn.subtotal))}
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Total
                </p>
                <p className="font-semibold text-xl text-gray-900 mt-1">
                  {formatCurrency(Number(stockIn.total))}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Items Received</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">
                      Product
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600">
                      Lot #
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600">
                      Expiry
                    </th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">
                      Qty
                    </th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">
                      Unit Cost
                    </th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2 px-2">
                        {item.productName || `Product #${item.productId}`}
                      </td>
                      <td className="py-2 px-2 text-gray-600">
                        {item.lotNumber || '—'}
                      </td>
                      <td className="py-2 px-2 text-gray-600">
                        {item.expiryDate
                          ? formatExpiryDatePH(item.expiryDate)
                          : '—'}
                      </td>
                      <td className="py-2 px-2 text-right">{item.quantity}</td>
                      <td className="py-2 px-2 text-right">
                        {formatCurrency(Number(item.unitCost))}
                      </td>
                      <td className="py-2 px-2 text-right font-medium">
                        {formatCurrency(Number(item.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No items found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StockInViewPage;
