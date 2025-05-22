'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  LayoutDashboard,
  Boxes,
  ShoppingCart,
  ChevronDown,
  ChevronRight,
  Package,
  Tag,
  User,
  ListOrdered,
  ClipboardList,
  Settings,
  BarChart2,
  FileText,
  AlertTriangle,
  Layers,
  RefreshCw,
} from 'lucide-react';
import React, { useState } from 'react';

const Sidebar = () => {
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);

  const linkClasses =
    'flex items-center gap-2 px-2 py-2 text-sm font-medium rounded hover:bg-gray-100';
  const submenuLinkClasses =
    'flex items-center gap-2 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100';

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-white text-gray-800 p-4 border-r border-gray-200 z-40">
      <div className="mb-10 flex justify-center">
        <Image src="/logo.svg" alt="logo" height={120} width={120} />
      </div>

      <nav className="space-y-2">
        {/* Dashboard */}
        <Link href="/" className={linkClasses}>
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </Link>

        {/* Inventory */}
        <div className="flex flex-col">
          <button
            onClick={() => setInventoryOpen(!inventoryOpen)}
            className={linkClasses}
          >
            <Boxes className="w-4 h-4" />
            Inventory
            {inventoryOpen ? (
              <ChevronDown className="ml-auto w-4 h-4" />
            ) : (
              <ChevronRight className="ml-auto w-4 h-4" />
            )}
          </button>
          {inventoryOpen && (
            <div className="flex flex-col ml-4 mt-1">
              <Link href="/inventory/products" className={submenuLinkClasses}>
                <Package className="w-4 h-4" />
                Products
              </Link>
              <Link href="/inventory/categories" className={submenuLinkClasses}>
                <Tag className="w-4 h-4" />
                Categories
              </Link>
              <Link href="/inventory/suppliers" className={submenuLinkClasses}>
                <User className="w-4 h-4" />
                Suppliers
              </Link>
              <Link href="/inventory/suppliers" className={submenuLinkClasses}>
                <RefreshCw className="w-4 h-4" />
                Adjusments
              </Link>
              <Link href="/inventory/purchases" className={submenuLinkClasses}>
                <ClipboardList className="w-4 h-4" />
                Purchases
              </Link>
            </div>
          )}
        </div>

        {/* Sales */}
        <div className="flex flex-col">
          <button
            onClick={() => setSalesOpen(!salesOpen)}
            className={linkClasses}
          >
            <ShoppingCart className="w-4 h-4" />
            Sales
            {salesOpen ? (
              <ChevronDown className="ml-auto w-4 h-4" />
            ) : (
              <ChevronRight className="ml-auto w-4 h-4" />
            )}
          </button>
          {salesOpen && (
            <div className="flex flex-col ml-4 mt-1">
              <Link href="/sales/pos" className={submenuLinkClasses}>
                <ListOrdered className="w-4 h-4" />
                POS Terminal
              </Link>
              <Link href="/sales/transactions" className={submenuLinkClasses}>
                <ClipboardList className="w-4 h-4" />
                Transactions
              </Link>
            </div>
          )}
        </div>

        {/* Reports */}
        <div className="flex flex-col">
          <button
            onClick={() => setReportsOpen(!reportsOpen)}
            className={linkClasses}
          >
            <BarChart2 className="w-4 h-4" />
            Reports
            {reportsOpen ? (
              <ChevronDown className="ml-auto w-4 h-4" />
            ) : (
              <ChevronRight className="ml-auto w-4 h-4" />
            )}
          </button>
          {reportsOpen && (
            <div className="flex flex-col ml-4 mt-1">
              <Link href="/reports/sales" className={submenuLinkClasses}>
                <FileText className="w-4 h-4" />
                Sales Report
              </Link>
              <Link href="/reports/inventory" className={submenuLinkClasses}>
                <Layers className="w-4 h-4" />
                Inventory Report
              </Link>
              <Link href="/reports/expiration" className={submenuLinkClasses}>
                <AlertTriangle className="w-4 h-4" />
                Expiration Report
              </Link>
            </div>
          )}
        </div>

        {/* Settings */}
        <Link href="/settings" className={linkClasses}>
          <Settings className="w-4 h-4" />
          Settings
        </Link>
      </nav>
    </aside>
  );
};

export default Sidebar;
