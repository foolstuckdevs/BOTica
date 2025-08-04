import { SalesReportHeader } from '@/components/SalesReportHeader';
import { SalesReportOverview } from '@/components/SalesReportOverview';
import { BatchProfitTable } from '@/components/BatchProfitTable';
import React from 'react';
import { ProductPerformanceTable } from '@/components/ProductPerformanceTable';
import { getSalesReportData } from '@/lib/actions/sales-reports';
import { auth } from '@/auth';

const page = async () => {
  const session = await auth();

  // Middleware ensures session exists for protected routes
  if (!session?.user) {
    throw new Error('Unauthorized: session missing. Check auth middleware.');
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
      batchProfitData,
      comprehensiveSalesData,
      comprehensiveProductData,
    } = await getSalesReportData(pharmacyId);

    return (
      <div className="space-y-6 p-6">
        <SalesReportHeader />
        <SalesReportOverview
          salesData={salesData}
          comprehensiveSalesData={comprehensiveSalesData}
        />
        <ProductPerformanceTable
          productData={productData}
          comprehensiveProductData={comprehensiveProductData}
        />
        <BatchProfitTable batchData={batchProfitData} loading={false} />
      </div>
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
      yesterday: {
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
      comparison: {
        current: {
          totalSales: 0,
          totalCost: 0,
          profit: 0,
          transactions: 0,
          totalItems: 0,
        },
        previous: {
          totalSales: 0,
          totalCost: 0,
          profit: 0,
          transactions: 0,
          totalItems: 0,
        },
        salesGrowth: 0,
        profitGrowth: 0,
        transactionGrowth: 0,
      },
    };

    const fallbackProductData = {
      today: [],
      week: [],
      month: [],
    };

    return (
      <div className="space-y-6 p-6">
        {/* Header with filters and actions */}
        <SalesReportHeader />

        {/* Sales Overview - Core metrics with period filtering */}
        <SalesReportOverview salesData={fallbackData} />

        {/* Product Performance Analysis */}
        <ProductPerformanceTable productData={fallbackProductData} />

        {/* Batch Profit Analysis */}
        <BatchProfitTable batchData={[]} loading={false} />
      </div>
    );
  }
};

export default page;
