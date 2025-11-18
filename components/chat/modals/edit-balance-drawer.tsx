'use client';

import { Button, Input } from '@/components/ui';

interface EditBalanceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  balanceValue: number;
  setBalanceValue: React.Dispatch<React.SetStateAction<number>>;
  balanceType: 'main' | 'winning';
  setBalanceType: React.Dispatch<React.SetStateAction<'main' | 'winning'>>;
  isUpdating: boolean;
  onUpdate: (operation: 'increase' | 'decrease') => void;
}

export function EditBalanceDrawer({
  isOpen,
  onClose,
  balanceValue,
  setBalanceValue,
  balanceType,
  setBalanceType,
  isUpdating,
  onUpdate,
}: EditBalanceDrawerProps) {
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Edit Balance</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Adjust player balance</p>
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
          {/* Balance Display with +/- Buttons */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setBalanceValue(prev => Math.max(0, prev - 1))}
              className="w-14 h-14 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-foreground text-2xl font-semibold transition-colors"
              disabled={isUpdating}
            >
              -
            </button>
            <div className="text-5xl font-bold text-primary min-w-[120px] text-center">
              {balanceValue}
            </div>
            <button
              onClick={() => setBalanceValue(prev => prev + 1)}
              className="w-14 h-14 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-foreground text-2xl font-semibold transition-colors"
              disabled={isUpdating}
            >
              +
            </button>
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              Quick Amounts
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 15, 20].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setBalanceValue(amount)}
                  className="py-3 px-4 border-2 border-primary/20 hover:border-primary rounded-lg text-primary font-semibold transition-colors"
                  disabled={isUpdating}
                >
                  ${amount}
                </button>
              ))}
            </div>
          </div>

          {/* Manual Amount Entry */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Manual Amount
            </label>
            <Input
              type="number"
              value={balanceValue === 0 ? '' : balanceValue}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setBalanceValue(0);
                } else {
                  setBalanceValue(Math.max(0, parseFloat(val) || 0));
                }
              }}
              placeholder="Enter amount"
              className="w-full"
              disabled={isUpdating}
              min="0"
              step="1"
            />
          </div>

          {/* Balance Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              Balance Type
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer flex-1 p-3 border-2 rounded-lg transition-colors hover:bg-muted/50" 
                style={{ borderColor: balanceType === 'main' ? 'rgb(34, 197, 94)' : 'transparent' }}>
                <input
                  type="radio"
                  name="balanceType"
                  checked={balanceType === 'main'}
                  onChange={() => setBalanceType('main')}
                  className="w-4 h-4 text-green-500 border-gray-300 focus:ring-green-500"
                  disabled={isUpdating}
                />
                <span className="text-sm font-medium text-foreground">Main Balance</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer flex-1 p-3 border-2 rounded-lg transition-colors hover:bg-muted/50"
                style={{ borderColor: balanceType === 'winning' ? 'rgb(234, 179, 8)' : 'transparent' }}>
                <input
                  type="radio"
                  name="balanceType"
                  checked={balanceType === 'winning'}
                  onChange={() => setBalanceType('winning')}
                  className="w-4 h-5 text-yellow-500 border-gray-300 focus:ring-yellow-500"
                  disabled={isUpdating}
                />
                <span className="text-sm font-medium text-foreground">Winning Balance</span>
              </label>
            </div>
          </div>

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
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => onUpdate('decrease')}
                disabled={isUpdating || balanceValue <= 0}
                isLoading={isUpdating}
                className="px-6 py-2.5 font-semibold"
              >
                Withdraw
              </Button>
              <Button
                variant="primary"
                onClick={() => onUpdate('increase')}
                disabled={isUpdating || balanceValue <= 0}
                isLoading={isUpdating}
                className="px-6 py-2.5 font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                Topup
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
