import React from 'react';
import { columns } from './columns';
import { DataTable } from '@/components/DataTable';
import { getCategories } from '@/lib/actions/categories';
import CategoryForm from '@/components/CategoryForm';

const Page = async () => {
  const pharmacyId = 1; // hardcoded for now get from session later

  const result = await getCategories(pharmacyId);
  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-end">
        <CategoryForm />
      </div>
      <div className="bg-white rounded-lg shadow border">
        <DataTable
          columns={columns}
          data={result}
          searchConfig={{
            enabled: true,
            placeholder: 'Search by category name...',
            globalFilter: true,
            searchableColumns: ['name'],
          }}
        />
      </div>
    </div>
  );
};

export default Page;
