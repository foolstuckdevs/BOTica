import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardAction,
} from '@/components/ui/card';
import { getRecentActivity } from '@/lib/actions/activity';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type Props = {
  pharmacyId: number;
  limit?: number;
};

export default async function RecentActivity({ pharmacyId, limit = 8 }: Props) {
  const items = await getRecentActivity(pharmacyId, limit, [
    'PRODUCT_',
    'CATEGORY_',
    'AUTH_',
    'SUPPLIER_',
    'ADJUSTMENT_',
    'PO_',
    'SALE_',
  ]);

  return (
    <Card className="gap-1 py-4">
      <CardHeader className="pt-2 pb-1">
        <CardTitle className="text-lg leading-tight">Recent Activity</CardTitle>
        <CardAction>
          <Link
            href="/reports/activity-log"
            className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
          >
            View logs
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-1">
        {items.length === 0 ? (
          <div className="py-5 text-center text-muted-foreground text-sm">
            No recent activity yet.
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            <ul className="divide-y divide-border">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="pl-3 md:pl-4 pr-0 py-3 flex items-start gap-3"
                >
                  <div
                    className={cn(
                      'mt-0.5 h-2.5 w-2.5 rounded-full',
                      it.action?.includes('CREATED')
                        ? 'bg-green-500'
                        : it.action?.includes('UPDATED')
                        ? 'bg-blue-500'
                        : it.action?.includes('DELETED') ||
                          it.action?.includes('ARCHIVED')
                        ? 'bg-red-500'
                        : it.action?.startsWith('AUTH_')
                        ? 'bg-amber-500'
                        : 'bg-gray-400',
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      <span className="font-medium">
                        {it.userFullName ?? 'Someone'}
                      </span>{' '}
                      <span className="text-muted-foreground">
                        {getDisplayAction(it.action, it.details)}
                      </span>
                      {renderDetails(it.details)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(
                        new Date(it.createdAt as unknown as string),
                        { addSuffix: true },
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function humanizeAction(action?: string) {
  if (!action) return 'did something';
  const base = action
    .replace(/^PRODUCT_/, 'product ')
    .replace(/^CATEGORY_/, 'category ')
    .replace(/^SUPPLIER_/, 'supplier ')
    .replace(/^ADJUSTMENT_/, 'adjustment ')
    .replace(/^PO_/, 'purchase order ')
    .replace(/^SALE_/, 'sale ');
  if (base === 'AUTH_SIGNIN') return 'signed in';
  if (base === 'AUTH_SIGNOUT') return 'signed out';
  return base.replace(/_/g, ' ').toLowerCase();
}

function getDisplayAction(
  action?: string,
  details?: Record<string, unknown> | null,
): React.ReactNode {
  if (!action) return 'did something';
  if (action === 'PO_STATUS_CHANGED') {
    const status =
      details && typeof details['status'] === 'string'
        ? (details['status'] as string)
        : null;
    return (
      <>
        purchase order status changed
        {status ? (
          <>
            {' '}
            to{' '}
            <span className="font-semibold text-foreground">
              {status.toLowerCase()}
            </span>
          </>
        ) : null}
      </>
    );
  }
  return humanizeAction(action);
}

function renderDetails(details: Record<string, unknown> | null) {
  if (!details) return null;
  const name =
    typeof details['name'] === 'string' ? (details['name'] as string) : null;
  const orderNumber =
    typeof details['orderNumber'] === 'string'
      ? (details['orderNumber'] as string)
      : null;
  const invoiceNumber =
    typeof details['invoiceNumber'] === 'string'
      ? (details['invoiceNumber'] as string)
      : null;
  if (name) {
    return <span className="ml-1 font-medium">“{name}”</span>;
  }
  if (orderNumber) {
    return <span className="ml-1 font-medium">{orderNumber}</span>;
  }
  if (invoiceNumber) {
    return <span className="ml-1 font-medium">{invoiceNumber}</span>;
  }
  return null;
}
