import React from 'react';
import { getPurchaseOrders } from '@/lib/actions/purchase-order';
import PurchaseOrdersOverview from '@/components/PurchaseOrdersOverview';
import { auth } from '@/auth';

const Page = async () => {
  const session = await auth();

  // Middleware ensures session exists for protected routes
  if (!session?.user) {
    throw new Error('Unauthorized: session missing. Check auth middleware.');
  }

  if (!session.user.pharmacyId) {
    throw new Error('Unauthorized: user not assigned to any pharmacy.');
  }

  const pharmacyId = session.user.pharmacyId;
  const purchaseOrders = await getPurchaseOrders(pharmacyId);

  return (
    <div className="px-6 py-6">
      <PurchaseOrdersOverview orders={purchaseOrders} />
    </div>
  );
};

export default Page;
