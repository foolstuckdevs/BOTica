import React from 'react';
import { columns } from './columns';
import { DataTable } from '@/components/DataTable';
import { getCategories } from '@/lib/actions/categories';
// import { Search } from 'lucide-react';
import { CategoryForm } from '@/components/CategoryForm';

const Page = async () => {
  const result = await getCategories();
  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-end">
        {/* <div className="flex items-center w-full md:max-w-sm bg-white border border-gray-200 px-3 py-2 rounded-md shadow-sm focus-within:ring-2 ring-ring transition">
          <Search className="w-4 h-4 text-gray-500 mr-2" />
          <input
            type="search"
            placeholder="Search categories..."
            className="w-full bg-transparent outline-none text-sm placeholder:text-gray-400"
          />
        </div> */}
        <CategoryForm />
      </div>
      <div className="bg-white rounded-lg shadow border">
        <DataTable columns={columns} data={result} />
      </div>
    </div>
  );
};

export default Page;
