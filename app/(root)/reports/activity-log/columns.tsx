'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/DataTableColumnHeader';
// import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { formatDateTimePH } from '@/lib/date-format';

export type ActivityRow = {
  id: number;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: string | Date;
  username: string | null;
};

export const columns: ColumnDef<ActivityRow>[] = [
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ getValue }) => {
      const v = getValue<string | Date>();
      const d =
        typeof v === 'string' || v instanceof Date ? new Date(v) : new Date();
      return (
        <div className="leading-tight">
          <div className="font-medium">{formatDateTimePH(d)}</div>
          <div className="text-xs text-muted-foreground">
            {formatDistanceToNow(d, { addSuffix: true })}
          </div>
        </div>
      );
    },
    sortingFn: 'datetime',
  },
  {
    accessorKey: 'username',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="User" />
    ),
    cell: ({ getValue }) => (
      <span className="text-sm font-medium">
        {getValue<string>() ?? 'Someone'}
      </span>
    ),
  },
  {
    accessorKey: 'action',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Action" />
    ),
    cell: ({ row }) => {
      const action = row.original.action;
      const subject = humanizeSubject(action);
      const verb = humanizeVerb(action);
      return (
        <span className="text-sm">
          <span className="capitalize font-medium">{subject}</span>{' '}
          <span className="text-muted-foreground">{verb}</span>
        </span>
      );
    },
  },
  {
    accessorKey: 'details',
    id: 'details',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Target / Details" />
    ),
    cell: ({ row }) => renderDetails(row.original.action, row.original.details),
    enableSorting: false,
  },
];

function humanizeSubject(action?: string) {
  if (!action) return 'activity';
  if (action.startsWith('PRODUCT_')) return 'product';
  if (action.startsWith('CATEGORY_')) return 'category';
  if (action.startsWith('SUPPLIER_')) return 'supplier';
  if (action.startsWith('ADJUSTMENT_')) return 'adjustment';
  if (action.startsWith('SALE_')) return 'sale';
  if (action.startsWith('AUTH_')) return 'user';
  if (action.startsWith('STOCKIN_')) return 'stock in';
  if (action.startsWith('STAFF_')) return 'staff';
  if (action.startsWith('PROFILE_')) return 'profile';
  if (action.startsWith('PASSWORD_')) return 'password';
  return 'activity';
}

function humanizeVerb(action?: string) {
  if (!action) return 'done';
  if (/CREATED$/.test(action)) return 'created';
  if (/UPDATED$/.test(action)) return 'updated';
  if (/(DELETED|ARCHIVED)$/.test(action)) return 'deleted';
  if (/RESTORED$/.test(action)) return 'restored';
  if (/AUTH_SIGNIN$/.test(action)) return 'signed in';
  if (/AUTH_SIGNOUT$/.test(action)) return 'signed out';
  if (/AUTH_AUTO_SIGNOUT$/.test(action)) return 'auto signed out';
  if (/SALE_COMPLETED$/.test(action)) return 'completed';
  if (/SALE_VOIDED$/.test(action)) return 'voided';
  if (/^STOCKIN_/.test(action)) return 'received'; // All stock-in actions show as "received"
  if (/STATUS_UPDATED$/.test(action)) return 'updated';
  if (/PASSWORD_CHANGED$/.test(action)) return 'changed';
  return 'done';
}

// Removed badge styling for a more minimal look.

