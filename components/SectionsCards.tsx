import {
  TrendingDownIcon,
  TrendingUpIcon,
  PackageMinus,
  PackageCheck,
  ShoppingCart,
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
      <Card className="@container/card">
        <CardHeader className="relative">
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
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="flex gap-2 font-medium">
            Increased sales this month <TrendingUpIcon className="size-4" />
          </div>
        </CardFooter>
      </Card>

      {/* Low Stock Items */}
      <Card className="@container/card">
        <CardHeader className="relative">
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
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="flex gap-2 font-medium">
            Inventory below threshold <PackageMinus className="size-4" />
          </div>
          <div className="text-muted-foreground">Check stock levels today</div>
        </CardFooter>
      </Card>

      {/* Active Products */}
      <Card className="@container/card">
        <CardHeader className="relative">
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
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="flex gap-2 font-medium">
            All products tracked <PackageCheck className="size-4" />
          </div>
          <div className="text-muted-foreground">Inventory under control</div>
        </CardFooter>
      </Card>

      {/* Monthly Restocks */}
      <Card className="@container/card">
        <CardHeader className="relative">
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
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="flex gap-2 font-medium">
            Regular restocking <ShoppingCart className="size-4" />
          </div>
          <div className="text-muted-foreground">Supplies maintained well</div>
        </CardFooter>
      </Card>
    </div>
  );
}
