'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Filter,
  User,
  Clock,
  Download,
  Receipt,
  Eye,
} from 'lucide-react';

export const SalesTableWithFilters = () => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCashier, setSelectedCashier] = React.useState('all');

  const salesData = [
    {
      id: 'INV-001',
      date: '2025-01-26',
      time: '14:30',
      customer: 'Maria Santos',
      items: 3,
      total: 1245.5,
      status: 'Completed',
      cashier: 'John Doe',
    },
    {
      id: 'INV-002',
      date: '2025-01-26',
      time: '14:25',
      customer: 'Walk-in Customer',
      items: 1,
      total: 125.0,
      status: 'Completed',
      cashier: 'John Doe',
    },
    {
      id: 'INV-003',
      date: '2025-01-26',
      time: '14:18',
      customer: 'Roberto Cruz',
      items: 5,
      total: 2890.75,
      status: 'Completed',
      cashier: 'Jane Smith',
    },
    {
      id: 'INV-004',
      date: '2025-01-26',
      time: '14:10',
      customer: 'Ana Garcia',
      items: 2,
      total: 580.25,
      status: 'Completed',
      cashier: 'John Doe',
    },
  ];

  const cashiers = [
    'all',
    ...Array.from(new Set(salesData.map((sale) => sale.cashier))),
  ];

  const filteredData = salesData.filter((sale) => {
    const matchesSearch =
      sale.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCashier =
      selectedCashier === 'all' || sale.cashier === selectedCashier;
    return matchesSearch && matchesCashier;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer or invoice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={selectedCashier}
              onChange={(e) => setSelectedCashier(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              {cashiers.map((cashier) => (
                <option key={cashier} value={cashier}>
                  {cashier === 'all' ? 'All Cashiers' : cashier}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found matching your search.
            </div>
          ) : (
            filteredData.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium">{sale.id}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {sale.time}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm">{sale.customer}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {sale.items} items • {sale.cashier}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold">
                      ₱
                      {sale.total.toLocaleString('en-PH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <Badge variant="default" className="text-xs">
                      {sale.status}
                    </Badge>
                  </div>

                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Receipt className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
