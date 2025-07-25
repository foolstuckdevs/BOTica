'use client';

import { useState } from 'react';
import type { Pharmacy, Transaction } from '@/types';
import { Input } from '@/components/ui/input';
import { TransactionCard } from '@/components/TransactionCard';
import { TransactionDetailsModal } from '@/components/TransactionsDetailModal';
import { Search } from 'lucide-react';

type TransactionsPageClientProps = {
  transactions: Transaction[];
  pharmacyInfo: Pharmacy | undefined;
};

export default function TransactionsPageClient({
  transactions,
  pharmacyInfo,
}: TransactionsPageClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

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

  const transactionList: Transaction[] = Object.values(
    groupedTransactions,
  ).filter((t) => {
    const lowerSearch = searchTerm.toLowerCase();
    return (
      t.invoiceNumber.toLowerCase().includes(lowerSearch) ||
      t.user.fullName.toLowerCase().includes(lowerSearch) ||
      t.items.some((item) =>
        item.productName.toLowerCase().includes(lowerSearch),
      )
    );
  });

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-6 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Transaction History
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              View and manage all sales transactions
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b p-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              placeholder="Search transactions by invoice number, cashier, or items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {transactionList.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col items-center justify-center text-center h-64">
              <div className="bg-gray-100 p-4 rounded-full mb-3">
                <Search className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {searchTerm ? 'No transactions found' : 'No transactions yet'}
              </h3>
              <p className="text-sm text-gray-500 max-w-md">
                {searchTerm
                  ? "Try adjusting your search or filter to find what you're looking for"
                  : 'All completed sales will appear here'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {transactionList.map((transaction) => (
                <TransactionCard
                  key={transaction.id}
                  transaction={{
                    ...transaction,
                    createdAt:
                      typeof transaction.createdAt === 'string'
                        ? new Date(transaction.createdAt)
                        : transaction.createdAt,
                  }}
                  onClick={() => setSelectedTransaction(transaction)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && pharmacyInfo && (
        <TransactionDetailsModal
          transaction={{
            ...selectedTransaction,
            createdAt:
              typeof selectedTransaction.createdAt === 'string'
                ? new Date(selectedTransaction.createdAt)
                : selectedTransaction.createdAt,
          }}
          onClose={() => setSelectedTransaction(null)}
          pharmacyInfo={{
            name: pharmacyInfo.name ?? '',
            address: pharmacyInfo.address ?? '',
          }}
        />
      )}
    </div>
  );
}
