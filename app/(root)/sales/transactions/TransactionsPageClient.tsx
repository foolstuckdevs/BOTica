'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Transaction, Pharmacy } from '@/types';
import { DataTable } from '@/components/DataTable';
import { columns as baseColumns } from './columns';
import { TransactionDetailsModal } from '@/components/TransactionsDetailModal';

type TransactionsPageClientProps = {
  pharmacy: Pharmacy;
};

interface TransactionsPageResult {
  data: Transaction[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function TransactionsPageClient({
  pharmacy,
}: TransactionsPageClientProps) {
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [pageIndex, setPageIndex] = useState(0); // zero-based
  const [pageSize, setPageSize] = useState(50);
  const [serverPage, setServerPage] = useState<TransactionsPageResult | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // (Future) Could wire a dedicated search bar; currently table global filter isn't server-driven.

  const load = useCallback(async (pi: number, ps: number, term: string) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(pi + 1),
        pageSize: String(ps),
      });
      if (term) params.set('search', term);
      const res = await fetch(`/api/transactions?${params.toString()}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const json = await res.json();
      setServerPage(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  // Immediate initial load (once) then debounce subsequent pagination changes
  const didInitialLoadRef = useRef(false);
  useEffect(() => {
    if (!didInitialLoadRef.current) {
      didInitialLoadRef.current = true;
      load(pageIndex, pageSize, '');
      return;
    }
    const handle = setTimeout(() => {
      load(pageIndex, pageSize, '');
    }, 250);
    return () => clearTimeout(handle);
  }, [pageIndex, pageSize, load]);

  const transactionList: Transaction[] = useMemo(
    () => serverPage?.data ?? [],
    [serverPage],
  );

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
      <div className="bg-white rounded-lg shadow border p-2">
        {error && <div className="p-2 text-sm text-red-600">{error}</div>}
        <DataTable
          columns={columns}
          data={transactionList}
          isLoading={loading && !serverPage}
          searchConfig={{
            enabled: true,
            placeholder: 'Search by invoice or cashier...',
            globalFilter: true,
          }}
          manualPagination={
            serverPage
              ? {
                  pageIndex,
                  pageSize,
                  pageCount: serverPage.pageCount,
                  onPageChange: (pi) => setPageIndex(pi),
                  onPageSizeChange: (ps) => {
                    setPageSize(ps);
                    setPageIndex(0);
                  },
                  isLoading: loading,
                }
              : undefined
          }
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
