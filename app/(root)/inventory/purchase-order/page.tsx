import React from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { columns } from './columns';
import Link from 'next/link';
import { getPurchaseOrders } from '@/lib/actions/purchase-order';

const Page = async () => {
  const pharmacyId = 1; // hardcoded for now, get from session later
  const purchaseOrders = await getPurchaseOrders(pharmacyId);

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-end">
        <Button>
          <Link href="/inventory/purchase-order/new">
            Create Purchase Order
          </Link>
        </Button>
      </div>
      <div className="bg-white rounded-lg shadow border">
        <DataTable columns={columns} data={purchaseOrders} />
      </div>
    </div>
  );
};

export default Page;
