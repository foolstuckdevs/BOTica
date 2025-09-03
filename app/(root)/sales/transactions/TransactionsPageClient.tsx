'use client';

import { useState, useMemo } from 'react';
import type { Transaction, Pharmacy } from '@/types';
import { DataTable } from '@/components/DataTable';
import { columns as baseColumns } from './columns';
import { TransactionDetailsModal } from '@/components/TransactionsDetailModal';

type TransactionsPageClientProps = {
  transactions: Transaction[];
  pharmacy: Pharmacy;
};

export default function TransactionsPageClient({
  transactions,
  pharmacy,
}: TransactionsPageClientProps) {
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Group transactions by ID to merge items if needed (assuming flattened input)
  const groupedTransactions = transactions.reduce<Record<number, Transaction>>(
    (acc, transaction) => {
      if (!acc[transaction.id]) {
        acc[transaction.id] = { ...transaction, items: [] };
      }
      acc[transaction.id].items.push(...transaction.items);
      return acc;
    },
    {},
  );

  const transactionList: Transaction[] = useMemo(() => {
    return Object.values(groupedTransactions).sort((a, b) => {
      const dateA =
        typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt;
      const dateB =
        typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt;
      return dateB.getTime() - dateA.getTime();
    });
  }, [groupedTransactions]);

  const columns = useMemo(
    () =>
      baseColumns({
        onView: (tx: Transaction) => {
          setSelectedTransaction({
            ...tx,
            createdAt:
              typeof tx.createdAt === 'string'
                ? new Date(tx.createdAt)
                : tx.createdAt,
          });
          setShowDetails(true);
        },
      }),
    [],
  );

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Transaction History
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            View all sales transactions
          </p>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow border">
        <DataTable
          columns={columns}
          data={transactionList}
          searchConfig={{
            enabled: true,
            placeholder: 'Search by invoice or cashier...',
            globalFilter: true,
            searchableColumns: ['invoiceNumber', 'user.fullName'],
          }}
        />
      </div>

      {/* Transaction Details Modal */}
      {showDetails && selectedTransaction && (
        <TransactionDetailsModal
          transaction={{
            ...selectedTransaction,
            createdAt:
              typeof selectedTransaction.createdAt === 'string'
                ? new Date(selectedTransaction.createdAt)
                : selectedTransaction.createdAt,
          }}
          pharmacy={pharmacy}
          onClose={() => {
            setShowDetails(false);
            setSelectedTransaction(null);
          }}
        />
      )}
    </div>
  );
}
