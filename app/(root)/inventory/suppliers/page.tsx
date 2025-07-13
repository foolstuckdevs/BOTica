import { DataTable } from '@/components/DataTable';
import { getSuppliers } from '@/lib/actions/suppliers';
import { columns } from './columns';
import SupplierForm from '@/components/SupplierForm';

const Page = async () => {
  const pharmacyId = 1;

  const suppliers = await getSuppliers(pharmacyId);
  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-end">
        <SupplierForm />
      </div>
      <div className="bg-white rounded-lg shadow border">
        <DataTable columns={columns} data={suppliers} />
      </div>
    </div>
  );
};

export default Page;
