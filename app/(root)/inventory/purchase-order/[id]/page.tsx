import PurchaseOrderDetails from '@/components/PurchaseOrderDetails';
import { getPurchaseOrderById } from '@/lib/actions/purchase-order';
import { getSuppliers } from '@/lib/actions/suppliers';
import { getOrderableProducts } from '@/lib/actions/purchase-order';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

const Page = async ({ params }: { params: { id: string } }) => {
  const awaitedParams = await Promise.resolve(params);
  const orderId = Number(awaitedParams.id);

  const session = await auth();

  // Middleware ensures session exists for protected routes
  if (!session?.user) {
    redirect('/sign-in');
  }

  if (!session.user.pharmacyId) {
    throw new Error('Unauthorized: user not assigned to any pharmacy.');
  }

  const pharmacyId = session.user.pharmacyId;

  const [orderRaw, suppliers, products] = await Promise.all([
    getPurchaseOrderById(orderId, pharmacyId),
    getSuppliers(pharmacyId),
    getOrderableProducts(pharmacyId),
  ]);

  if (!orderRaw) {
    return (
      <div className="p-6 text-center text-gray-500">
        Purchase Order not found.
      </div>
    );
  }

  // Create maps for quick lookup
  const productMap = new Map(products.map((p) => [p.id, p]));
  const supplier = suppliers.find((s) => s.id === orderRaw.supplierId);

  const items = (orderRaw.items || []).map((item) => {
    const product = productMap.get(item.productId);
    const unitCost = parseFloat(item.unitCost || '0');
    return {
      id: item.id ?? 0,
      purchaseOrderId: orderRaw.id,
      productId: item.productId,
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalCost: item.totalCost ?? (unitCost * item.quantity).toFixed(2),
      receivedQuantity: item.receivedQuantity ?? 0, // Include receivedQuantity from database
      productName: product?.name ?? 'Unknown Product',
      productUnit: product?.unit ?? '',
    };
  });

  const totalCost = items.reduce(
    (sum, item) => sum + parseFloat(item.totalCost.toString()),
    0,
  );

  const order = {
    id: orderRaw.id,
    orderNumber: orderRaw.orderNumber || `PO-${orderRaw.id}`,
    supplierId: orderRaw.supplierId,
    userId: orderRaw.userId ?? '',
    orderDate: orderRaw.orderDate,
    status: orderRaw.status ?? 'PENDING',
    notes: orderRaw.notes ?? '',
    pharmacyId: orderRaw.pharmacyId ?? pharmacyId,
    createdAt: orderRaw.createdAt ?? orderRaw.orderDate,
    supplierName: orderRaw.supplierName ?? supplier?.name ?? 'Unknown Supplier',
    totalItems: items.length,
    totalQuantity: items.reduce((sum, item) => sum + Number(item.quantity), 0),
    totalCost: totalCost.toFixed(2), // Convert to string to match expected type
    items,
  };

  return (
    <PurchaseOrderDetails
      order={order}
      supplier={supplier}
      products={products}
    />
  );
};

export default Page;
