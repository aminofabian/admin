'use client';

import { useState, useEffect, useMemo, useId, type ReactNode } from 'react';
import { Button, Input } from '@/components/ui';
import { gamesApi } from '@/lib/api/games';
import { cn } from '@/lib/utils/formatters';
import type { Game, PlayerGame } from '@/types';

export type AddGameDashboardPayload = {
  username: string;
  password: string;
  code: string;
  user_id: number;
};

type AddMode = 'dashboard' | 'platform';

interface AddGameDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: number;
  playerUsername: string;
  playerGames: PlayerGame[];
  /** Creates user-game row via admin API only (no game-operations queue / external game API). */
  onSubmitDashboardRecord: (data: AddGameDashboardPayload) => Promise<void>;
  /** Queues provisioning via game-operations (external game platform). */
  onSubmitGamePlatform: (data: { game_id: number }) => Promise<void>;
  isSubmitting: boolean;
}

const selectClasses =
  'w-full h-11 px-3.5 rounded-xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer';

function FieldLabel({ id, children, hint }: { id?: string; children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 dark:text-gray-200"
      >
        {children}
      </label>
      {hint ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{hint}</p>
      ) : null}
    </div>
  );
}

export function AddGameDrawer({
  isOpen,
  onClose,
  playerId,
  playerUsername,
  playerGames,
  onSubmitDashboardRecord,
  onSubmitGamePlatform,
  isSubmitting,
}: AddGameDrawerProps) {
  const modeGroupId = useId();
  const [mode, setMode] = useState<AddMode>('dashboard');
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(false);

  const [platformGameId, setPlatformGameId] = useState('');
  const [dashboardForm, setDashboardForm] = useState({ code: '', username: '', password: '' });

  const availableGames = useMemo(() => {
    const playerGameIds = new Set(playerGames.map((pg) => pg.game__id));
    return allGames.filter((game) => !playerGameIds.has(game.id));
  }, [allGames, playerGames]);

  const playerInitial = playerUsername?.charAt(0).toUpperCase() || '?';

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [isOpen, isSubmitting, onClose]);

  useEffect(() => {
    if (isOpen) {
      setPlatformGameId('');
      setDashboardForm({ code: '', username: '', password: '' });

      const fetchGames = async () => {
        setIsLoadingGames(true);
        try {
          const data = await gamesApi.list();
          const games = Array.isArray(data)
            ? data
            : data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)
              ? data.results
              : [];
          setAllGames(games);
        } catch (error) {
          console.error('Failed to fetch games:', error);
        } finally {
          setIsLoadingGames(false);
        }
      };

      void fetchGames();
    }
  }, [isOpen]);

  const selectedDashboardGame = availableGames.find((g) => g.code === dashboardForm.code);
  const isVegasSweeps =
    selectedDashboardGame?.title?.toLowerCase().includes('vegas sweeps') ||
    selectedDashboardGame?.code?.toLowerCase().includes('vegas') ||
    false;

  const handleSubmitDashboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dashboardForm.code || !dashboardForm.username) return;
    if (!isVegasSweeps && !dashboardForm.password) return;

    await onSubmitDashboardRecord({
      username: dashboardForm.username,
      password: isVegasSweeps ? '' : dashboardForm.password,
      code: dashboardForm.code,
      user_id: playerId,
    });
  };

  const handleSubmitPlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    const gameId = parseInt(platformGameId, 10);
    if (!Number.isFinite(gameId)) return;
    await onSubmitGamePlatform({ game_id: gameId });
  };

  const dashboardSubmitDisabled =
    isSubmitting ||
    !dashboardForm.code ||
    !dashboardForm.username ||
    (!isVegasSweeps && !dashboardForm.password);

  const platformSubmitDisabled = isSubmitting || !platformGameId;
  const noGamesAvailable = !isLoadingGames && availableGames.length === 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] overflow-hidden" role="dialog" aria-modal="true" aria-labelledby={`${modeGroupId}-title`}>
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity dark:bg-black/70"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 z-[110] flex w-full max-w-md flex-col bg-white shadow-2xl dark:bg-gray-900 dark:shadow-black/40 sm:max-w-lg border-l border-gray-200/80 dark:border-gray-800">
        <header className="shrink-0 border-b border-gray-100 bg-gradient-to-br from-slate-50 to-indigo-50/40 px-5 py-4 dark:border-gray-800 dark:from-gray-900 dark:to-indigo-950/25">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#4f46e5] text-white shadow-md shadow-indigo-500/25"
                aria-hidden
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 id={`${modeGroupId}-title`} className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-50">
                  Add game
                </h2>
                <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">Link a game to this player’s profile</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl p-2 text-gray-500 transition-colors hover:bg-white/80 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 disabled:opacity-40"
              disabled={isSubmitting}
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div
            className="mt-4 flex items-center gap-2 rounded-2xl bg-gray-100/90 p-1 dark:bg-gray-800/90"
            role="tablist"
            aria-label="How to add the game"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'dashboard'}
              id={`${modeGroupId}-tab-dashboard`}
              aria-controls={`${modeGroupId}-panel-dashboard`}
              onClick={() => !isSubmitting && setMode('dashboard')}
              className={cn(
                'relative flex-1 rounded-xl px-3 py-2.5 text-left transition-all',
                mode === 'dashboard'
                  ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/80 dark:bg-gray-900 dark:text-gray-50 dark:ring-gray-700'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200',
              )}
            >
              <span className="block text-sm font-semibold">Admin record</span>
              <span className="mt-0.5 block text-[11px] font-normal leading-snug text-gray-500 dark:text-gray-400">
                Save in dashboard only
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'platform'}
              id={`${modeGroupId}-tab-platform`}
              aria-controls={`${modeGroupId}-panel-platform`}
              onClick={() => !isSubmitting && setMode('platform')}
              className={cn(
                'relative flex-1 rounded-xl px-3 py-2.5 text-left transition-all',
                mode === 'platform'
                  ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/80 dark:bg-gray-900 dark:text-gray-50 dark:ring-gray-700'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200',
              )}
            >
              <span className="block text-sm font-semibold">Live setup</span>
              <span className="mt-0.5 block text-[11px] font-normal leading-snug text-gray-500 dark:text-gray-400">
                Queue on game platform
              </span>
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-800/40">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-semibold text-[#6366f1] shadow-sm dark:bg-gray-900 dark:text-indigo-400">
                {playerInitial}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Player</p>
                <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{playerUsername}</p>
              </div>
            </div>

            {mode === 'dashboard' ? (
              <div
                id={`${modeGroupId}-panel-dashboard`}
                role="tabpanel"
                aria-labelledby={`${modeGroupId}-tab-dashboard`}
                className="space-y-5"
              >
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-3.5 py-3 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/35 dark:text-blue-100/90">
                  <p className="font-medium">Local record</p>
                  <p className="mt-1 text-xs leading-relaxed text-blue-800/90 dark:text-blue-200/80">
                    Stores credentials in admin. Does not call the external game API or the provisioning queue.
                  </p>
                </div>

                <form id="add-game-dashboard-form" onSubmit={handleSubmitDashboard} className="space-y-5" autoComplete="off">
                  <div className="space-y-2">
                    <FieldLabel id="add-game-dash-select" hint="Games already on this player are hidden.">
                      Game<span className="ml-0.5 text-red-500">*</span>
                    </FieldLabel>
                    {isLoadingGames ? (
                      <div className="flex h-11 items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        <svg className="h-5 w-5 animate-spin text-[#6366f1]" fill="none" viewBox="0 0 24 24" aria-hidden>
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                        </svg>
                      </div>
                    ) : (
                      <select
                        id="add-game-dash-select"
                        value={dashboardForm.code}
                        onChange={(e) => setDashboardForm((prev) => ({ ...prev, code: e.target.value }))}
                        className={selectClasses}
                        disabled={isSubmitting || noGamesAvailable}
                        required
                      >
                        <option value="">Select a game…</option>
                        {noGamesAvailable ? (
                          <option value="" disabled>
                            No remaining games for this player
                          </option>
                        ) : null}
                        {availableGames.map((game) => (
                          <option key={game.id} value={game.code}>
                            {game.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <FieldLabel id="add-game-dash-user" hint="Stored on the user-game record.">
                      Game username<span className="ml-0.5 text-red-500">*</span>
                    </FieldLabel>
                    <Input
                      id="add-game-dash-user"
                      type="text"
                      value={dashboardForm.username}
                      onChange={(e) => setDashboardForm((prev) => ({ ...prev, username: e.target.value }))}
                      placeholder="e.g. player_game_login"
                      disabled={isSubmitting}
                      required
                      autoComplete="off"
                    />
                  </div>

                  {isVegasSweeps && dashboardForm.code ? (
                    <p className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100/90">
                      This game does not require a password here.
                    </p>
                  ) : null}

                  {!isVegasSweeps ? (
                    <div className="space-y-2">
                      <FieldLabel id="add-game-dash-pass" hint="Saved with this user-game record.">
                        Game password<span className="ml-0.5 text-red-500">*</span>
                      </FieldLabel>
                      <Input
                        id="add-game-dash-pass"
                        type="password"
                        value={dashboardForm.password}
                        onChange={(e) => setDashboardForm((prev) => ({ ...prev, password: e.target.value }))}
                        placeholder="••••••••"
                        disabled={isSubmitting}
                        required
                        autoComplete="new-password"
                      />
                    </div>
                  ) : null}
                </form>
              </div>
            ) : (
              <div
                id={`${modeGroupId}-panel-platform`}
                role="tabpanel"
                aria-labelledby={`${modeGroupId}-tab-platform`}
                className="space-y-5"
              >
                <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-3.5 py-3 text-sm text-violet-950 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-100/90">
                  <p className="font-medium">Provisioning queue</p>
                  <p className="mt-1 text-xs leading-relaxed text-violet-900/85 dark:text-violet-200/75">
                    Sends a job to create or link the account on the real game platform. Processing continues in the background—check
                    queues or activity if something fails.
                  </p>
                </div>

                <form id="add-game-platform-form" onSubmit={handleSubmitPlatform} className="space-y-5" autoComplete="off">
                  <div className="space-y-2">
                    <FieldLabel id="add-game-plat-select" hint="Pick which platform game to provision.">
                      Game<span className="ml-0.5 text-red-500">*</span>
                    </FieldLabel>
                    {isLoadingGames ? (
                      <div className="flex h-11 items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        <svg className="h-5 w-5 animate-spin text-[#6366f1]" fill="none" viewBox="0 0 24 24" aria-hidden>
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                        </svg>
                      </div>
                    ) : (
                      <select
                        id="add-game-plat-select"
                        value={platformGameId}
                        onChange={(e) => setPlatformGameId(e.target.value)}
                        className={selectClasses}
                        disabled={isSubmitting || noGamesAvailable}
                        required
                      >
                        <option value="">Select a game…</option>
                        {noGamesAvailable ? (
                          <option value="" disabled>
                            No remaining games for this player
                          </option>
                        ) : null}
                        {availableGames.map((game) => (
                          <option key={game.id} value={String(game.id)}>
                            {game.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </form>
              </div>
            )}
          </div>

          <footer className="shrink-0 border-t border-gray-100 bg-white/95 px-5 py-4 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto">
                Cancel
              </Button>
              {mode === 'dashboard' ? (
                <Button
                  type="submit"
                  form="add-game-dashboard-form"
                  variant="primary"
                  size="md"
                  disabled={dashboardSubmitDisabled}
                  isLoading={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Save record
                </Button>
              ) : (
                <Button
                  type="submit"
                  form="add-game-platform-form"
                  variant="primary"
                  size="md"
                  disabled={platformSubmitDisabled}
                  isLoading={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Queue provisioning
                </Button>
              )}
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
