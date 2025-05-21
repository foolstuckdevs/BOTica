import ProductForm from '@/components/ProductForm';
import { getProductById } from '@/lib/actions/products';

// params values are always strings because they come from URL parameters.
const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params; //
  const product = await getProductById(Number(id));

  if (!product) {
    return <div>Product not found</div>;
  }

  return <ProductForm type="update" {...product} />;
};

export default Page;
