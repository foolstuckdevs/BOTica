import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { z } from 'zod';

const PurchaseOrderExcelSchema = z.object({
  filename: z.string().optional(),
  order: z.object({
    id: z.number(),
    orderNumber: z.string(),
    orderDate: z.string(),
    status: z.string(),
    notes: z.string().optional().nullable(),
    totalCost: z.string().optional(),
    supplierName: z.string().optional(),
    userName: z.string().optional(),
  }),
  supplier: z
    .object({
      name: z.string(),
      contactPerson: z.string(),
      phone: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
    })
    .optional(),
  items: z.array(
    z.object({
      productName: z.string(),
      quantity: z.number(),
      unitCost: z.string().optional().nullable(),
      productUnit: z.string().optional().nullable(),
      brandName: z.string().optional().nullable(),
    }),
  ),
});

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9._-]/gi, '_');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = PurchaseOrderExcelSchema.parse(body);

    const filename = sanitizeFilename(
      data.filename || `purchase-order-${data.order.orderNumber}.xlsx`,
    );

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Order Summary Sheet
    const orderSummary = [
      { Field: 'PO Number', Value: data.order.orderNumber },
      {
        Field: 'Order Date',
        Value: new Date(data.order.orderDate).toLocaleDateString('en-US'),
      },
      { Field: 'Status', Value: data.order.status },
      { Field: 'Created By', Value: data.order.userName || 'N/A' },
      {
        Field: 'Total Cost',
        Value: data.order.totalCost
          ? `₱${parseFloat(data.order.totalCost).toFixed(2)}`
          : 'TBD',
      },
    ];

    if (data.supplier) {
      orderSummary.push(
        { Field: 'Supplier', Value: data.supplier.name },
        { Field: 'Contact Person', Value: data.supplier.contactPerson },
        { Field: 'Supplier Phone', Value: data.supplier.phone || 'N/A' },
        { Field: 'Supplier Email', Value: data.supplier.email || 'N/A' },
        { Field: 'Supplier Address', Value: data.supplier.address || 'N/A' },
      );
    }

    if (data.order.notes) {
      orderSummary.push({ Field: 'Notes', Value: data.order.notes });
    }

    const orderWs = XLSX.utils.json_to_sheet(orderSummary);

    // Set column widths for order summary
    orderWs['!cols'] = [
      { width: 20 }, // Field column
      { width: 40 }, // Value column
    ];

    XLSX.utils.book_append_sheet(wb, orderWs, 'Order Summary');

    // Items Sheet
    const itemsData = data.items.map((item, index) => {
      const unitCost = parseFloat(item.unitCost || '0');
      const itemTotal = unitCost * item.quantity;

      return {
        '#': index + 1,
        'Product Name': item.productName,
        Brand: item.brandName || 'N/A',
        Quantity: item.quantity,
        Unit: item.productUnit || 'N/A',
        'Unit Cost': unitCost > 0 ? unitCost : 'TBD',
        'Total Cost': unitCost > 0 ? itemTotal : 'TBD',
      };
    });

    const itemsWs = XLSX.utils.json_to_sheet(itemsData);

    // Set column widths for items
    itemsWs['!cols'] = [
      { width: 5 }, // #
      { width: 30 }, // Product Name
      { width: 15 }, // Brand
      { width: 10 }, // Quantity
      { width: 10 }, // Unit
      { width: 12 }, // Unit Cost
      { width: 12 }, // Total Cost
    ];

    XLSX.utils.book_append_sheet(wb, itemsWs, 'Items');

    // Generate Excel buffer
    const excelBuffer = XLSX.write(wb, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Excel export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate Excel file' },
      { status: 500 },
    );
  }
}
