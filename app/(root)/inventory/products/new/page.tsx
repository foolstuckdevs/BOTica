import { Suspense } from 'react';
import ProductForm from '@/components/ProductForm';
import { getCategories } from '@/lib/actions/categories';
import { getSuppliers } from '@/lib/actions/suppliers';
import { auth } from '@/auth';

const Page = async () => {
  const session = await auth();

  // Middleware ensures session exists for protected routes
  if (!session?.user) {
    throw new Error('Unauthorized: session missing. Check auth middleware.');
  }

  const pharmacyId = session.user.pharmacyId || 1;

  const categories = await getCategories(pharmacyId);
  const suppliers = await getSuppliers(pharmacyId);

  return (
    <div className="p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <ProductForm
          type="create"
          categories={categories}
          suppliers={suppliers}
        />
      </Suspense>
    </div>
  );
};

export default Page;
