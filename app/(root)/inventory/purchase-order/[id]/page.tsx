import PurchaseOrderDetails from '@/components/PurchaseOrderDetails';
import { getPurchaseOrderById } from '@/lib/actions/purchase-order';
import { getSuppliers } from '@/lib/actions/suppliers';
import { getProducts } from '@/lib/actions/products';

const Page = async ({ params }: { params: { id: string } }) => {
  const awaitedParams = await Promise.resolve(params);
  const orderId = Number(awaitedParams.id);
  const pharmacyId = 1; // TODO: Replace with session pharmacyId

  const [orderRaw, suppliers, products] = await Promise.all([
    getPurchaseOrderById(orderId, pharmacyId),
    getSuppliers(pharmacyId),
    getProducts(pharmacyId),
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
    const unitCost = parseFloat(item.unitCost);
    return {
      id: item.id ?? 0,
      purchaseOrderId: orderRaw.id,
      productId: item.productId,
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalCost: item.totalCost ?? (unitCost * item.quantity).toFixed(2),
      productName: product?.name ?? 'Unknown Product',
      productUnit: product?.unit ?? '',
    };
  });

  const totalCost = items.reduce(
    (sum, item) => sum + parseFloat(item.totalCost),
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
    totalCost,
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
