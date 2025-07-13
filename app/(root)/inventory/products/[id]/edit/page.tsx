import ProductForm from '@/components/ProductForm';
import { getCategories } from '@/lib/actions/categories';
import { getProductById } from '@/lib/actions/products';
import { getSuppliers } from '@/lib/actions/suppliers';

// params values are always strings because they come from URL parameters.
const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const pharmacyId = 1;

  const { id } = await params; //
  const product = await getProductById(Number(id), pharmacyId);
  const categories = await getCategories(pharmacyId);
  const suppliers = await getSuppliers(pharmacyId);

  if (!product) {
    return <div>Product not found</div>;
  }

  return (
    <ProductForm
      type="update"
      {...product}
      categories={categories}
      suppliers={suppliers}
    />
  );
};

export default Page;
