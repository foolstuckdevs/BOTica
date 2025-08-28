import { getInventoryReportData } from '@/lib/actions/inventory-reports';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import React from 'react';
import InventoryReportClient from '@/components/InventoryReportClient';

const page = async () => {
  const session = await auth();

  if (!session?.user?.pharmacyId) {
    redirect('/auth/sign-in');
  }

  // Fetch inventory report data
  const inventoryData = await getInventoryReportData(session.user.pharmacyId);

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <InventoryReportClient inventoryData={inventoryData} />
      </div>
    </div>
  );
};

export default page;
