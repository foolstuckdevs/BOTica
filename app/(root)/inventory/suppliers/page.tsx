import { DataTable } from '@/components/DataTable';
import { getSuppliers } from '@/lib/actions/suppliers';
import { columns } from './columns';
import SupplierForm from '@/components/SupplierForm';
import { auth } from '@/auth';

const Page = async () => {
  const session = await auth();

  // Middleware ensures session exists for protected routes
  if (!session?.user) {
    throw new Error('Unauthorized: session missing. Check auth middleware.');
  }

  if (!session.user.pharmacyId) {
    throw new Error('Unauthorized: user not assigned to any pharmacy.');
  }

  const pharmacyId = session.user.pharmacyId;

  const suppliers = await getSuppliers(pharmacyId);
  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-end">
        <SupplierForm />
      </div>
      <div className="bg-white rounded-lg shadow border">
        <DataTable
          columns={columns}
          data={suppliers}
          searchConfig={{
            enabled: true,
            placeholder: 'Search by supplier name, contact person...',
            globalFilter: true,
            searchableColumns: ['name', 'contactPerson'],
          }}
        />
      </div>
    </div>
  );
};

export default Page;
