/** Strings and numeric wiring for `/dashboard/agents/[id]` (keep UI copy centralized). */

export const AGENT_DETAIL_LABELS = {
  ariaBack: 'Back',
  ariaOpenAffiliateExternally: 'Open affiliate link in a new tab',
  subtitleFallback: 'Agent profile',
  heroPaymentMethodFees: 'Payment method fees',
  heroAffiliationFees: 'Affiliation fees',
  heroTotalEarnings: 'Total earnings',
  heroStatus: 'Status',
  heroCommission: 'Commission',
  heroPaymentMethodFeePct: 'PM fee %',
  heroSystemFeePct: 'System fee %',
  sectionQuickActions: 'Quick Actions',
  actionTransactions: 'Transactions',
  actionPlayers: 'Players',
  actionCopyAffiliate: 'Copy affiliate link',
  actionOpenAffiliate: 'Open affiliate link',
  sectionAccountDetails: 'Personal Information',
  fieldEmail: 'Email',
  fieldUsername: 'Username',
  fieldRole: 'Role',
  fieldCreated: 'Created',
  fieldModified: 'Last updated',
  fieldAffiliateCommission: 'Commission',
  fieldPaymentMethodFee: 'Payment method fee',
  fieldSystemFee: 'System fee',
  fieldAffiliateUrl: 'Affiliate URL',
  sectionPerformanceSummary: 'Performance summary',
  performanceTotalPlayers: 'Total players',
  performanceTotalTopUp: 'Total top-up',
  performanceTotalCashout: 'Total cashout',
  errInvalidId: 'Invalid agent ID',
  errFailedLoad: 'Failed to load agent',
  errNotFound: 'Agent not found',
  emptyPerformance: 'Performance data is not available for this agent yet.',
} as const;

export const AGENT_DETAIL_TOAST = {
  copyAffiliateSuccess: {
    title: 'Link copied',
    description: 'Affiliate link copied to clipboard.',
  },
  copyAffiliateError: {
    title: 'Copy failed',
    description: 'Could not copy to clipboard.',
  },
  noTransactions: {
    title: 'No transactions found',
    description: 'This agent has no transactions yet.',
  },
  transactionsCheckError: {
    title: 'Could not load transactions',
    description: 'Please try again or open transactions from the main menu.',
  },
} as const;

/** Preview request when probing whether filtered transactions exist. */
export const AGENT_TRANSACTION_PREVIEW_PAGE_SIZE = 1;

/** Target for `window.open` when opening affiliate URLs. */
export const EXTERNAL_LINK_WINDOW_FEATURES = 'noopener,noreferrer' as const;
