'use client';

import {
  ArrowRight,
  CalendarClock,
  PackageCheck,
  TrendingUpIcon,
  FileText,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function SectionCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-10">
      {/* Today's Sales */}
      <Card>
        <CardHeader>
          <CardDescription className="text-xs text-muted-foreground">
            Today’s Sales
          </CardDescription>
          <CardTitle className="text-2xl font-bold tabular-nums text-blue-700">
            ₱12,400.00
          </CardTitle>
          <Badge
            variant="outline"
            className="mt-2 flex gap-1 items-center rounded-md text-xs text-blue-600 border-blue-200 bg-blue-50"
          >
            <TrendingUpIcon className="h-3 w-3" />
            +6.2% vs yesterday
          </Badge>
        </CardHeader>
        <CardFooter className="justify-end">
          <a
            href="/reports/sales"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            View Report <ArrowRight className="w-3 h-3" />
          </a>
        </CardFooter>
      </Card>

      {/* Expiring Soon */}
      <Card>
        <CardHeader>
          <CardDescription className="text-xs text-muted-foreground">
            Expiring Soon (30 Days)
          </CardDescription>
          <CardTitle className="text-2xl font-bold tabular-nums text-red-600">
            9 items
          </CardTitle>
          <Badge
            variant="outline"
            className="mt-2 flex gap-1 items-center rounded-md text-xs text-red-600 border-red-200 bg-red-50"
          >
            <CalendarClock className="h-3 w-3" />
            Urgent
          </Badge>
        </CardHeader>
        <CardFooter className="justify-end">
          <a
            href="/reports/expiration"
            className="text-xs text-red-600 hover:underline flex items-center gap-1"
          >
            View Expiry List <ArrowRight className="w-3 h-3" />
          </a>
        </CardFooter>
      </Card>

      {/* Active Products */}
      <Card>
        <CardHeader>
          <CardDescription className="text-xs text-muted-foreground">
            Active Products
          </CardDescription>
          <CardTitle className="text-2xl font-bold tabular-nums text-green-700">
            182 items
          </CardTitle>
          <Badge
            variant="outline"
            className="mt-2 flex gap-1 items-center rounded-md text-xs text-green-700 border-green-200 bg-green-50"
          >
            <PackageCheck className="h-3 w-3" />
            Up to date
          </Badge>
        </CardHeader>
        <CardFooter className="justify-end">
          <a
            href="/inventory/products"
            className="text-xs text-green-700 hover:underline flex items-center gap-1"
          >
            Manage Products <ArrowRight className="w-3 h-3" />
          </a>
        </CardFooter>
      </Card>

      {/* Monthly Purchase Orders */}
      <Card>
        <CardHeader>
          <CardDescription className="text-xs text-muted-foreground">
            Purchase Orders (July)
          </CardDescription>
          <CardTitle className="text-2xl font-bold tabular-nums text-purple-700">
            11 orders
          </CardTitle>
          <Badge
            variant="outline"
            className="mt-2 flex gap-1 items-center rounded-md text-xs text-purple-700 border-purple-200 bg-purple-50"
          >
            <FileText className="h-3 w-3" />
            Updated
          </Badge>
        </CardHeader>
        <CardFooter className="justify-end">
          <a
            href="/inventory/purchase-order"
            className="text-xs text-purple-700 hover:underline flex items-center gap-1"
          >
            View Orders <ArrowRight className="w-3 h-3" />
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}
