'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';

function AccessDeniedToastInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const denied = searchParams.get('denied');
    if (!denied) return;

    const map: Record<string, string> = {
      reports: 'You don’t have permission to access Reports.',
      inventory: 'You don’t have permission to access this inventory section.',
      suppliers: 'You don’t have permission to access this inventory section.',
      adjustments:
        'You don’t have permission to access this inventory section.',
      purchase_orders:
        'You don’t have permission to access this inventory section.',
    };

    toast.error(
      map[denied] || 'You don’t have permission to access this page.',
    );

    // Remove the query param from the URL without adding a history entry
    const url = new URL(window.location.href);
    url.searchParams.delete('denied');
    router.replace(pathname + (url.search ? url.search : ''));
  }, [searchParams, pathname, router]);

  return null;
}

export default function AccessDeniedToast() {
  return (
    <Suspense fallback={null}>
      <AccessDeniedToastInner />
    </Suspense>
  );
}
