import { getProducts } from '@/lib/actions/products';
import { getCategories } from '@/lib/actions/categories';
import { getSuppliers } from '@/lib/actions/suppliers';
import { ProductsPageClient } from './ProductsPageClient';
import { auth } from '@/auth';

// Convert to Client Component for filtering
const ProductsPage = async () => {
  const session = await auth();

  // Middleware ensures session exists for protected routes
  if (!session?.user) {
    throw new Error('Unauthorized: session missing. Check auth middleware.');
  }

  if (!session.user.pharmacyId) {
    throw new Error('Unauthorized: user not assigned to any pharmacy.');
  }

  const pharmacyId = session.user.pharmacyId;
  const products = await getProducts(pharmacyId);
  const categories = await getCategories(pharmacyId);
  const suppliers = await getSuppliers(pharmacyId);

  // Hydrate filter state client-side
  // Use a client wrapper for filter state
  return (
    <ProductsPageClient
      products={products}
      categories={categories}
      suppliers={suppliers}
    />
  );
};

export default ProductsPage;
