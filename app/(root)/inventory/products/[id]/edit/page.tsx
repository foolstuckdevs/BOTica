import ProductForm from '@/components/ProductForm';
import { getCategories } from '@/lib/actions/categories';
import { getProductById } from '@/lib/actions/products';
import { getSuppliers } from '@/lib/actions/suppliers';
import { auth } from '@/auth';

// params values are always strings because they come from URL parameters.
const Page = async ({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnUrl?: string }>;
}) => {
  const session = await auth();

  // Middleware ensures session exists for protected routes
  if (!session?.user) {
    throw new Error('Unauthorized: session missing. Check auth middleware.');
  }

  if (!session.user.pharmacyId) {
    throw new Error('Unauthorized: user not assigned to any pharmacy.');
  }

  const pharmacyId = session.user.pharmacyId;

  const { id } = await params;
  const { returnUrl } = await searchParams;
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
      pharmacyId={pharmacyId}
      returnUrl={returnUrl}
    />
  );
};

export default Page;
