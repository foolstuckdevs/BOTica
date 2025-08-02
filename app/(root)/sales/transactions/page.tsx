import { getTransactions } from '@/lib/actions/transactions';
import { getPharmacy } from '@/lib/actions/sales';
import TransactionsPageClient from './TransactionsPageClient';
import { auth } from '@/auth';

export default async function TransactionsPage() {
  const session = await auth();

  // Middleware ensures session exists for protected routes
  if (!session?.user) {
    throw new Error('Unauthorized: session missing. Check auth middleware.');
  }

  const pharmacyId = session.user.pharmacyId || 1;
  const transactions = await getTransactions(pharmacyId);
  const pharmacyInfo = await getPharmacy(pharmacyId);

  return (
    <TransactionsPageClient
      transactions={transactions}
      pharmacyInfo={pharmacyInfo ?? undefined}
    />
  );
}
