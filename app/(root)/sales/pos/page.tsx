import { getAllProductsPOS, getPharmacy } from '@/lib/actions/sales';
import POSPage from './POSPageClient';
import { ProductPOS } from '@/types';

const page = async () => {
  // TODO: Replace with session logic
  const pharmacyId = 1;
  const products: ProductPOS[] = await getAllProductsPOS(pharmacyId);
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
