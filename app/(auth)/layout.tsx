import { auth } from '@/auth';
import { redirect } from 'next/navigation';

import { ReactNode } from 'react';

const Layout = async ({ children }: { children: ReactNode }) => {
  const session = await auth();

  if (session) redirect('/');

  return (
    <main className="flex min-h-screen items-center justify-center">
      {children}
    </main>
  );
};

export default Layout;
