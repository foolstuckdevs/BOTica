'use client';

import {
  ArrowRight,
  CalendarClock,
  PackageCheck,
  TrendingUpIcon,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Product } from '@/types';

interface SectionCardsProps {
  products: Product[];
}

export function SectionCards({ products }: SectionCardsProps) {
  // Calculate dynamic counts
  const now = new Date();
  // Placeholder for today's sales, replace with real data if available
  const todaysSales = 12400; // static fallback
  const lowStockCount = products.filter(
    (p) =>
      p.minStockLevel != null &&
      p.quantity <= p.minStockLevel &&
      p.quantity > 0,
  ).length;
  const expiringSoonCount = products.filter((p) => {
    if (!p.expiryDate) return false;
    const expiry = new Date(p.expiryDate);
    return (
      expiry > now &&
      expiry.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000
    );
  }).length;
  const activeCount = products.filter((p) => p.quantity > 0).length;
  const restockSoonCount = lowStockCount; // alias for clarity

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-10">
      {/* Today's Sales */}
      <Card>
        <CardHeader>
          <CardDescription className="text-xs text-muted-foreground">
            Today’s Sales
          </CardDescription>
          <CardTitle className="text-2xl font-bold tabular-nums text-blue-700">
            ₱
            {todaysSales.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </CardTitle>
          <Badge
            variant="outline"
            className="mt-2 flex gap-1 items-center rounded-md text-xs text-blue-600 border-blue-200 bg-blue-100/50"
          >
            <TrendingUpIcon className="h-3 w-3" />
            +6.2% vs yesterday
          </Badge>
        </CardHeader>
        <CardFooter className="justify-end">
          <Link
            href="/reports/sales"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            View Report <ArrowRight className="w-3 h-3" />
          </Link>
        </CardFooter>
      </Card>

      {/* Restock Soon (Low Stock) */}
      <Card>
        <CardHeader>
          <CardDescription className="text-xs text-muted-foreground">
            Low Stock Items
          </CardDescription>
          <CardTitle className="text-2xl font-bold tabular-nums text-yellow-700">
            {restockSoonCount} items
          </CardTitle>
          <Badge
            variant="outline"
            className="mt-2 flex gap-1 items-center rounded-md text-xs text-yellow-800 border-yellow-300 bg-yellow-100"
          >
            <TrendingUpIcon className="h-3 w-3" />
            Restock Soon
          </Badge>
        </CardHeader>
        <CardFooter className="justify-end">
          <Link
            href="/inventory/products?filter=low-stock"
            className="text-xs text-yellow-800 hover:underline flex items-center gap-1"
          >
            View Products <ArrowRight className="w-3 h-3" />
          </Link>
        </CardFooter>
      </Card>

      {/* Expiring Soon */}
      <Card>
        <CardHeader>
          <CardDescription className="text-xs text-muted-foreground">
            Expiring Soon (30 Days)
          </CardDescription>
          <CardTitle className="text-2xl font-bold tabular-nums text-red-700">
            {expiringSoonCount} items
          </CardTitle>
          <Badge
            variant="outline"
            className="mt-2 flex gap-1 items-center rounded-md text-xs text-red-700 border-red-300 bg-red-100"
          >
            <CalendarClock className="h-3 w-3" />
            Urgent
          </Badge>
        </CardHeader>
        <CardFooter className="justify-end">
          <Link
            href="/reports/expiration"
            className="text-xs text-red-700 hover:underline flex items-center gap-1"
          >
            View Expiry List <ArrowRight className="w-3 h-3" />
          </Link>
        </CardFooter>
      </Card>

      {/* Active Products */}
      <Card>
        <CardHeader>
          <CardDescription className="text-xs text-muted-foreground">
            Active Products
          </CardDescription>
          <CardTitle className="text-2xl font-bold tabular-nums text-green-700">
            {activeCount} items
          </CardTitle>
          <Badge
            variant="outline"
            className="mt-2 flex gap-1 items-center rounded-md text-xs text-green-700 border-green-300 bg-green-100"
          >
            <PackageCheck className="h-3 w-3" />
            Up to date
          </Badge>
        </CardHeader>
        <CardFooter className="justify-end">
          <Link
            href="/inventory/products"
            className="text-xs text-green-700 hover:underline flex items-center gap-1"
          >
            Manage Products <ArrowRight className="w-3 h-3" />
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
