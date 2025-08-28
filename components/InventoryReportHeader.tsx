'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Layers, Download, FileSpreadsheet, FileText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

interface InventoryReportHeaderProps {
  onExportPDF?: () => void;
  onExportExcel?: () => void;
}

export const InventoryReportHeader = ({
  onExportPDF,
  onExportExcel,
}: InventoryReportHeaderProps) => {
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Title Section */}
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500 dark:bg-emerald-600 rounded-xl shadow-sm">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Inventory Report
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Monitor stock levels, expiry dates, and inventory health
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow"
                  title="Export inventory data"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={onExportPDF}
                  className="cursor-pointer"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  <span>Export as PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onExportExcel}
                  className="cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  <span>Export as Excel</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryReportHeader;
