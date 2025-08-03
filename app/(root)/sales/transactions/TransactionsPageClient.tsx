'use client';

import { useState } from 'react';
import type { Transaction } from '@/types';
import { Input } from '@/components/ui/input';
import { TransactionCard } from '@/components/TransactionCard';
import { TransactionDetailsModal } from '@/components/TransactionsDetailModal';
import { Search } from 'lucide-react';

type TransactionsPageClientProps = {
  transactions: Transaction[];
};

export default function TransactionsPageClient({
  transactions,
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

  const transactionList: Transaction[] = Object.values(groupedTransactions)
    .filter((t) => {
      const lowerSearch = searchTerm.toLowerCase();
      return (
        t.invoiceNumber.toLowerCase().includes(lowerSearch) ||
        t.user.fullName.toLowerCase().includes(lowerSearch)
      );
    })
    .sort((a, b) => {
      // Sort by createdAt in descending order (latest first)
      const dateA =
        typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt;
      const dateB =
        typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt;
      return dateB.getTime() - dateA.getTime();
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
              View all sales transactions
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
              placeholder="Search by invoice number or cashier name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 h-11 text-base"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <span className="text-lg">×</span>
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="text-sm text-gray-500 mt-2">
              {transactionList.length} result
              {transactionList.length !== 1 ? 's' : ''} found for &ldquo;
              {searchTerm}&rdquo;
            </p>
          )}
        </div>
      </div>

      {/* Transaction List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {transactionList.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center text-center">
              <div className="bg-gray-100 p-4 rounded-full mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchTerm ? 'No transactions found' : 'No transactions yet'}
              </h3>
              <p className="text-gray-500 max-w-md">
                {searchTerm
                  ? "Try adjusting your search to find what you're looking for"
                  : 'All completed sales will appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
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

              {/* Summary */}
              {transactionList.length > 5 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="text-center text-sm text-gray-500">
                    Showing {transactionList.length} transaction
                    {transactionList.length !== 1 ? 's' : ''}
                    {searchTerm && ` matching "${searchTerm}"`}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <TransactionDetailsModal
          transaction={{
            ...selectedTransaction,
            createdAt:
              typeof selectedTransaction.createdAt === 'string'
                ? new Date(selectedTransaction.createdAt)
                : selectedTransaction.createdAt,
          }}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
}
