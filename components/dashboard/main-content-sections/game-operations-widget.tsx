'use client';

export function GameOperationsWidget() {
  // Mock data for game operations queue
  const operations = {
    recharge: { pending: 8, failed: 2, completed_today: 145 },
    redeem: { pending: 5, failed: 1, completed_today: 98 },
    add_user_game: { pending: 3, failed: 0, completed_today: 12 },
  };

  const totalPending = operations.recharge.pending + operations.redeem.pending + operations.add_user_game.pending;
  const totalFailed = operations.recharge.failed + operations.redeem.failed + operations.add_user_game.failed;
  const totalCompleted = operations.recharge.completed_today + operations.redeem.completed_today + operations.add_user_game.completed_today;

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">
          Game Operations Queue
        </h3>
        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {totalPending}
          </div>
          <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
            Pending
          </div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {totalFailed}
          </div>
          <div className="text-xs text-red-600 dark:text-red-400 font-medium">
            Failed
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {totalCompleted}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 font-medium">
            Completed Today
          </div>
        </div>
      </div>

      {/* Operation Types */}
      <div className="space-y-3">
        {/* Recharge Operations */}
        <div className="border border-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="font-medium text-foreground">
                Recharge Game
              </span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <span className="text-yellow-600 dark:text-yellow-400">
                {operations.recharge.pending} pending
              </span>
              {operations.recharge.failed > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  {operations.recharge.failed} failed
                </span>
              )}
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(operations.recharge.completed_today / (operations.recharge.completed_today + operations.recharge.pending)) * 100}%` }}
            />
          </div>
        </div>

        {/* Redeem Operations */}
        <div className="border border-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium text-foreground">
                Redeem Game
              </span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <span className="text-yellow-600 dark:text-yellow-400">
                {operations.redeem.pending} pending
              </span>
              {operations.redeem.failed > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  {operations.redeem.failed} failed
                </span>
              )}
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(operations.redeem.completed_today / (operations.redeem.completed_today + operations.redeem.pending)) * 100}%` }}
            />
          </div>
        </div>

        {/* Add User Game Operations */}
        <div className="border border-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span className="font-medium text-foreground">
                Add User Game
              </span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <span className="text-yellow-600 dark:text-yellow-400">
                {operations.add_user_game.pending} pending
              </span>
              {operations.add_user_game.failed > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  {operations.add_user_game.failed} failed
                </span>
              )}
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(operations.add_user_game.completed_today / (operations.add_user_game.completed_today + operations.add_user_game.pending)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Queue Health Indicator */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Queue Health
          </span>
          <div className="flex items-center space-x-2">
            {totalFailed > 5 ? (
              <>
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                  Needs Attention
                </span>
              </>
            ) : totalPending > 10 ? (
              <>
                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  Processing
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  Healthy
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

