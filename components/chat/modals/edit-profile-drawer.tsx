'use client';

import { Button, Input } from '@/components/ui';

interface EditProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profileFormData: {
    username: string;
    full_name: string;
    dob: string;
    email: string;
    password: string;
    confirmPassword: string;
  };
  setProfileFormData: React.Dispatch<React.SetStateAction<{
    username: string;
    full_name: string;
    dob: string;
    email: string;
    password: string;
    confirmPassword: string;
  }>>;
  isUpdating: boolean;
  onUpdate: () => void;
}

export function EditProfileDrawer({
  isOpen,
  onClose,
  profileFormData,
  setProfileFormData,
  isUpdating,
  onUpdate,
}: EditProfileDrawerProps) {
  return (
    <div className={`fixed inset-0 z-[60] overflow-hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isUpdating && onClose()}
      />
      
      {/* Drawer Panel */}
      <div 
        className={`fixed inset-y-0 right-0 z-[60] w-full sm:max-w-md bg-card border-l border-border shadow-2xl transition-transform duration-300 ease-in-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex h-full flex-col">
          {/* Drawer Header */}
          <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Edit Profile Details</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded-lg transition-colors"
              disabled={isUpdating}
            >
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-24 md:pb-6">
          {/* Username */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Username
            </label>
            <Input
              type="text"
              value={profileFormData.username}
              onChange={(e) => setProfileFormData(prev => ({ ...prev, username: e.target.value }))}
              className="w-full"
              disabled={isUpdating}
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Full name
            </label>
            <Input
              type="text"
              value={profileFormData.full_name}
              onChange={(e) => setProfileFormData(prev => ({ ...prev, full_name: e.target.value }))}
              className="w-full"
              disabled={isUpdating}
            />
          </div>

          {/* DOB */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              DOB
            </label>
            <Input
              type="date"
              value={profileFormData.dob}
              onChange={(e) => setProfileFormData(prev => ({ ...prev, dob: e.target.value }))}
              className="w-full"
              disabled={isUpdating}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Email
            </label>
            <Input
              type="email"
              value={profileFormData.email}
              onChange={(e) => setProfileFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full"
              disabled={isUpdating}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Password
            </label>
            <Input
              type="password"
              value={profileFormData.password}
              onChange={(e) => setProfileFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Leave blank to keep current password"
              className="w-full"
              disabled={isUpdating}
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Confirm Password
            </label>
            <Input
              type="password"
              value={profileFormData.confirmPassword}
              onChange={(e) => setProfileFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Confirm new password"
              className="w-full"
              disabled={isUpdating}
            />
          </div>

          </div>

          {/* Sticky Footer with Save Button */}
          <div className="sticky bottom-0 z-10 bg-card border-t border-border px-6 py-4 shadow-lg">
            <Button
              variant="primary"
              className="w-full"
              onClick={onUpdate}
              disabled={isUpdating}
              isLoading={isUpdating}
            >
              {isUpdating ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
