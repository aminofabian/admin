'use client';

import { RefreshCw } from 'lucide-react';
import { ConfirmModal } from '@/components/ui';
import { GameApiVersionPicker } from '@/components/superadmin/game-api-version-picker';
import { useCategory2GameApi } from '@/hooks/use-category2-game-api';
import { GAME_API_VERSIONS, type GameApiVersion } from '@/lib/constants/game-api-version';

const STATUS_DOT_STYLES: Record<GameApiVersion, string> = {
  [GAME_API_VERSIONS.V1]: 'bg-amber-500',
  [GAME_API_VERSIONS.V2]: 'bg-emerald-500',
};

const SWITCH_REASONS: Record<GameApiVersion, string> = {
  [GAME_API_VERSIONS.V1]: 'Use this while API v2 is down or under maintenance.',
  [GAME_API_VERSIONS.V2]: 'Use this once API v2 is working again.',
};

function StatusLine({ activeVersion, isLoading, error, onRetry }: {
  activeVersion: GameApiVersion | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <p className="text-xs text-red-600 dark:text-red-400">
        {error}.{' '}
        <button type="button" onClick={onRetry} className="font-medium underline">
          Retry
        </button>
      </p>
    );
  }
  if (isLoading || !activeVersion) {
    return <p className="text-xs text-gray-500 dark:text-gray-400">Checking current API…</p>;
  }
  return (
    <p className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
      <span className={`h-2 w-2 rounded-full ${STATUS_DOT_STYLES[activeVersion]}`} aria-hidden />
      <span>
        Live on <span className="font-semibold text-gray-900 dark:text-gray-100">API {activeVersion}</span> for
        category 2 games on every company
      </span>
    </p>
  );
}

export function Category2GameApiToggle() {
  const api = useCategory2GameApi();
  const pending = api.pendingVersion;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Category 2 game API</h2>
        <StatusLine activeVersion={api.activeVersion} isLoading={api.isLoading} error={api.error} onRetry={api.reload} />
      </div>

      <div className="flex items-center gap-2">
        <GameApiVersionPicker
          activeVersion={api.activeVersion}
          disabled={api.isLoading || api.isSaving || Boolean(api.error)}
          onSelect={api.requestVersion}
        />
        <button
          type="button"
          onClick={api.reload}
          disabled={api.isLoading || api.isSaving}
          title="Refresh current API"
          aria-label="Refresh current API"
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 dark:hover:bg-gray-700 dark:hover:text-gray-100"
        >
          <RefreshCw className={`h-4 w-4 ${api.isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <ConfirmModal
        isOpen={pending !== null}
        onClose={api.cancelRequest}
        onConfirm={() => void api.confirmRequest()}
        title={`Switch category 2 games to API ${pending ?? ''}?`}
        description={pending ? `Category 2 games on every company will launch through API ${pending}. ${SWITCH_REASONS[pending]}` : ''}
        confirmText={`Switch to API ${pending ?? ''}`}
        variant="warning"
        isLoading={api.isSaving}
      />
    </div>
  );
}
