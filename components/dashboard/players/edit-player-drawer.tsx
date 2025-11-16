'use client';

import { Button, Input } from '@/components/ui';

interface EditPlayerDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  editableFields: {
    email: string;
    full_name: string;
    dob: string;
    state: string;
    mobile_number: string;
  };
  setEditableFields: React.Dispatch<React.SetStateAction<{
    email: string;
    full_name: string;
    dob: string;
    state: string;
    mobile_number: string;
  }>>;
  isSaving: boolean;
  onSave: () => void;
}

export function EditPlayerDetailsDrawer({
  isOpen,
  onClose,
  editableFields,
  setEditableFields,
  isSaving,
  onSave,
}: EditPlayerDetailsDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden transition-opacity duration-300">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isSaving && onClose()}
      />
      
      {/* Drawer Panel */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full sm:max-w-md bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl transition-transform duration-300 ease-in-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Drawer Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Edit Player Details</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Update player information</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            disabled={isSaving}
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-6 space-y-5 overflow-y-auto h-[calc(100vh-140px)]">
          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Email
            </label>
            <Input
              type="email"
              value={editableFields.email}
              onChange={(e) => setEditableFields(prev => ({ ...prev, email: e.target.value }))}
              className="w-full"
              disabled={isSaving}
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Full Name
            </label>
            <Input
              type="text"
              value={editableFields.full_name}
              onChange={(e) => setEditableFields(prev => ({ ...prev, full_name: e.target.value }))}
              className="w-full"
              disabled={isSaving}
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Date of Birth
            </label>
            <Input
              type="date"
              value={editableFields.dob}
              onChange={(e) => setEditableFields(prev => ({ ...prev, dob: e.target.value }))}
              className="w-full"
              disabled={isSaving}
            />
          </div>

          {/* State */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              State
            </label>
            <Input
              type="text"
              value={editableFields.state}
              onChange={(e) => setEditableFields(prev => ({ ...prev, state: e.target.value }))}
              className="w-full"
              disabled={isSaving}
            />
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Mobile Number
            </label>
            <Input
              type="tel"
              value={editableFields.mobile_number}
              onChange={(e) => setEditableFields(prev => ({ ...prev, mobile_number: e.target.value }))}
              className="w-full"
              disabled={isSaving}
            />
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onSave}
            disabled={isSaving}
            isLoading={isSaving}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

