import AdjustmentForm from '@/components/AdjustmentForm';
import { getProducts } from '@/lib/actions/products';

export default async function AdjustmentPage() {
  const pharmacyId = 1;
  const products = await getProducts(pharmacyId);

  return <AdjustmentForm products={products} />;
}
