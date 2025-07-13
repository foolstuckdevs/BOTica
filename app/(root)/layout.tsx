import { auth } from '@/auth';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

const Layout = async ({ children }: { children: ReactNode }) => {
  const session = await auth();

  if (!session) redirect('/sign-in');

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header session={session} />
        <main className="flex-1 overflow-y-auto pt-16 pl-64 bg-gradient-to-b from-blue-50/20 to-white">
          <div className="p-6 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
