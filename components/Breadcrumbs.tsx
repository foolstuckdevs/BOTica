'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import React from 'react';
import getPageTitle from '@/lib/helpers/getPageTitle';

/**
 * Human-readable labels for each URL segment.
 */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  inventory: 'Inventory',
  products: 'Products',
  categories: 'Categories',
  suppliers: 'Suppliers',
  adjustments: 'Adjustments',
  'stock-in': 'Stock In',
  sales: 'Sales',
  pos: 'POS Terminal',
  transactions: 'Transactions',
  reports: 'Reports',
  'activity-log': 'Activity Log',
  'manage-staff': 'Manage Staff',
  profile: 'Profile',
  new: 'New',
  edit: 'Edit',
};

/**
 * Context-aware labels: when a segment appears under a specific parent,
 * use a more descriptive label (e.g. "inventory" under "reports" → "Inventory Report").
 */
const CONTEXTUAL_LABELS: Record<string, Record<string, string>> = {
  reports: {
    inventory: 'Inventory Report',
    sales: 'Sales Report',
    'activity-log': 'Activity Log',
  },
};

/**
 * Section parents that should link to their canonical child page.
 */
const SECTION_HREFS: Record<string, string> = {
  inventory: '/inventory/products',
  sales: '/sales/transactions',
  reports: '/reports/sales',
};

/**
 * Check if a segment looks like a dynamic ID (numeric or UUID).
 */
const isDynamicSegment = (segment: string) =>
  /^\d+$/.test(segment) ||
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    segment,
  );

export default function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  // Build all crumbs including the current page
  const crumbs: { label: string; href: string }[] = [];

  let accPath = '';
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    accPath += `/${seg}`;

    // Skip dynamic ID segments (e.g. /products/5/edit → skip "5")
    if (isDynamicSegment(seg)) continue;

    // Check for context-aware label first (e.g. "inventory" under "reports")
    const parentSeg = i > 0 ? segments[i - 1] : '';
    const label =
      CONTEXTUAL_LABELS[parentSeg]?.[seg] ??
      SEGMENT_LABELS[seg] ??
      seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');

    // Use canonical section href if available
    const href = SECTION_HREFS[seg] ?? accPath;

    crumbs.push({ label, href });
  }

  // The current page label comes from the last crumb (context-aware)
  const currentPageLabel = crumbs.length > 0
    ? crumbs[crumbs.length - 1].label
    : getPageTitle(pathname);

  // Pop the last crumb — we'll render it as the bold current page title instead
  crumbs.pop();

  const isHome = pathname === '/' || pathname === '/dashboard';

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {isHome ? (
          /* On the Dashboard — just show the page name, no Home link */
          <BreadcrumbItem>
            <BreadcrumbPage className="flex items-center gap-1.5 text-gray-800 font-semibold text-sm">
              <Home className="h-3.5 w-3.5" />
              Dashboard
            </BreadcrumbPage>
          </BreadcrumbItem>
        ) : (
          <>
            {/* Home crumb */}
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Home className="h-3.5 w-3.5" />
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>

            {/* Ancestor crumbs */}
            {crumbs.map((crumb, idx) => (
              <React.Fragment key={`${idx}-${crumb.label}`}>
                <BreadcrumbSeparator className="text-gray-300" />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link
                      href={crumb.href}
                      className="text-gray-400 hover:text-gray-600 transition-colors text-sm"
                    >
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </React.Fragment>
            ))}

            {/* Current page */}
            <BreadcrumbSeparator className="text-gray-300" />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-gray-800 font-semibold text-sm">
                {currentPageLabel}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
