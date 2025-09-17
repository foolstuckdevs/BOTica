import { getInventoryReportData } from '@/lib/actions/inventory-reports';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import React from 'react';
import InventoryReportClient from '@/components/InventoryReportClient';

const page = async ({
  searchParams,
}: {
  searchParams?: { tab?: string; status?: string };
}) => {
  const session = await auth();

  if (!session?.user?.pharmacyId) {
    redirect('/sign-in');
  }

  // Fetch inventory report data
  const inventoryData = await getInventoryReportData(session.user.pharmacyId);

  const tab = searchParams?.tab;
  const status = searchParams?.status;
  const initialTab: 'overview' | 'expiring' | 'low-stock' =
    tab === 'overview' || tab === 'expiring' || tab === 'low-stock'
      ? tab
      : 'overview';

  // Map status query to initial filters for each tab
  let initialLowStockStatus: 'all' | 'out_of_stock' | 'low' | undefined;
  let initialExpiringStatus:
    | 'all'
    | 'expired'
    | 'expiring'
    | 'warning'
    | 'return'
    | undefined;

  if (initialTab === 'low-stock') {
    if (status === 'out_of_stock' || status === 'low' || status === 'all') {
      initialLowStockStatus = status as 'all' | 'out_of_stock' | 'low';
    }
  } else if (initialTab === 'expiring') {
    if (
      status === 'expired' ||
      status === 'expiring' ||
      status === 'warning' ||
      status === 'return' ||
      status === 'all'
    ) {
      initialExpiringStatus = status as
        | 'all'
        | 'expired'
        | 'expiring'
        | 'warning'
        | 'return';
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <InventoryReportClient
          inventoryData={inventoryData}
          initialTab={initialTab}
          initialLowStockStatus={initialLowStockStatus}
          initialExpiringStatus={initialExpiringStatus}
        />
      </div>
    </div>
  );
};

export default page;
