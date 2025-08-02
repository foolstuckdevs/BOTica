import { getAllProductsPOS, getPharmacy } from '@/lib/actions/sales';
import POSPage from './POSPageClient';
import { ProductPOS } from '@/types';
import { auth } from '@/auth';

const page = async () => {
  // Get authenticated session (middleware ensures user is already authenticated)
  const session = await auth();

  if (!session?.user) {
    throw new Error('Unauthorized: session missing. Check auth middleware.');
  }

  // Get pharmacy ID from authenticated user session
  const pharmacyId = session.user.pharmacyId || 1;
  const products: ProductPOS[] = await getAllProductsPOS(pharmacyId);
  const pharmacyInfo = await getPharmacy(pharmacyId);

  return (
    <POSPage
      products={products}
      pharmacyInfo={pharmacyInfo}
      pharmacyId={pharmacyId}
      userId={session.user.id}
      userName={session.user.name || 'Unknown User'}
    />
  );
};

export default page;
