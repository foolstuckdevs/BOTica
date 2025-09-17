import PurchaseOrderForm from '@/components/PurchaseOrderForm';
import React from 'react';
import { getSuppliers } from '@/lib/actions/suppliers';
import { getOrderableProducts } from '@/lib/actions/purchase-order';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function Page() {
  const session = await auth();

  if (!session?.user) {
    redirect('/sign-in');
  }

  if (!session.user.pharmacyId) {
    throw new Error('Unauthorized: user not assigned to any pharmacy.');
  }

  const pharmacyId = session.user.pharmacyId;
  const suppliers = await getSuppliers(pharmacyId);
  const products = await getOrderableProducts(pharmacyId);
  return (
    <div>
      <PurchaseOrderForm
        suppliers={suppliers}
        products={products}
        userId={session.user.id}
        pharmacyId={pharmacyId}
      />
    </div>
  );
}
