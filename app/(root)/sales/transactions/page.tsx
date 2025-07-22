'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Input } from '@/components/ui/input';
import { TransactionCard } from '@/components/TransactionCard';
import { TransactionDetailsModal } from '@/components/TransactionsDetailModal';
import { getTransactions } from '@/lib/actions/transactions';
import { Search } from 'lucide-react';
import { db } from '@/database/drizzle';
import { eq } from 'drizzle-orm';
import { pharmacies } from '@/database/schema';

type PaymentMethod = 'CASH' | 'GCASH';

export default function TransactionsPage() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [pharmacyInfo, setPharmacyInfo] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      if (session?.user?.pharmacyId) {
        setIsLoading(true);
        try {
          // Load transactions
          const data = await getTransactions(
            session.user.pharmacyId,
            searchTerm || undefined
          );
          setTransactions(data);

          // Load pharmacy info
          const pharmacy = await db
            .select()
            .from(pharmacies)
            .where(eq(pharmacies.id, session.user.pharmacyId));
          setPharmacyInfo(pharmacy[0]);
        } catch (error) {
          console.error('Failed to load data:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    const debounceTimer = setTimeout(() => {
      loadData();
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
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-6 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
            <p className="text-sm text-gray-500 mt-1">View and manage all sales transactions</p>
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
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 h-32 animate-pulse"></div>
              ))}
            </div>
          ) : transactionList.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col items-center justify-center text-center h-64">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {transactionList.map((transaction: any) => (
                <TransactionCard
                  key={transaction.id}
                  transaction={{
                    ...transaction,
                    paymentMethod: transaction.paymentMethod as PaymentMethod
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
            paymentMethod: selectedTransaction.paymentMethod as PaymentMethod
          }}
          onClose={() => setSelectedTransaction(null)}
          pharmacyInfo={pharmacyInfo}
        />
      )}
    </div>
  );
}