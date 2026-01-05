'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/DataTableColumnHeader';
// import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

export type ActivityRow = {
  id: number;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: string | Date;
  userFullName: string | null;
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
          <div className="font-medium">{format(d, 'PP p')}</div>
          <div className="text-xs text-muted-foreground">
            {formatDistanceToNow(d, { addSuffix: true })}
          </div>
        </div>
      );
    },
    sortingFn: 'datetime',
  },
  {
    accessorKey: 'userFullName',
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
    id: 'target',
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
  if (/SALE_COMPLETED$/.test(action)) return 'completed';
  if (/^STOCKIN_/.test(action)) return 'received'; // All stock-in actions show as "received"
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

  // Names (entities)
  if (name) return <span className="text-sm font-medium">“{name}”</span>;
  if (supplierName)
    return <span className="text-sm font-medium">“{supplierName}”</span>;

  // Adjustment specifics
  if (action?.startsWith('ADJUSTMENT_')) {
    return (
      <div className="text-sm leading-tight">
        {reason ? (
          <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-700 border border-slate-200">
            {reason.toLowerCase()}
          </span>
        ) : null}
        {typeof quantityChange === 'number' ? (
          <span className="text-muted-foreground">Δ {quantityChange}</span>
        ) : null}
        {productId ? (
          <span className="ml-2 text-muted-foreground">
            product id: {productId}
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
    return (
      <div className="text-sm">
        {typeof total === 'number' ? (
          <span className="font-medium">Total: ₱{total.toFixed(2)}</span>
        ) : null}
        {paymentMethod ? (
          <span className="ml-2 text-muted-foreground">({paymentMethod})</span>
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
    const totalRaw = details['total'] as string | number | undefined;
    const total =
      typeof totalRaw === 'number'
        ? totalRaw
        : typeof totalRaw === 'string'
        ? parseFloat(totalRaw)
        : undefined;
    return (
      <div className="text-sm">
        {items !== null ? (
          <span className="text-muted-foreground">
            {items} item{items !== 1 ? 's' : ''}
          </span>
        ) : null}
        {typeof total === 'number' ? (
          <span className="ml-2 font-medium">Total: ₱{total.toFixed(2)}</span>
        ) : null}
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
