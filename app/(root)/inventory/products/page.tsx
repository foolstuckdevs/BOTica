import { DataTable } from '@/components/DataTable';
import { getProducts } from '@/lib/actions/products';
import Link from 'next/link';
import { columns } from './columns';
import { Button } from '@/components/ui/button';

const Page = async () => {
  const pharmacyId = 1; // hardcoded for now get from session later

  const products = await getProducts(pharmacyId);

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-end">
        <Button>
          <Link href="/inventory/products/new">+ Add Product</Link>
        </Button>
      </div>
      <div className="bg-white rounded-lg shadow border">
        <DataTable columns={columns} data={products} />
      </div>
    </div>
  );
};

export default Page;
