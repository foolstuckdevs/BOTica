import PurchaseOrderForm from '@/components/PurchaseOrderForm';
import { getSuppliers } from '@/lib/actions/suppliers';
import { getOrderableProducts } from '@/lib/actions/purchase-order';
import { getPurchaseOrderById } from '@/lib/actions/purchase-order';
import { auth } from '@/auth';

const page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    throw new Error('Unauthorized: session missing. Check auth middleware.');
  }

  if (!session.user.pharmacyId) {
    throw new Error('Unauthorized: user not assigned to any pharmacy.');
  }

  const pharmacyId = session.user.pharmacyId;
  const orderId = Number(id);

  const [order, suppliers, products] = await Promise.all([
    getPurchaseOrderById(orderId, pharmacyId),
    getSuppliers(pharmacyId),
    getOrderableProducts(pharmacyId),
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
      userId={session.user.id}
      pharmacyId={pharmacyId}
    />
  );
};

export default page;
