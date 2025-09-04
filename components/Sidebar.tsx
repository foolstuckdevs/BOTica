'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
  BarChart2,
  FileText,
  RefreshCw,
  Pill,
  Users,
  Layers,
} from 'lucide-react';
import React, { useState } from 'react';

const Sidebar = () => {
  const pathname = usePathname();
  const { data: session } = useSession();

  const [inventoryOpen, setInventoryOpen] = useState(
    pathname.startsWith('/inventory'),
  );
  const [salesOpen, setSalesOpen] = useState(pathname.startsWith('/sales'));
  const [reportsOpen, setReportsOpen] = useState(
    pathname.startsWith('/reports'),
  );

  const isActive = (path: string) => pathname === path;
  const isChildActive = (prefix: string) => pathname.startsWith(prefix);

  const baseLinkClasses =
    'flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-all';
  const submenuLinkClasses =
    'flex items-center gap-3 pl-11 pr-3 py-2 text-sm rounded-lg transition-all';

  const parentActiveClasses = 'bg-blue-50 text-blue-600 font-medium';
  const submenuActiveClasses =
    'bg-blue-50/70 text-blue-600 font-medium border-l-2 border-blue-500 pl-[calc(2.75rem-2px)]';

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white text-gray-800 p-4 border-r border-gray-100/70 z-40">
      <div className="mb-7 flex items-center gap-3 pt-1 pl-4">
        <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-2 shadow-sm">
          <Pill className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-blue-600">BOT</span>
          <span className="text-gray-700">ica</span>
        </h1>
      </div>

      <nav className="space-y-1">
        {/* Dashboard */}
        <Link
          href="/"
          className={`${baseLinkClasses} ${
            isActive('/')
              ? submenuActiveClasses
              : 'hover:bg-gray-50 hover:text-blue-600 text-gray-600'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          Dashboard
        </Link>

        {/* Inventory */}
        <div className="flex flex-col">
          <button
            onClick={() => setInventoryOpen(!inventoryOpen)}
            className={`${baseLinkClasses} ${
              isChildActive('/inventory')
                ? parentActiveClasses
                : 'hover:bg-gray-50 hover:text-blue-600 text-gray-600'
            }`}
          >
            <Boxes className="w-5 h-5" />
            Inventory
            {inventoryOpen ? (
              <ChevronDown className="ml-auto w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="ml-auto w-4 h-4 text-gray-400" />
            )}
          </button>
          {inventoryOpen && (
            <div className="flex flex-col mt-1 space-y-0.5 ml-1">
              {[
                {
                  href: '/inventory/products',
                  label: 'Products',
                  icon: <Package className="w-4 h-4" />,
                },
                {
                  href: '/inventory/categories',
                  label: 'Categories',
                  icon: <Tag className="w-4 h-4" />,
                },
                {
                  href: '/inventory/suppliers',
                  label: 'Suppliers',
                  icon: <User className="w-4 h-4" />,
                },
                {
                  href: '/inventory/adjustments',
                  label: 'Adjustments',
                  icon: <RefreshCw className="w-4 h-4" />,
                },
                {
                  href: '/inventory/purchase-order',
                  label: 'Purchase Orders',
                  icon: <ClipboardList className="w-4 h-4" />,
                },
              ].map(({ href, label, icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`${submenuLinkClasses} ${
                    isActive(href)
                      ? submenuActiveClasses
                      : 'text-gray-500 hover:bg-gray-50 hover:text-blue-600'
                  }`}
                >
                  {icon}
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sales */}
        <div className="flex flex-col">
          <button
            onClick={() => setSalesOpen(!salesOpen)}
            className={`${baseLinkClasses} ${
              isChildActive('/sales')
                ? parentActiveClasses
                : 'hover:bg-gray-50 hover:text-blue-600 text-gray-600'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            Sales
            {salesOpen ? (
              <ChevronDown className="ml-auto w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="ml-auto w-4 h-4 text-gray-400" />
            )}
          </button>
          {salesOpen && (
            <div className="flex flex-col mt-1 space-y-0.5 ml-1">
              <Link
                href="/sales/pos"
                className={`${submenuLinkClasses} ${
                  isActive('/sales/pos')
                    ? submenuActiveClasses
                    : 'text-gray-500 hover:bg-gray-50 hover:text-blue-600'
                }`}
              >
                <ListOrdered className="w-4 h-4" />
                POS Terminal
              </Link>
              <Link
                href="/sales/transactions"
                className={`${submenuLinkClasses} ${
                  isActive('/sales/transactions')
                    ? submenuActiveClasses
                    : 'text-gray-500 hover:bg-gray-50 hover:text-blue-600'
                }`}
              >
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
            className={`${baseLinkClasses} ${
              isChildActive('/reports')
                ? parentActiveClasses
                : 'hover:bg-gray-50 hover:text-blue-600 text-gray-600'
            }`}
          >
            <BarChart2 className="w-5 h-5" />
            Reports
            {reportsOpen ? (
              <ChevronDown className="ml-auto w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="ml-auto w-4 h-4 text-gray-400" />
            )}
          </button>
          {reportsOpen && (
            <div className="flex flex-col mt-1 space-y-0.5 ml-1">
              <Link
                href="/reports/sales"
                className={`${submenuLinkClasses} ${
                  isActive('/reports/sales')
                    ? submenuActiveClasses
                    : 'text-gray-500 hover:bg-gray-50 hover:text-blue-600'
                }`}
              >
                <FileText className="w-4 h-4" />
                Sales Report
              </Link>
              <Link
                href="/reports/inventory"
                className={`${submenuLinkClasses} ${
                  isActive('/reports/inventory')
                    ? submenuActiveClasses
                    : 'text-gray-500 hover:bg-gray-50 hover:text-blue-600'
                }`}
              >
                <Layers className="w-4 h-4" />
                Inventory Report
              </Link>
              <Link
                href="/reports/activity-log"
                className={`${submenuLinkClasses} ${
                  isActive('/reports/activity-log')
                    ? submenuActiveClasses
                    : 'text-gray-500 hover:bg-gray-50 hover:text-blue-600'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                Activity Log
              </Link>
            </div>
          )}
        </div>

        {/* Top-level: Manage Staff (Admin only) */}
        {session?.user?.role === 'Admin' && (
          <Link
            href="/manage-staff"
            className={`${baseLinkClasses} ${
              isActive('/manage-staff')
                ? submenuActiveClasses
                : 'hover:bg-gray-50 hover:text-blue-600 text-gray-600'
            }`}
          >
            <Users className="w-5 h-5" />
            Manage Staff
          </Link>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
