import React from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { columns } from '../columns';
import Link from 'next/link';
import { getPurchaseOrders } from '@/lib/actions/purchase-order';
import { ChevronLeft } from 'lucide-react';

const AllOrdersPage = async () => {
  const pharmacyId = 1; // hardcoded for now, get from session later
  const purchaseOrders = await getPurchaseOrders(pharmacyId);

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" asChild>
            <Link
              href="/inventory/purchase-order"
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Overview</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              All Purchase Orders
            </h1>
            <p className="text-gray-600">
              Complete list of all purchase orders
            </p>
          </div>
        </div>
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

export default AllOrdersPage;
