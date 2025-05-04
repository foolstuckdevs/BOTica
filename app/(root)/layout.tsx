import { auth } from '@/auth';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

const layout = async ({ children }: { children: ReactNode }) => {
  const session = await auth();

  if (!session) redirect('/sign-in');
  return (
    <main className="flex flex-row min-h-screen w-full">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header session={session} />
        {children}
      </div>
    </main>
  );
};

export default layout;
