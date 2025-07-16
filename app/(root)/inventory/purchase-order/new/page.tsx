import PurchaseOrderForm from '@/components/PurchaseOrderForm';
import React from 'react';
import { getSuppliers } from '@/lib/actions/suppliers';
import { getProducts } from '@/lib/actions/products';

export default async function Page() {
  const pharmacyId = 1; // TODO: dynamic
  const suppliers = await getSuppliers(pharmacyId);
  const products = await getProducts(pharmacyId);
  return (
    <div>
      <PurchaseOrderForm suppliers={suppliers} products={products} />
    </div>
  );
}
