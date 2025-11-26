'use client';

import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from './sidebar';
import { TopNavigation } from './top-navigation';
import { MobileBottomNav } from './mobile-bottom-nav';
import { LoadingState } from '@/components/features';
import { ChatDrawerProvider } from '@/contexts/chat-drawer-context';
import { ProcessingWebSocketProvider } from '@/contexts/processing-websocket-context';
import { ChatDrawer } from '@/components/chat/chat-drawer';
import { GlobalTransactionNotifications } from '@/components/dashboard/global-transaction-notifications';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isSuperAdmin = user?.role === 'superadmin';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (!isAuthenticated) {
    return null;
  }

  const content = (
    <ProcessingWebSocketProvider>
      <GlobalTransactionNotifications />
      <div className="flex min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar - Mobile/Tablet: hidden by default, Desktop: w-56 on xl+ */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 lg:w-56 h-screen transform transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content - Mobile App Style */}
      <div className="flex-1 flex flex-col w-full">
        <TopNavigation onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 lg:p-4 xl:p-6 bg-gradient-to-b from-background to-background/50 pb-20 lg:pb-4">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Chat Drawer - Hidden for superadmin */}
      {!isSuperAdmin && <ChatDrawer />}
    </div>
    </ProcessingWebSocketProvider>
  );

  // Only wrap with ChatDrawerProvider if not superadmin
  if (isSuperAdmin) {
    return content;
  }

  return (
    <ChatDrawerProvider>
      {content}
    </ChatDrawerProvider>
  );
}

