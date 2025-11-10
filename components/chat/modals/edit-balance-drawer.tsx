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
  return (
    <div className={`fixed inset-0 z-[60] overflow-hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
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
          <h2 className="text-lg font-bold text-foreground">Edit Balance</h2>
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
        <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-73px)]">
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

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <Button
              variant="primary"
              onClick={() => onUpdate('increase')}
              disabled={isUpdating || balanceValue <= 0}
              className="w-full"
            >
              {isUpdating ? (
                <svg className="w-5 h-5 mx-auto animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                  <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4" strokeLinecap="round" />
                </svg>
              ) : (
                'Topup'
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={() => onUpdate('decrease')}
              disabled={isUpdating || balanceValue <= 0}
              className="w-full"
            >
              {isUpdating ? (
                <svg className="w-5 h-5 mx-auto animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                  <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4" strokeLinecap="round" />
                </svg>
              ) : (
                'Withdraw'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
