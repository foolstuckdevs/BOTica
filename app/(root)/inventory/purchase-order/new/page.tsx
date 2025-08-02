import PurchaseOrderForm from '@/components/PurchaseOrderForm';
import React from 'react';
import { getSuppliers } from '@/lib/actions/suppliers';
import { getProducts } from '@/lib/actions/products';
import { auth } from '@/auth';

export default async function Page() {
  const session = await auth();

  if (!session?.user) {
    throw new Error('Unauthorized: session missing. Check auth middleware.');
  }

  const pharmacyId = session.user.pharmacyId || 1;
  const suppliers = await getSuppliers(pharmacyId);
  const products = await getProducts(pharmacyId);
  return (
    <div>
      <PurchaseOrderForm
        suppliers={suppliers}
        products={products}
        userId={session.user.id}
      />
    </div>
  );
}
