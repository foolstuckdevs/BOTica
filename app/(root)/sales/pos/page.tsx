import { getPharmacy } from '@/lib/actions/sales';
import POSPage from './POSPageClient';
import { auth } from '@/auth';

const page = async () => {
  // Get authenticated session (middleware ensures user is already authenticated)
  const session = await auth();

  if (!session?.user) {
    throw new Error('Unauthorized: session missing. Check auth middleware.');
  }

  if (!session.user.pharmacyId) {
    throw new Error('Unauthorized: user not assigned to any pharmacy.');
  }

  // Get pharmacy ID from authenticated user session
  const pharmacyId = session.user.pharmacyId;
  // Legacy full preload removed: products now fetched on-demand via /api/pos/lookup
  const pharmacyInfo = await getPharmacy(pharmacyId);

  // Use a unique key to force remount on navigation
  const mountKey = `pos-${Date.now()}`;

  return (
    <POSPage
      key={mountKey}
      products={[]}
      pharmacyInfo={pharmacyInfo}
      pharmacyId={pharmacyId}
      userId={session.user.id}
      userName={session.user.name || 'Unknown User'}
    />
  );
};

export default page;
