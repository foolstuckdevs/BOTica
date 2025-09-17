import React from 'react';

import { DataTable } from '@/components/DataTable';
import { columns } from './columns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getAdjustments } from '@/lib/actions/adjustment';
import { auth } from '@/auth';
import { Plus } from 'lucide-react';
import { redirect } from 'next/navigation';

const Page = async () => {
  const session = await auth();

  // Middleware ensures session exists for protected routes
  if (!session?.user) {
    redirect('/sign-in');
  }

  if (!session.user.pharmacyId) {
    throw new Error('Unauthorized: user not assigned to any pharmacy.');
  }

  const pharmacyId = session.user.pharmacyId;
  const result = await getAdjustments(pharmacyId);

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex justify-end">
        <Button variant="default" size="sm" className="gap-1.5">
          <span>
            <Plus className="h-4 w-4" />
          </span>
          <Link href="/inventory/adjustments/new">Create Adjustment</Link>
        </Button>
      </div>
      <div className="bg-white rounded-lg shadow border">
        <DataTable
          columns={columns}
          data={result}
          searchConfig={{
            enabled: true,
            placeholder: 'Search by name, brand, batch...',
            globalFilter: true,
            searchableColumns: ['name', 'brandName', 'batchNumber'],
          }}
        />
      </div>
    </div>
  );
};

export default Page;
