// app/(root)/sales/transactions/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Input } from '@/components/ui/input';
import { TransactionCard } from '@/components/TransactionCard';
import { TransactionDetailsModal } from '@/components/TransactionsDetailModal';
import { getTransactions } from '@/lib/actions/transactions';
import { Search } from 'lucide-react';

type PaymentMethod = 'CASH' | 'GCASH';

export default function TransactionsPage() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  useEffect(() => {
    const loadTransactions = async () => {
      if (session?.user?.pharmacyId) {
        setIsLoading(true);
        try {
          const data = await getTransactions(
            session.user.pharmacyId,
            searchTerm || undefined
          );
          setTransactions(data);
        } catch (error) {
          console.error('Failed to load transactions:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    const debounceTimer = setTimeout(() => {
      loadTransactions();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [session, searchTerm]);

  // Group transactions by sale ID
  const groupedTransactions = transactions.reduce((acc, transaction) => {
    if (!acc[transaction.id]) {
      acc[transaction.id] = {
        ...transaction,
        items: [],
      };
    }
    if (transaction.items.id) {
      acc[transaction.id].items.push(transaction.items);
    }
    return acc;
  }, {});

  const transactionList = Object.values(groupedTransactions);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
            <p className="text-sm text-gray-500 mt-1">View and manage all sales transactions</p>
          </div>
        </div>
      </div>

      {/* Content - Non-scrollable */}
      <div className="flex-1 bg-gray-50 p-6 overflow-hidden">
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 h-full flex flex-col">
          {/* Search Bar */}
          <div className="border-b p-4">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Transaction List - Non-scrollable */}
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <div className="col-span-full flex justify-center items-center h-64">
                <div className="animate-pulse text-gray-500">Loading transactions...</div>
              </div>
            ) : transactionList.length === 0 ? (
              <div className="col-span-full flex flex-col justify-center items-center text-center p-8">
                <div className="bg-gray-100 p-4 rounded-full mb-3">
                  <Search className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  {searchTerm ? 'No transactions found' : 'No transactions yet'}
                </h3>
                <p className="text-sm text-gray-500 max-w-md">
                  {searchTerm 
                    ? 'Try adjusting your search or filter to find what you\'re looking for'
                    : 'All completed sales will appear here'}
                </p>
              </div>
            ) : (
              transactionList.map((transaction: any) => (
                <TransactionCard
                  key={transaction.id}
                  transaction={{
                    ...transaction,
                    paymentMethod: transaction.paymentMethod as PaymentMethod
                  }}
                  onClick={() => setSelectedTransaction(transaction)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal - Scrollable content inside */}
      {selectedTransaction && (
        <TransactionDetailsModal
          transaction={{
            ...selectedTransaction,
            paymentMethod: selectedTransaction.paymentMethod as PaymentMethod
          }}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
}