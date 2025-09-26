import TransactionsPageClient from './TransactionsPageClient';
import { auth } from '@/auth';
import { getPharmacy } from '@/lib/actions/pharmacy';

export default async function TransactionsPage() {
  const session = await auth();

  // Middleware ensures session exists for protected routes
  if (!session?.user) {
    throw new Error('Unauthorized: session missing. Check auth middleware.');
  }

  if (!session.user.pharmacyId) {
    throw new Error('Unauthorized: user not assigned to any pharmacy.');
  }

  const pharmacyId = session.user.pharmacyId;
  const pharmacy = await getPharmacy(pharmacyId);

  return (
    <TransactionsPageClient
      pharmacy={
        pharmacy ?? {
          id: pharmacyId,
          name: 'BOTica Pharmacy',
          address: '',
          phone: '',
        }
      }
    />
  );
}
