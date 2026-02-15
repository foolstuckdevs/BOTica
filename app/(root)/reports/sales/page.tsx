import React, { Suspense } from 'react';
import { getSalesReportData } from '@/lib/actions/sales-reports';
import { auth } from '@/auth';
import SalesReportClient from '@/components/SalesReportClient';
import { redirect } from 'next/navigation';
import { SkeletonSalesOverview } from '@/components/ui/skeleton';

// Separate component for data fetching to enable streaming
async function SalesReportData({ initialTab }: { initialTab?: string }) {
  const session = await auth();

  // Middleware ensures session exists for protected routes
  if (!session?.user) {
    redirect('/sign-in');
  }

  if (!session.user.pharmacyId) {
    throw new Error('Unauthorized: user not assigned to any pharmacy.');
  }

  const pharmacyId = session.user.pharmacyId;

  try {
    // Fetch all sales report data with a single consolidated server action
    const {
      salesData,
      productData,
      comprehensiveSalesData,
      comprehensiveProductData,
    } = await getSalesReportData(pharmacyId);

    return (
      <SalesReportClient
        salesData={salesData}
        productData={productData}
        comprehensiveSalesData={comprehensiveSalesData}
        comprehensiveProductData={comprehensiveProductData}
        initialTab={(initialTab as 'overview' | 'sales' | 'products' | 'daily') || 'overview'}
      />
    );
  } catch (error) {
    console.error('Error loading sales report:', error);

    // Fallback data in case of error
    const fallbackData = {
      today: {
        totalSales: 0,
        totalCost: 0,
        profit: 0,
        transactions: 0,
        totalItems: 0,
      },
      week: {
        totalSales: 0,
        totalCost: 0,
        profit: 0,
        transactions: 0,
        totalItems: 0,
      },
      month: {
        totalSales: 0,
        totalCost: 0,
        profit: 0,
        transactions: 0,
        totalItems: 0,
      },
    };

    const fallbackProductData = {
      today: [],
      week: [],
      month: [],
    };

    return (
      <SalesReportClient
        salesData={fallbackData}
        productData={fallbackProductData}
        comprehensiveSalesData={[]}
        comprehensiveProductData={[]}
        initialTab={(initialTab as 'overview' | 'sales' | 'products' | 'daily') || 'overview'}
      />
    );
  }
}

const page = async ({ searchParams }: { searchParams: Promise<{ tab?: string }> }) => {
  const { tab } = await searchParams;
  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <Suspense fallback={<SkeletonSalesOverview />}>
          <SalesReportData initialTab={tab} />
        </Suspense>
      </div>
    </div>
  );
};

export default page;
