import PurchaseOrderForm from '@/components/PurchaseOrderForm';
import { getSuppliers } from '@/lib/actions/suppliers';
import { getProducts } from '@/lib/actions/products';
import { getPurchaseOrderById } from '@/lib/actions/purchase-order';

const page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const pharmacyId = 1; // Replace with session pharmacyId later
  const orderId = Number(id);

  const [order, suppliers, products] = await Promise.all([
    getPurchaseOrderById(orderId, pharmacyId),
    getSuppliers(pharmacyId),
    getProducts(pharmacyId),
  ]);

  if (!order) {
    return (
      <div className="p-6 text-center text-gray-500">
        Purchase Order not found.
      </div>
    );
  }

  const initialData = {
    id: order.id,
    supplierId: order.supplierId,
    orderDate: order.orderDate,
    notes: order.notes ?? '',
    items: order.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitCost: String(item.unitCost), // Ensure unitCost is string for form input
    })),
  };

  return (
    <PurchaseOrderForm
      type="update"
      initialValues={initialData}
      suppliers={suppliers}
      products={products}
    />
  );
};

export default page;
