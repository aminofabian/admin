'use client';

import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Welcome, {user?.username}
          </h2>
          <p className="text-sm text-gray-600 capitalize">
            Role: {user?.role}
          </p>
        </div>
        <Button variant="ghost" onClick={logout}>
          Logout
        </Button>
      </div>
    </header>
  );
}

