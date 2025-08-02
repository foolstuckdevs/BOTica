import AdjustmentForm from '@/components/AdjustmentForm';
import { getProducts } from '@/lib/actions/products';
import { auth } from '@/auth';

export default async function AdjustmentPage() {
  const session = await auth();

  if (!session?.user) {
    throw new Error('Unauthorized: session missing. Check auth middleware.');
  }

  const pharmacyId = 1;
  const products = await getProducts(pharmacyId);

  return <AdjustmentForm products={products} userId={session.user.id} />;
}
