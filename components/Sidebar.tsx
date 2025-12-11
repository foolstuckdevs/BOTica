'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Boxes,
  ShoppingCart,
  ChevronRight,
  ChevronDown,
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
  PanelLeft,
  PackagePlus,
} from 'lucide-react';
import React, { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import useIsMobile from '@/hooks/use-mobile';

// Sidebar Context
interface SidebarContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.');
  }
  return context;
};

export const SidebarProvider = ({
  children,
  defaultOpen = true,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const isMobile = useIsMobile();
  const isTablet = useIsMobile(1024); // Tablet breakpoint
  const [open, setOpen] = useState(defaultOpen);
  const [openMobile, setOpenMobile] = useState(false);

  // Auto-toggle for tablet sizes
  useEffect(() => {
    if (isTablet && !isMobile) {
      // On tablet, auto-collapse sidebar
      setOpen(false);
    } else if (!isTablet && !isMobile) {
      // On desktop, auto-expand sidebar
      setOpen(true);
    }
  }, [isTablet, isMobile]);

  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((prev) => !prev) : setOpen((prev) => !prev);
  }, [isMobile]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'b' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  return (
    <SidebarContext.Provider
      value={{
        open,
        setOpen,
        openMobile,
        setOpenMobile,
        isMobile,
        toggleSidebar,
      }}
    >
      <TooltipProvider delayDuration={0}>
        <div
          className="group/sidebar-wrapper flex min-h-svh w-full"
          style={
            {
              '--sidebar-width': isMobile ? '0px' : open ? '18rem' : '4rem',
            } as React.CSSProperties
          }
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
};

export const SidebarTrigger = () => {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className="h-7 w-7"
    >
      <PanelLeft className="h-4 w-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
};

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { open, openMobile, setOpenMobile, isMobile } = useSidebar();

  const [inventoryOpen, setInventoryOpen] = useState(
    pathname.startsWith('/inventory'),
  );
  const [salesOpen, setSalesOpen] = useState(pathname.startsWith('/sales'));
  const [reportsOpen, setReportsOpen] = useState(
    pathname.startsWith('/reports'),
  );

  // Avoid prefetching during SSR and defer in dev to speed up first paint
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isActive = (path: string) => pathname === path;
  const isChildActive = (prefix: string) => pathname.startsWith(prefix);

  const baseLinkClasses =
    'flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-all';
  const submenuLinkClasses =
    'flex items-center gap-3 pl-11 pr-3 py-2 text-sm rounded-lg transition-all';

  const parentActiveClasses = 'bg-blue-50 text-blue-600 font-medium';
  const submenuActiveClasses =
    'bg-blue-50/70 text-blue-600 font-medium border-l-2 border-blue-500 pl-[calc(2.75rem-2px)]';

  const isAdmin = session?.user?.role === 'Admin';

  // Prefetch hottest routes for snappy navigation
  useEffect(() => {
    if (!mounted) return;
    const doPrefetch = () => {
      router.prefetch('/dashboard');
      router.prefetch('/inventory/products');
      router.prefetch('/inventory/categories');
      if (isAdmin) {
        router.prefetch('/inventory/stock-in');
        router.prefetch('/inventory/suppliers');
        router.prefetch('/inventory/adjustments');
      }
    };
    if (process.env.NODE_ENV === 'production') {
      doPrefetch();
    } else if (typeof window !== 'undefined') {
      const t = setTimeout(doPrefetch, 1500);
      return () => clearTimeout(t);
    }
  }, [router, isAdmin, mounted]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-gray-100/70">
      {/* Header */}
      <div
        className={`flex items-center gap-3 p-4 border-b border-gray-100/70 ${
          !open ? 'justify-center' : ''
        }`}
      >
        {!open ? (
          <Tooltip>
            <TooltipTrigger>
              <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-2 shadow-sm">
                <Pill className="w-5 h-5 text-white" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>BOTica</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <>
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-2 shadow-sm">
              <Pill className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-blue-600">BOT</span>
              <span className="text-gray-700">ica</span>
            </h1>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {/* Dashboard */}
        {!open ? (
          <div className="flex justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/dashboard"
                  className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
                    isActive('/dashboard')
                      ? 'bg-blue-50 text-blue-600'
                      : 'hover:bg-gray-50 hover:text-blue-600 text-gray-600'
                  }`}
                >
                  <LayoutDashboard className="w-5 h-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Dashboard</p>
              </TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <Link
            href="/dashboard"
            className={`${baseLinkClasses} ${
              isActive('/dashboard')
                ? submenuActiveClasses
                : 'hover:bg-gray-50 hover:text-blue-600 text-gray-600'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
        )}

        {/* Inventory */}
        {!open ? (
          <div className="flex justify-center">
            <Tooltip>
              <DropdownMenu>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`relative flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
                        isChildActive('/inventory')
                          ? 'bg-blue-50 text-blue-600'
                          : 'hover:bg-gray-50 hover:text-blue-600 text-gray-600'
                      }`}
                    >
                      <Boxes className="w-5 h-5" />
                      <ChevronRight className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-white rounded-full border border-gray-200" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <DropdownMenuContent
                  side="right"
                  align="start"
                  className="w-48 ml-2"
                  sideOffset={8}
                >
                  <DropdownMenuLabel>Inventory</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      href="/inventory/products"
                      className="flex items-center gap-2"
                    >
                      <Package className="w-4 h-4" />
                      {isAdmin ? 'Products' : 'View Products'}
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      href="/inventory/categories"
                      className="flex items-center gap-2"
                    >
                      <Tag className="w-4 h-4" />
                      Categories
                    </Link>
                  </DropdownMenuItem>

                  {isAdmin && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/inventory/suppliers"
                          className="flex items-center gap-2"
                        >
                          <User className="w-4 h-4" />
                          Suppliers
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link
                          href="/inventory/stock-in"
                          className="flex items-center gap-2"
                        >
                          <PackagePlus className="w-4 h-4" />
                          Stock In
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link
                          href="/inventory/adjustments"
                          className="flex items-center gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Adjustments
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <TooltipContent side="right">
                <p>Inventory</p>
              </TooltipContent>
            </Tooltip>
          </div>
        ) : (
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
                <Link
                  href="/inventory/products"
                  className={`${submenuLinkClasses} ${
                    isActive('/inventory/products')
                      ? submenuActiveClasses
                      : 'text-gray-500 hover:bg-gray-50 hover:text-blue-600'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  {isAdmin ? 'Products' : 'View Products'}
                </Link>

                <Link
                  href="/inventory/categories"
                  className={`${submenuLinkClasses} ${
                    isActive('/inventory/categories')
                      ? submenuActiveClasses
                      : 'text-gray-500 hover:bg-gray-50 hover:text-blue-600'
                  }`}
                >
                  <Tag className="w-4 h-4" />
                  Categories
                </Link>

                {isAdmin && (
                  <>
                    <Link
                      href="/inventory/suppliers"
                      className={`${submenuLinkClasses} ${
                        isActive('/inventory/suppliers')
                          ? submenuActiveClasses
                          : 'text-gray-500 hover:bg-gray-50 hover:text-blue-600'
                      }`}
                    >
                      <User className="w-4 h-4" />
                      Suppliers
                    </Link>

                    <Link
                      href="/inventory/stock-in"
                      className={`${submenuLinkClasses} ${
                        isActive('/inventory/stock-in')
                          ? submenuActiveClasses
                          : 'text-gray-500 hover:bg-gray-50 hover:text-blue-600'
                      }`}
                    >
                      <PackagePlus className="w-4 h-4" />
                      Stock In
                    </Link>

                    <Link
                      href="/inventory/adjustments"
                      className={`${submenuLinkClasses} ${
                        isActive('/inventory/adjustments')
                          ? submenuActiveClasses
                          : 'text-gray-500 hover:bg-gray-50 hover:text-blue-600'
                      }`}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Adjustments
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Sales */}
        {!open ? (
          <div className="flex justify-center">
            <Tooltip>
              <DropdownMenu>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`relative flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
                        isChildActive('/sales')
                          ? 'bg-blue-50 text-blue-600'
                          : 'hover:bg-gray-50 hover:text-blue-600 text-gray-600'
                      }`}
                    >
                      <ShoppingCart className="w-5 h-5" />
                      <ChevronRight className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-white rounded-full border border-gray-200" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <DropdownMenuContent
                  side="right"
                  align="start"
                  className="w-48 ml-2"
                  sideOffset={8}
                >
                  <DropdownMenuLabel>Sales</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/sales/pos" className="flex items-center gap-2">
                      <ListOrdered className="w-4 h-4" />
                      POS Terminal
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/sales/transactions"
                      className="flex items-center gap-2"
                    >
                      <ClipboardList className="w-4 h-4" />
                      Transactions
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <TooltipContent side="right">
                <p>Sales</p>
              </TooltipContent>
            </Tooltip>
          </div>
        ) : (
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
        )}

        {/* Reports (Admin only) */}
        {isAdmin && (
          <>
            {!open ? (
              <div className="flex justify-center">
                <Tooltip>
                  <DropdownMenu>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={`relative flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
                            isChildActive('/reports')
                              ? 'bg-blue-50 text-blue-600'
                              : 'hover:bg-gray-50 hover:text-blue-600 text-gray-600'
                          }`}
                        >
                          <BarChart2 className="w-5 h-5" />
                          <ChevronRight className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-white rounded-full border border-gray-200" />
                        </button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <DropdownMenuContent
                      side="right"
                      align="start"
                      className="w-48 ml-2"
                      sideOffset={8}
                    >
                      <DropdownMenuLabel>Reports</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link
                          href="/reports/sales"
                          prefetch={true}
                          className="flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Sales Report
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/reports/inventory"
                          prefetch={true}
                          className="flex items-center gap-2"
                        >
                          <Layers className="w-4 h-4" />
                          Inventory Report
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/reports/activity-log"
                          className="flex items-center gap-2"
                        >
                          <ClipboardList className="w-4 h-4" />
                          Activity Log
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <TooltipContent side="right">
                    <p>Reports</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            ) : (
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
                      prefetch={true}
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
                      prefetch={true}
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
            )}
          </>
        )}
        {/* Manage Staff (Admin only) */}
        {isAdmin && (
          <>
            {!open ? (
              <div className="flex justify-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/manage-staff"
                      className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
                        isActive('/manage-staff')
                          ? 'bg-blue-50 text-blue-600'
                          : 'hover:bg-gray-50 hover:text-blue-600 text-gray-600'
                      }`}
                    >
                      <Users className="w-5 h-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Manage Staff</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            ) : (
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
          </>
        )}
      </nav>
    </div>
  );

  // Mobile sidebar (using Sheet)
  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent side="left" className="w-72 p-0">
          <VisuallyHidden.Root>
            <SheetTitle>Navigation Menu</SheetTitle>
          </VisuallyHidden.Root>
          <SidebarContent />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop sidebar
  return (
    <aside
      className={`fixed left-0 top-0 h-screen transition-all duration-300 z-40 ${
        open ? 'w-72' : 'w-16'
      }`}
    >
      <SidebarContent />
    </aside>
  );
};

export default Sidebar;
