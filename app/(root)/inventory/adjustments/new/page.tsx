import AdjustmentForm from '@/components/AdjustmentForm';
import { getProducts } from '@/lib/actions/products';
import { auth } from '@/auth';

export default async function AdjustmentPage() {
  const session = await auth();

  if (!session?.user) {
    throw new Error('Unauthorized: session missing. Check auth middleware.');
  }

  if (!session.user.pharmacyId) {
    throw new Error('Unauthorized: user not assigned to any pharmacy.');
  }

  const pharmacyId = session.user.pharmacyId;
  const products = await getProducts(pharmacyId);

  return (
    <AdjustmentForm
      products={products}
      userId={session.user.id}
      pharmacyId={pharmacyId}
    />
  );
}
