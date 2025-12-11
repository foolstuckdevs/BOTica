import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getSuppliers } from '@/lib/actions/suppliers';
import { getAdjustableProducts } from '@/lib/actions/adjustment';
import { getCategories } from '@/lib/actions/categories';
import StockInForm from '@/components/StockInForm';

const NewStockInPage = async () => {
  const session = await auth();

  if (!session?.user) {
    redirect('/sign-in');
  }

  if (!session.user.pharmacyId || !session.user.id) {
    throw new Error('User lacks the required pharmacy context.');
  }

  const pharmacyId = session.user.pharmacyId;
  const [suppliers, products, categories] = await Promise.all([
    getSuppliers(pharmacyId),
    getAdjustableProducts(pharmacyId),
    getCategories(pharmacyId),
  ]);

  return (
    <StockInForm
      pharmacyId={pharmacyId}
      userId={session.user.id}
      suppliers={suppliers}
      products={products}
      categories={categories}
    />
  );
};

export default NewStockInPage;
