import React from 'react';

import { DataTable } from '@/components/DataTable';
import { columns } from './columns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getAdjustments } from '@/lib/actions/adjustment';

const Page = async () => {
  const pharmacyId = 1;
  const result = await getAdjustments(pharmacyId);

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex justify-end">
        <Button>
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
