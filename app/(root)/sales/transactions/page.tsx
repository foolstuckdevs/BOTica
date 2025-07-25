import { getTransactions } from '@/lib/actions/transactions';
import { getPharmacy } from '@/lib/actions/sales';
import TransactionsPageClient from './TransactionsPageClient';

export default async function TransactionsPage() {
  // Replace with session logic as needed
  const pharmacyId = 1;
  const transactions = await getTransactions(pharmacyId);
  const pharmacyInfo = await getPharmacy(pharmacyId);

  return (
    <TransactionsPageClient
      transactions={transactions}
      pharmacyInfo={pharmacyInfo ?? undefined}
    />
  );
}
