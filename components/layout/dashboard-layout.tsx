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
import { isSuperadminDomain } from '@/lib/utils/domain';
import { useToast } from '@/components/ui';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const isSuperAdmin = user?.role === 'superadmin';

  // Check if superadmin is on wrong domain
  useEffect(() => {
    if (user?.role === 'superadmin' && !isSuperadminDomain()) {
      addToast({
        type: 'error',
        title: 'Access Restricted',
        description: 'Access restricted. Superadmin login is only allowed from authorized domains.',
        duration: 7000,
      });
      logout();
      router.push('/login');
    }
  }, [user, logout, router, addToast]);

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
        fixed lg:static inset-y-0 left-0 z-50 h-screen transform transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isSidebarCollapsed ? 'lg:w-0' : 'w-64 lg:w-56'}
      `}>
        <Sidebar 
          onClose={() => setSidebarOpen(false)} 
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Main content - Mobile App Style */}
      <div className="flex-1 flex flex-col w-full">
        <TopNavigation 
          onMenuClick={() => setSidebarOpen(true)} 
        />
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

