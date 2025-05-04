import Image from 'next/image';
import Link from 'next/link';
import { LayoutDashboard, Boxes } from 'lucide-react';
import React from 'react';

const Sidebar = () => {
  return (
    <aside className="sticky top-0 left-0 flex h-dvh w-64 flex-col justify-between bg-white border-r px-5 py-6 shadow-sm">
      <div>
        <div className="mb-10 flex justify-center">
          <Image src="/logo.svg" alt="logo" height={120} width={120} />
        </div>
        <nav className="space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 transition text-sm font-medium text-gray-700"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            href="/inventory"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 transition text-sm font-medium text-gray-700"
          >
            <Boxes className="w-4 h-4" />
            Inventory
          </Link>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
