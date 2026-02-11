'use client';

import { Button, Input, PasswordInput, ConfirmPasswordInput, DateSelect } from '@/components/ui';

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
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
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
            <form autoComplete="off" className="space-y-6">
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
                  disabled={true}
                  autoComplete="off"
                  readOnly
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
              {showDob && (
                <div className="group">
                  <DateSelect
                    label="Date of Birth"
                    value={profileFormData.dob}
                    onChange={(value) => setProfileFormData(prev => ({ ...prev, dob: value }))}
                    disabled={isUpdating}
                  />
                </div>
              )}

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
                <PasswordInput
                  label="Password"
                  value={profileFormData.password}
                  onChange={(value) => setProfileFormData(prev => ({ ...prev, password: value }))}
                  placeholder="Enter new password (leave blank to keep current)"
                  disabled={isUpdating}
                  className="w-full transition-all focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  autoComplete="new-password"
                  showRequirements={!!profileFormData.password}
                />
              </div>

              {/* Confirm Password */}
              {profileFormData.password && (
                <div className="group">
                  <ConfirmPasswordInput
                    label="Confirm Password"
                    value={profileFormData.confirmPassword}
                    password={profileFormData.password}
                    onChange={(value) => setProfileFormData(prev => ({ ...prev, confirmPassword: value }))}
                    placeholder="Confirm new password"
                    disabled={isUpdating}
                    className="w-full transition-all focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    autoComplete="new-password"
                  />
                </div>
              )}

              {/* Active/Inactive Toggle */}
              <div className="group">
                <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Account Status
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {profileFormData.is_active ? 'User account is active' : 'User account is inactive'}
                      </p>
                    </div>
                  </div>
                  <div className="relative">
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
            </form>
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

