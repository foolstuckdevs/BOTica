import { getTransactions } from '@/lib/actions/transactions';
import TransactionsPageClient from './TransactionsPageClient';
import { auth } from '@/auth';

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
  const transactions = await getTransactions(pharmacyId);

  return <TransactionsPageClient transactions={transactions} />;
}
