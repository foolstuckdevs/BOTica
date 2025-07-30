import React from 'react';
import { getPurchaseOrders } from '@/lib/actions/purchase-order';
import PurchaseOrdersOverview from '@/components/PurchaseOrdersOverview';

const Page = async () => {
  const pharmacyId = 1; // hardcoded for now, get from session later
  const purchaseOrders = await getPurchaseOrders(pharmacyId);

  return (
    <div className="px-6 py-6">
      <PurchaseOrdersOverview orders={purchaseOrders} />
    </div>
  );
};

export default Page;
