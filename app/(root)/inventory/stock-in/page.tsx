import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getStockIns } from '@/lib/actions/stock-in';
import { DataTable } from '@/components/DataTable';
import { columns } from './columns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

const StockInPage = async () => {
  const session = await auth();

  if (!session?.user) {
    redirect('/sign-in');
  }

  if (!session.user.pharmacyId) {
    throw new Error('User has no pharmacy access.');
  }

  const stockIns = await getStockIns(session.user.pharmacyId);

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex justify-end">
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/inventory/stock-in/new">
            <Plus className="h-4 w-4" />
            New Stock-In
          </Link>
        </Button>
      </div>
      <div className="bg-white rounded-lg shadow border">
        <DataTable
          columns={columns}
          data={stockIns}
          searchConfig={{
            enabled: true,
            placeholder: 'Search supplier…',
            globalFilter: true,
            searchableColumns: ['supplierName'],
          }}
        />
      </div>
    </div>
  );
};

export default StockInPage;
