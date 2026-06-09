'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { agentsApi, transactionsApi } from '@/lib/api';
import { Badge, Button, useToast } from '@/components/ui';
import { ErrorState, LoadingState } from '@/components/features';
import { formatCurrency, formatDate, formatPercentageOrEmpty } from '@/lib/utils/formatters';
import { dashboardPaths } from '@/lib/constants/dashboard-paths';
import {
  AGENT_DETAIL_LABELS,
  AGENT_DETAIL_TOAST,
  AGENT_TRANSACTION_PREVIEW_PAGE_SIZE,
  EXTERNAL_LINK_WINDOW_FEATURES,
} from '@/lib/constants/agent-detail';
import { getAccountStatusPresentation } from '@/lib/constants/account-status';
import { USER_ROLE_LABELS } from '@/lib/constants/roles';
import type { Agent, AgentDashboardResponse, AgentDashboardStats } from '@/types';

type AgentWithAffiliate = Agent & {
  affiliation_percentage?: string;
  payment_method_fee_percentage?: string;
  affiliation_fee_percentage?: string;
  affiliate_link?: string;
};

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const agentId = useMemo(() => {
    const raw = params?.id;
    const idStr = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
    const n = idStr ? parseInt(idStr, 10) : NaN;
    return Number.isFinite(n) ? n : null;
  }, [params?.id]);

  const [agent, setAgent] = useState<AgentWithAffiliate | null>(null);
  const [stats, setStats] = useState<AgentDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (agentId == null) {
      setIsLoading(false);
      setError(AGENT_DETAIL_LABELS.errInvalidId);
      return;
    }

    const id = agentId;
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        setError(null);
        const [agentRes, statsRes] = await Promise.all([
          agentsApi.get(id),
          agentsApi.getStats(id).catch(() => null),
        ]);
        if (!cancelled) {
          setAgent(agentRes as AgentWithAffiliate);
          setStats(statsRes);
        }
      } catch (err) {
        if (!cancelled) {
          setAgent(null);
          setStats(null);
          setError(err instanceof Error ? err.message : AGENT_DETAIL_LABELS.errFailedLoad);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  const handleBack = useCallback(() => {
    router.push(dashboardPaths.agentsRoot());
  }, [router]);

  const copyAffiliateLink = useCallback(async () => {
    if (!agent?.affiliate_link) return;
    try {
      await navigator.clipboard.writeText(agent.affiliate_link);
      addToast({
        type: 'success',
        title: AGENT_DETAIL_TOAST.copyAffiliateSuccess.title,
        description: AGENT_DETAIL_TOAST.copyAffiliateSuccess.description,
      });
    } catch {
      addToast({
        type: 'error',
        title: AGENT_DETAIL_TOAST.copyAffiliateError.title,
        description: AGENT_DETAIL_TOAST.copyAffiliateError.description,
      });
    }
  }, [agent?.affiliate_link, addToast]);

  const openAffiliateExternally = useCallback(() => {
    if (!agent?.affiliate_link) return;
    window.open(agent.affiliate_link, '_blank', EXTERNAL_LINK_WINDOW_FEATURES);
  }, [agent?.affiliate_link]);

  const navigateToFilteredPlayers = useCallback(() => {
    if (!agent) return;
    router.push(dashboardPaths.playersWithAgentUsernameQuery(agent.username));
  }, [agent, router]);

  const navigateToFilteredTransactions = useCallback(async () => {
    if (!agent) return;
    try {
      const response = await transactionsApi.list({
        agent: agent.username,
        agent_id: agent.id,
        page: 1,
        page_size: AGENT_TRANSACTION_PREVIEW_PAGE_SIZE,
      });
      if (response.count === 0) {
        addToast({
          type: 'info',
          title: AGENT_DETAIL_TOAST.noTransactions.title,
          description: AGENT_DETAIL_TOAST.noTransactions.description,
        });
        return;
      }
      router.push(dashboardPaths.transactionsWithAgentUsernameQuery(agent.username));
    } catch {
      addToast({
        type: 'error',
        title: AGENT_DETAIL_TOAST.transactionsCheckError.title,
        description: AGENT_DETAIL_TOAST.transactionsCheckError.description,
      });
    }
  }, [agent, router, addToast]);

  if (agentId == null) {
    return (
      <ErrorState
        message={AGENT_DETAIL_LABELS.errInvalidId}
        onRetry={() => router.push(dashboardPaths.agentsRoot())}
      />
    );
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !agent) {
    return (
      <ErrorState
        message={error || AGENT_DETAIL_LABELS.errNotFound}
        onRetry={() => router.push(dashboardPaths.agentsRoot())}
      />
    );
  }

  const usernameInitial = agent.username ? agent.username.charAt(0).toUpperCase() : '?';
  const status = getAccountStatusPresentation(agent.is_active);
  const s = stats?.agent_stats;
  const roleLabel = USER_ROLE_LABELS[agent.role] ?? agent.role;

  const accountRows: Array<{ label: string; value: string }> = [
    { label: AGENT_DETAIL_LABELS.fieldEmail, value: agent.email },
    { label: AGENT_DETAIL_LABELS.fieldUsername, value: agent.username },
    { label: AGENT_DETAIL_LABELS.fieldRole, value: roleLabel },
    { label: AGENT_DETAIL_LABELS.fieldCreated, value: formatDate(agent.created) },
    { label: AGENT_DETAIL_LABELS.fieldModified, value: formatDate(agent.modified) },
    {
      label: AGENT_DETAIL_LABELS.fieldAffiliateCommission,
      value: formatPercentageOrEmpty(agent.affiliation_percentage),
    },
    {
      label: AGENT_DETAIL_LABELS.fieldPaymentMethodFee,
      value: formatPercentageOrEmpty(agent.payment_method_fee_percentage),
    },
    {
      label: AGENT_DETAIL_LABELS.fieldSystemFee,
      value: formatPercentageOrEmpty(agent.affiliation_fee_percentage),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm dark:border-gray-800 dark:bg-gray-900/95 safe-area-top">
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-2 sm:py-2.5 md:py-3 lg:py-4">
            <button
              type="button"
              onClick={handleBack}
              className="p-1.5 -ml-1.5 sm:p-2 sm:-ml-2 text-gray-500 transition-colors active:bg-gray-100 active:text-gray-700 dark:text-gray-400 dark:active:bg-gray-800 dark:active:text-gray-200 rounded-lg touch-manipulation"
              aria-label={AGENT_DETAIL_LABELS.ariaBack}
            >
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 flex-1 min-w-0">
              <div
                className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 lg:h-12 lg:w-12 shrink-0 items-center justify-center rounded-full bg-gray-700 dark:bg-gray-600 text-white font-bold shadow-md text-xs sm:text-sm md:text-base"
                aria-hidden
              >
                {usernameInitial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
                  <span className="text-sm sm:text-base md:text-lg font-bold text-gray-900 dark:text-gray-100 lg:text-xl truncate capitalize">
                    {agent.username}
                  </span>
                  <span className="hidden sm:inline-flex items-center justify-center h-4 sm:h-5 px-1 sm:px-1.5 text-[9px] sm:text-[10px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shrink-0 rounded">
                    #{agent.id}
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 mt-0.5">
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                    {agent.email || AGENT_DETAIL_LABELS.subtitleFallback}
                  </p>
                  {agent.created ? (
                    <>
                      <span className="text-gray-300 dark:text-gray-600 text-[9px] shrink-0">•</span>
                      <p className="text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-500 leading-none shrink-0">
                        {formatDate(agent.created)}
                      </p>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 pb-safe">
        <div className="mb-3 sm:mb-4 md:mb-6 bg-gray-100 dark:bg-gray-900 p-2 sm:p-4 md:p-6 shadow-lg border border-gray-200 dark:border-gray-800 rounded-lg">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:grid-cols-4">
            {s ? (
              <>
                <DetailHeroStat
                  label={AGENT_DETAIL_LABELS.heroPaymentMethodFees}
                  value={formatCurrency(s.payment_method_fee)}
                  icon={<DollarIcon />}
                />
                <DetailHeroStat
                  label={AGENT_DETAIL_LABELS.heroAffiliationFees}
                  value={formatCurrency(s.affiliation_fee)}
                  icon={<DollarIcon />}
                />
                <DetailHeroStat
                  label={AGENT_DETAIL_LABELS.heroTotalEarnings}
                  value={formatCurrency(s.total_earnings)}
                  icon={<DollarIcon />}
                />
              </>
            ) : (
              <>
                <DetailHeroStat
                  label={AGENT_DETAIL_LABELS.heroCommission}
                  value={formatPercentageOrEmpty(agent.affiliation_percentage)}
                  icon={<PercentIcon />}
                />
                <DetailHeroStat
                  label={AGENT_DETAIL_LABELS.heroPaymentMethodFeePct}
                  value={formatPercentageOrEmpty(agent.payment_method_fee_percentage)}
                  icon={<PercentIcon />}
                />
                <DetailHeroStat
                  label={AGENT_DETAIL_LABELS.heroSystemFeePct}
                  value={formatPercentageOrEmpty(agent.affiliation_fee_percentage)}
                  icon={<PercentIcon />}
                />
              </>
            )}
            <div className="bg-gray-50 dark:bg-gray-800 p-1.5 sm:p-2 md:p-4 border border-gray-200 dark:border-gray-700 rounded">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 md:mb-2">
                <div className="flex h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 items-center justify-center bg-gray-200 dark:bg-gray-700 shrink-0 rounded">
                  <svg
                    className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:h-4 lg:h-5 lg:w-5 text-gray-600 dark:text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] sm:text-[9px] md:text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
                    {AGENT_DETAIL_LABELS.heroStatus}
                  </p>
                  <div className="mt-0.5">
                    <Badge
                      variant={status.variant}
                      className="text-[9px] sm:text-[10px] md:text-xs lg:text-sm px-1 sm:px-1.5 md:px-2 lg:px-3 py-0.5 sm:py-0.5 md:py-1"
                    >
                      {status.label}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 lg:grid-cols-2">
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            <section className="border border-gray-200 bg-white p-3 sm:p-4 md:p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 rounded-lg">
              <div className="mb-3 sm:mb-4 flex items-center gap-2">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:h-9 items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-md rounded">
                  <svg className="h-4 w-4 sm:h-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {AGENT_DETAIL_LABELS.sectionQuickActions}
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <Button
                  type="button"
                  onClick={() => void navigateToFilteredTransactions()}
                  variant="primary"
                  className="group flex flex-col items-center justify-center gap-2 rounded-lg px-3 py-4 text-xs font-semibold shadow-md transition-all active:scale-[0.95] touch-manipulation min-h-[80px]"
                >
                  <svg className="h-6 w-6 transition-transform group-active:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-center leading-tight">{AGENT_DETAIL_LABELS.actionTransactions}</span>
                </Button>
                <Button
                  type="button"
                  onClick={navigateToFilteredPlayers}
                  variant="primary"
                  className="group flex flex-col items-center justify-center gap-2 rounded-lg px-3 py-4 text-xs font-semibold shadow-md transition-all active:scale-[0.95] touch-manipulation min-h-[80px]"
                >
                  <svg className="h-6 w-6 transition-transform group-active:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                  <span className="text-center leading-tight">{AGENT_DETAIL_LABELS.actionPlayers}</span>
                </Button>
                {agent.affiliate_link ? (
                  <>
                    <Button
                      type="button"
                      onClick={() => void copyAffiliateLink()}
                      variant="secondary"
                      className="group flex flex-col items-center justify-center gap-2 rounded-lg px-3 py-4 text-xs font-semibold shadow-sm transition-all active:scale-[0.95] touch-manipulation min-h-[80px]"
                    >
                      <svg className="h-6 w-6 transition-transform group-active:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="text-center leading-tight">{AGENT_DETAIL_LABELS.actionCopyAffiliate}</span>
                    </Button>
                    <Button
                      type="button"
                      onClick={openAffiliateExternally}
                      variant="secondary"
                      className="group flex flex-col items-center justify-center gap-2 rounded-lg px-3 py-4 text-xs font-semibold shadow-sm transition-all active:scale-[0.95] touch-manipulation min-h-[80px]"
                      aria-label={AGENT_DETAIL_LABELS.ariaOpenAffiliateExternally}
                    >
                      <svg className="h-6 w-6 transition-transform group-active:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <span className="text-center leading-tight">{AGENT_DETAIL_LABELS.actionOpenAffiliate}</span>
                    </Button>
                  </>
                ) : null}
              </div>
            </section>

            <section className="border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 rounded-lg">
              <div className="mb-2 sm:mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-md rounded">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {AGENT_DETAIL_LABELS.sectionAccountDetails}
                </h2>
              </div>
              <div className="space-y-1.5">
                {accountRows.map((row) => (
                  <div
                    key={row.label}
                    className="border border-gray-100 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-800/50"
                  >
                    <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {row.label}
                    </p>
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100 break-words">{row.value}</p>
                  </div>
                ))}
                {agent.affiliate_link ? (
                  <div className="border border-gray-100 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-800/50">
                    <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {AGENT_DETAIL_LABELS.fieldAffiliateUrl}
                    </p>
                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 break-all">{agent.affiliate_link}</p>
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            {s ? (
              <AgentPerformanceSummary stats={s} />
            ) : (
              <section className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 rounded-xl p-3 sm:p-4 md:p-5 lg:p-6 border border-purple-200 dark:border-purple-800/50 shadow-sm">
                <p className="text-sm text-center text-purple-800 dark:text-purple-200 py-8">
                  {AGENT_DETAIL_LABELS.emptyPerformance}
                </p>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailHeroStat({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-1.5 sm:p-2 md:p-4 border border-gray-200 dark:border-gray-700 rounded">
      <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 md:mb-2">
        <div className="flex h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 items-center justify-center bg-gray-200 dark:bg-gray-700 shrink-0 rounded">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[8px] sm:text-[9px] md:text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
            {label}
          </p>
          <p className="mt-0.5 text-xs sm:text-sm md:text-lg lg:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function DollarIcon() {
  return (
    <svg
      className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:h-4 lg:h-5 lg:w-5 text-gray-600 dark:text-gray-300"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function PercentIcon() {
  return (
    <svg
      className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:h-4 lg:h-5 lg:w-5 text-gray-600 dark:text-gray-300"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

type PerformanceTone = 'purple' | 'indigo' | 'violet';

const PERFORMANCE_SKINS: Record<
  PerformanceTone,
  { ring: string; iconWrap: string; icon: string; title: string; value: string }
> = {
  purple: {
    ring: 'border-purple-200/50 dark:border-purple-700/50',
    iconWrap: 'bg-purple-500/20 dark:bg-purple-500/30',
    icon: 'text-purple-600 dark:text-purple-400',
    title: 'text-purple-700 dark:text-purple-300',
    value: 'text-purple-600 dark:text-purple-400',
  },
  indigo: {
    ring: 'border-indigo-200/50 dark:border-indigo-700/50',
    iconWrap: 'bg-indigo-500/20 dark:bg-indigo-500/30',
    icon: 'text-indigo-600 dark:text-indigo-400',
    title: 'text-indigo-700 dark:text-indigo-300',
    value: 'text-indigo-600 dark:text-indigo-400',
  },
  violet: {
    ring: 'border-violet-200/50 dark:border-violet-700/50',
    iconWrap: 'bg-violet-500/20 dark:bg-violet-500/30',
    icon: 'text-violet-600 dark:text-violet-400',
    title: 'text-violet-700 dark:text-violet-300',
    value: 'text-violet-600 dark:text-violet-400',
  },
};

function AgentPerformanceSummary({ stats }: { stats: AgentDashboardStats }) {
  const tiles: Array<{
    label: string;
    formatted: string;
    tone: PerformanceTone;
    icon: ReactNode;
  }> = [
    {
      label: AGENT_DETAIL_LABELS.performanceTotalPlayers,
      formatted: String(stats.total_players),
      tone: 'purple',
      icon: <PlayersMiniIcon className={`w-3 h-3 sm:w-4 sm:h-4 2xl:w-2.5 2xl:h-2.5 ${PERFORMANCE_SKINS.purple.icon}`} />,
    },
    {
      label: AGENT_DETAIL_LABELS.heroTotalEarnings,
      formatted: formatCurrency(stats.total_earnings),
      tone: 'indigo',
      icon: <DollarMiniIcon className={`w-3 h-3 sm:w-4 sm:h-4 2xl:w-2.5 2xl:h-2.5 ${PERFORMANCE_SKINS.indigo.icon}`} />,
    },
    {
      label: AGENT_DETAIL_LABELS.performanceTotalTopUp,
      formatted: formatCurrency(stats.total_topup),
      tone: 'violet',
      icon: <PlusMiniIcon className={`w-3 h-3 sm:w-4 sm:h-4 2xl:w-2.5 2xl:h-2.5 ${PERFORMANCE_SKINS.violet.icon}`} />,
    },
    {
      label: AGENT_DETAIL_LABELS.performanceTotalCashout,
      formatted: formatCurrency(stats.total_cashout),
      tone: 'indigo',
      icon: <MinusMiniIcon className={`w-3 h-3 sm:w-4 sm:h-4 2xl:w-2.5 2xl:h-2.5 ${PERFORMANCE_SKINS.indigo.icon}`} />,
    },
  ];

  return (
    <section className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 rounded-xl p-3 sm:p-4 md:p-5 lg:p-6 border border-purple-200 dark:border-purple-800/50 shadow-sm">
      <div className="mb-3 sm:mb-4 md:mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h2 className="text-sm sm:text-base md:text-lg font-bold text-purple-900 dark:text-purple-200">
            {AGENT_DETAIL_LABELS.sectionPerformanceSummary}
          </h2>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4 2xl:grid-cols-4">
        {tiles.map(({ label, formatted, tone, icon }) => {
          const skin = PERFORMANCE_SKINS[tone];
          return (
            <div
              key={label}
              className={`bg-white/60 dark:bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 2xl:p-2.5 border hover:shadow-md transition-all duration-300 min-w-0 overflow-hidden ${skin.ring}`}
            >
              <div className="mb-2 flex items-center gap-1.5 sm:gap-2 2xl:gap-1 min-w-0">
                <div
                  className={`w-6 h-6 sm:w-8 sm:h-8 2xl:w-5 2xl:h-5 rounded-lg flex items-center justify-center shrink-0 ${skin.iconWrap}`}
                >
                  {icon}
                </div>
                <h5 className={`text-[9px] sm:text-[10px] md:text-xs font-semibold break-words min-w-0 ${skin.title}`}>{label}</h5>
              </div>
              <p className={`text-sm sm:text-lg md:text-xl lg:text-2xl 2xl:text-lg font-bold transition-all duration-300 break-words min-w-0 ${skin.value}`}>
                {formatted}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PlayersMiniIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

function DollarMiniIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function PlusMiniIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function MinusMiniIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
    </svg>
  );
}
