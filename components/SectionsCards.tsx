import {
  TrendingDownIcon,
  TrendingUpIcon,
  PackageMinus,
  PackageCheck,
  ShoppingCart,
  ArrowRight,
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
    <div className="*:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card lg:px-6">
      {/* Total Sales */}
      <Card className="@container/card relative overflow-hidden">
        <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-blue-200/60 to-blue-400/10 rounded-bl-full pointer-events-none" />
        <CardHeader className="relative z-10">
          <CardDescription>Total Sales (This Month)</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            ₱85,300.00
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
              <TrendingUpIcon className="size-3" />
              +18.2%
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm z-10">
          <div className="flex gap-2 font-medium">
            Increased sales this month <TrendingUpIcon className="size-4" />
          </div>
          <a
            href="#"
            className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            View Details <ArrowRight className="w-3 h-3" />
          </a>
        </CardFooter>
      </Card>

      {/* Low Stock Items */}
      <Card className="@container/card relative overflow-hidden">
        <div className="absolute left-0 top-0 w-24 h-24 bg-gradient-to-br from-orange-200/60 to-orange-400/10 rounded-br-full pointer-events-none" />
        <CardHeader className="relative z-10">
          <CardDescription>Low Stock Items</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            12
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
              <TrendingDownIcon className="size-3" />
              Needs restock
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm z-10">
          <div className="flex gap-2 font-medium">
            Inventory below threshold <PackageMinus className="size-4" />
          </div>
          <div className="text-muted-foreground">Check stock levels today</div>
          <a
            href="#"
            className="mt-2 text-xs text-orange-600 hover:underline flex items-center gap-1"
          >
            View Details <ArrowRight className="w-3 h-3" />
          </a>
        </CardFooter>
      </Card>

      {/* Active Products */}
      <Card className="@container/card relative overflow-hidden">
        <div className="absolute right-0 bottom-0 w-24 h-24 bg-gradient-to-tr from-green-200/60 to-green-400/10 rounded-tl-full pointer-events-none" />
        <CardHeader className="relative z-10">
          <CardDescription>Active Products</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            183
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
              <PackageCheck className="size-3" />
              In stock
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm z-10">
          <div className="flex gap-2 font-medium">
            All products tracked <PackageCheck className="size-4" />
          </div>
          <div className="text-muted-foreground">Inventory under control</div>
          <a
            href="#"
            className="mt-2 text-xs text-green-600 hover:underline flex items-center gap-1"
          >
            View Details <ArrowRight className="w-3 h-3" />
          </a>
        </CardFooter>
      </Card>

      {/* Monthly Restocks */}
      <Card className="@container/card relative overflow-hidden">
        <div className="absolute left-0 bottom-0 w-24 h-24 bg-gradient-to-tr from-purple-200/60 to-purple-400/10 rounded-tr-full pointer-events-none" />
        <CardHeader className="relative z-10">
          <CardDescription>Monthly Restocks</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            27
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
              <ShoppingCart className="size-3" />
              +10%
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm z-10">
          <div className="flex gap-2 font-medium">
            Regular restocking <ShoppingCart className="size-4" />
          </div>
          <div className="text-muted-foreground">Supplies maintained well</div>
          <a
            href="#"
            className="mt-2 text-xs text-purple-600 hover:underline flex items-center gap-1"
          >
            View Details <ArrowRight className="w-3 h-3" />
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}
