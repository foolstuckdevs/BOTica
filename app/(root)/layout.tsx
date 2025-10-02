import { auth } from '@/auth';
import Header from '@/components/Header';
import Sidebar, { SidebarProvider } from '@/components/Sidebar';
import PnfChatbot from '@/components/PnfChatbot';
import { ReactNode } from 'react';
import InactivityWatcher from '@/components/InactivityWatcher';
import SessionLifecycle from '@/components/SessionLifecycle';

const Layout = async ({ children }: { children: ReactNode }) => {
  const session = await auth();

  // Middleware ensures session exists for protected routes
  if (!session) {
    throw new Error('Unauthorized: session missing. Check auth middleware.');
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-gray-50/50 relative">
        <Sidebar />
        {/* Content wrapper needs to be offset by sidebar width and use remaining space */}
        <div
          className="flex flex-col min-w-0 transition-all duration-300"
          style={{
            marginLeft: 'var(--sidebar-width)',
            width: 'calc(100vw - var(--sidebar-width))',
          }}
        >
          <Header session={session} />
          {/* Main content area with proper top padding for header */}
          <main className="flex-1 bg-gray-50/30" style={{ paddingTop: 56 }}>
            {/* Container with consistent spacing and max-width constraint */}
            <div className="w-full h-full px-6 lg:px-8 py-6 sm:py-8 lg:py-8">
              <div className="max-w-[1500px] mx-auto w-full">{children}</div>
            </div>
          </main>
        </div>
        <PnfChatbot variant="floating" />
        <InactivityWatcher role={session.user.role} />
        <SessionLifecycle />
      </div>
    </SidebarProvider>
  );
};

export default Layout;
