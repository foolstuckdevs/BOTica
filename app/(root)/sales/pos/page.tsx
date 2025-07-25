import { getProducts } from '@/lib/actions/products';
import { getPharmacy } from '@/lib/actions/sales';
import type { Product } from '@/types';
import POSPage from './POSPageClient';

const page = async () => {
  // TODO: Replace with session logic
  const pharmacyId = 1;
  const products: Product[] = await getProducts(pharmacyId);
  const pharmacyInfo = await getPharmacy(pharmacyId);

  return (
    <POSPage
      products={products}
      pharmacyInfo={pharmacyInfo}
      pharmacyId={pharmacyId}
    />
  );
};

export default page;
