'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  LayoutDashboard,
  Boxes,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import React, { useState } from 'react';

const Sidebar = () => {
  const [inventoryOpen, setInventoryOpen] = useState(false);

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-white text-gray-800 p-4 border-r border-gray-200 z-40">
      <div>
        <div className="mb-10 flex justify-center">
          <Image src="/logo.svg" alt="logo" height={120} width={120} />
        </div>
        <nav className="space-y-2">
          {/* Dashboard */}
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 transition text-sm font-medium text-gray-700"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>

          {/* Inventory Dropdown */}
          <button
            onClick={() => setInventoryOpen(!inventoryOpen)}
            className="flex w-full items-center justify-between px-3 py-2 rounded-md hover:bg-gray-100 transition text-sm font-medium text-gray-700"
          >
            <span className="flex items-center gap-3">
              <Boxes className="w-4 h-4" />
              Inventory
            </span>
            {inventoryOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {/* Submenu */}
          {inventoryOpen && (
            <div className="ml-8 space-y-1">
              <Link
                href="/inventory/products"
                className="block px-2 py-1 text-sm text-gray-600 rounded hover:bg-gray-100 transition"
              >
                Products
              </Link>
              <Link
                href="/inventory/categories"
                className="block px-2 py-1 text-sm text-gray-600 rounded hover:bg-gray-100 transition"
              >
                Categories
              </Link>
            </div>
          )}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