function renderDetails(
  action: string,
  details: Record<string, unknown> | null,
) {
  if (!details) return <span className="text-muted-foreground">—</span>;
  const name =
    typeof details['name'] === 'string' ? (details['name'] as string) : null;
  const id =
    typeof details['id'] === 'number' ? (details['id'] as number) : null;
  const productId =
    typeof details['productId'] === 'number'
      ? (details['productId'] as number)
      : null;
  const orderNumber =
    typeof details['orderNumber'] === 'string'
      ? (details['orderNumber'] as string)
      : null;
  const invoiceNumber =
    typeof details['invoiceNumber'] === 'string'
      ? (details['invoiceNumber'] as string)
      : null;
  const supplierName =
    typeof details['supplierName'] === 'string'
      ? (details['supplierName'] as string)
      : null;
  const status =
    typeof details['status'] === 'string'
      ? (details['status'] as string)
      : null;
  const reason =
    typeof details['reason'] === 'string'
      ? (details['reason'] as string)
      : null;
  const quantityChange =
    typeof details['quantityChange'] === 'number'
      ? (details['quantityChange'] as number)
      : null;
  const totalAmountRaw = details['totalAmount'] as string | number | undefined;
  const paymentMethod =
    typeof details['paymentMethod'] === 'string'
      ? (details['paymentMethod'] as string)
      : null;

  // Priority: Order/Invoice numbers for PO/Sales
  if (orderNumber)
    return (
      <span className="text-sm font-medium tracking-tight">{orderNumber}</span>
    );
  if (invoiceNumber)
    return (
      <span className="text-sm font-medium tracking-tight">
        {invoiceNumber}
      </span>
    );

  // Staff status specifics (show name + status inline)
  if (action?.startsWith('STAFF_') && name && status) {
    return (
      <span className="text-sm">
        <span className="font-medium">&quot;{name}&quot;</span>
        <span className="ml-2 text-muted-foreground">→ {status}</span>
      </span>
    );
  }

  // Names (entities)
  if (name) return <span className="text-sm font-medium">&quot;{name}&quot;</span>;
  if (supplierName)
    return <span className="text-sm font-medium">“{supplierName}”</span>;

  // Adjustment specifics
  if (action?.startsWith('ADJUSTMENT_')) {
    const productName =
      typeof details['productName'] === 'string'
        ? (details['productName'] as string)
        : null;
    const brandName =
      typeof details['brandName'] === 'string'
        ? (details['brandName'] as string)
        : null;
    const previousQuantity =
      typeof details['previousQuantity'] === 'number'
        ? (details['previousQuantity'] as number)
        : null;
    const newQuantity =
      typeof details['newQuantity'] === 'number'
        ? (details['newQuantity'] as number)
        : null;
    const displayName = productName
      ? brandName
        ? `${productName} (${brandName})`
        : productName
      : null;
    const isIncrease =
      typeof quantityChange === 'number' && quantityChange > 0;
    const isDecrease =
      typeof quantityChange === 'number' && quantityChange < 0;

    return (
      <div className="text-sm flex flex-wrap items-center gap-2">
        {displayName ? (
          <span className="font-medium">&quot;{displayName}&quot;</span>
        ) : productId ? (
          <span className="text-muted-foreground">
            product id: {productId}
          </span>
        ) : null}
        {reason ? (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-700 border border-slate-200">
            {reason.replace(/_/g, ' ').toLowerCase()}
          </span>
        ) : null}
        {typeof quantityChange === 'number' ? (
          <span
            className={
              isIncrease
                ? 'text-green-700'
                : isDecrease
                  ? 'text-red-700'
                  : 'text-muted-foreground'
            }
          >
            {isIncrease ? '+' : ''}
            {quantityChange}
          </span>
        ) : null}
        {previousQuantity !== null && newQuantity !== null ? (
          <span className="text-muted-foreground text-xs">
            ({previousQuantity} → {newQuantity})
          </span>
        ) : null}
      </div>
    );
  }

  // Sales specifics
  if (action?.startsWith('SALE_')) {
    const total =
      typeof totalAmountRaw === 'number'
        ? totalAmountRaw
        : typeof totalAmountRaw === 'string'
        ? parseFloat(totalAmountRaw)
        : undefined;
    const reasonLabel =
      typeof details['reasonLabel'] === 'string'
        ? (details['reasonLabel'] as string)
        : null;
    const itemsRestored =
      typeof details['itemsRestored'] === 'number'
        ? (details['itemsRestored'] as number)
        : null;
    return (
      <div className="text-sm">
        {invoiceNumber ? (
          <span className="font-medium tracking-tight mr-2">{invoiceNumber}</span>
        ) : null}
        {typeof total === 'number' ? (
          <span className="font-medium">₱{total.toFixed(2)}</span>
        ) : null}
        {/* Payment method hidden for now */}
        {false && paymentMethod && !reasonLabel ? (
          <span className="ml-2 text-muted-foreground">({paymentMethod})</span>
        ) : null}
        {reasonLabel ? (
          <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-red-700 border border-red-200">
            {reasonLabel}
          </span>
        ) : null}
        {itemsRestored !== null ? (
          <span className="ml-2 text-muted-foreground">
            {itemsRestored} item{itemsRestored !== 1 ? 's' : ''} restocked
          </span>
        ) : null}
      </div>
    );
  }

  // Stock-in specifics
  if (action?.startsWith('STOCKIN_')) {
    const items =
      typeof details['items'] === 'number'
        ? (details['items'] as number)
        : null;
    return (
      <div className="text-sm">
        {items !== null ? (
          <span className="text-muted-foreground">
            {items} item{items !== 1 ? 's' : ''}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </div>
    );
  }

  // Status if provided
  if (status)
    return <span className="text-sm font-medium">Status: {status}</span>;

  // Fallback to IDs
  if (productId)
    return (
      <span className="text-sm text-muted-foreground">
        product id: {productId}
      </span>
    );
  if (id)
    return <span className="text-sm text-muted-foreground">id: {id}</span>;
  return <span className="text-sm text-muted-foreground">—</span>;
}
