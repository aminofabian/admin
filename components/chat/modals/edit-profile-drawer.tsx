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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 dark:bg-black/80"
        onClick={() => !isUpdating && onClose()}
        aria-hidden="true"
      />
      
      {/* Drawer Panel */}
      <div 
        className={`fixed inset-y-0 right-0 z-[60] w-full sm:max-w-lg bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl transition-transform duration-300 ease-in-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex h-full flex-col">
          {/* Drawer Header */}
          <div className="sticky top-0 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border-b border-gray-200 dark:border-gray-800 px-6 py-5 flex items-center justify-between z-10 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Edit Profile Details</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Update profile information</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200 hover:rotate-90 disabled:opacity-50"
              disabled={isUpdating}
              aria-label="Close drawer"
            >
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24 md:pb-6">
            {/* Username */}
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Username
              </label>
              <Input
                type="text"
                value={profileFormData.username}
                onChange={(e) => setProfileFormData(prev => ({ ...prev, username: e.target.value }))}
                className="w-full transition-all focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                disabled={isUpdating}
              />
            </div>

            {/* Full Name */}
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Full name
              </label>
              <Input
                type="text"
                value={profileFormData.full_name}
                onChange={(e) => setProfileFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className="w-full transition-all focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                disabled={isUpdating}
              />
            </div>

            {/* DOB */}
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Date of Birth
              </label>
              <Input
                type="date"
                value={profileFormData.dob}
                onChange={(e) => setProfileFormData(prev => ({ ...prev, dob: e.target.value }))}
                className="w-full transition-all focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                disabled={isUpdating}
              />
            </div>

            {/* Email */}
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Address
              </label>
              <Input
                type="email"
                value={profileFormData.email}
                onChange={(e) => setProfileFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full transition-all focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                disabled={isUpdating}
              />
            </div>

            {/* Password */}
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Password
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">(leave blank to keep current)</span>
              </label>
              <Input
                type="password"
                value={profileFormData.password}
                onChange={(e) => setProfileFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter new password"
                className="w-full transition-all focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                disabled={isUpdating}
              />
            </div>

            {/* Confirm Password */}
            {profileFormData.password && (
              <div className="group">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Confirm Password
                </label>
                <Input
                  type="password"
                  value={profileFormData.confirmPassword}
                  onChange={(e) => setProfileFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className={`w-full transition-all focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                    profileFormData.password && profileFormData.confirmPassword && profileFormData.password !== profileFormData.confirmPassword
                      ? 'border-red-500 dark:border-red-400'
                      : ''
                  }`}
                  disabled={isUpdating}
                  placeholder="Confirm new password"
                />
                {profileFormData.password && profileFormData.confirmPassword && profileFormData.password !== profileFormData.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">Passwords do not match</p>
                )}
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="sticky bottom-0 z-10 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-5 flex items-center justify-end gap-3 shadow-lg">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isUpdating}
              className="px-6 py-2.5 font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onUpdate}
              disabled={isUpdating}
              isLoading={isUpdating}
              className="px-6 py-2.5 font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
