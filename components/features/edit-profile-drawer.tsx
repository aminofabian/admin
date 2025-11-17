'use client';

import { Button, Input } from '@/components/ui';

export interface EditProfileFormData {
  username: string;
  full_name: string;
  dob: string;
  email: string;
  password: string;
  confirmPassword: string;
  is_active: boolean;
}

interface EditProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profileFormData: EditProfileFormData;
  setProfileFormData: React.Dispatch<React.SetStateAction<EditProfileFormData>>;
  isUpdating: boolean;
  onUpdate: () => void;
  title?: string;
  showDob?: boolean;
}

export function EditProfileDrawer({
  isOpen,
  onClose,
  profileFormData,
  setProfileFormData,
  isUpdating,
  onUpdate,
  title = 'Edit Profile Details',
  showDob = true,
}: EditProfileDrawerProps) {
  return (
    <div className={`fixed inset-0 z-50 overflow-hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isUpdating && onClose()}
      />
      
      {/* Drawer Panel */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full sm:max-w-md bg-card border-l border-border shadow-2xl transition-transform duration-300 ease-in-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Drawer Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
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
        <div className="p-6 space-y-4 overflow-y-auto h-[calc(100vh-73px)]">
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
          {showDob && (
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
          )}

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

          {/* Activate/Deactivate Toggle */}
          <div className="pt-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-sm font-semibold text-foreground mb-1">
                  Account Status
                </span>
                <span className="text-xs text-muted-foreground">
                  {profileFormData.is_active ? 'User is active and can access the system' : 'User is inactive and cannot access the system'}
                </span>
              </div>
              <div className="relative ml-4">
                <input
                  type="checkbox"
                  id="account-status-toggle"
                  checked={profileFormData.is_active}
                  onChange={(e) => !isUpdating && setProfileFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  disabled={isUpdating}
                  className="sr-only"
                />
                <label
                  htmlFor="account-status-toggle"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out ${
                    profileFormData.is_active
                      ? 'bg-emerald-500 dark:bg-emerald-600'
                      : 'bg-gray-300 dark:bg-gray-600'
                  } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out pointer-events-none ${
                      profileFormData.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <Button
            variant="primary"
            className="w-full mt-6"
            onClick={onUpdate}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <>
                <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                  <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4" strokeLinecap="round" />
                </svg>
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

