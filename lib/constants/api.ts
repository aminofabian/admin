export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.bruii.com';
export const WEBSOCKET_BASE_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL|| 'wss://ws.bruii.com';
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/users/login/',
    DASHBOARD_GAMES: '/users/dashboard-games/',
  },
  COMPANIES: {
    LIST: `${API_PREFIX}/companies/`,
    DETAIL: (id: number) => `${API_PREFIX}/companies/${id}/`,
  },
  MANAGERS: {
    LIST: `${API_PREFIX}/managers/`,
    DETAIL: (id: number) => `${API_PREFIX}/managers/${id}/`,
  },
  AGENTS: {
    LIST: `${API_PREFIX}/agents/`,
    DETAIL: (id: number) => `${API_PREFIX}/agents/${id}/`,
    DASHBOARD: `${API_PREFIX}/agent-dashboard/`,
    STATS: `${API_PREFIX}/agent-stats/`,
  },
  STAFFS: {
    LIST: `${API_PREFIX}/staffs/`,
    DETAIL: (id: number) => `${API_PREFIX}/staffs/${id}/`,
  },
  PLAYERS: {
    LIST: `${API_PREFIX}/players/`,
    DETAIL: (id: number) => `api/player-details/${id}`, // Using Next.js API route to proxy request
    CHECK_GAME_BALANCE: 'api/check-player-game-balance', // Using Next.js API route to proxy request
  },
  GAMES: {
    LIST: `${API_PREFIX}/games/`,
    DETAIL: (id: number) => `${API_PREFIX}/games/${id}/`,
    USER_GAMES: `${API_PREFIX}/user-games/`,
    PLAYER_GAMES: 'api/admin/user-games', // Player's game activities - Using Next.js API route to proxy request
    CHECK_STORE_BALANCE: 'api/check-store-balance', // Using Next.js API route to proxy request
    UPDATE_MINIMUM_REDEEM_MULTIPLIER: `${API_PREFIX}/games/update-minimum-redeem-multiplier/`,
    OFFMARKET_MANAGEMENT: 'api/admin/offmarket-games-management', // Using Next.js API route to proxy request
  },
  TRANSACTIONS: {
    LIST: `${API_PREFIX}/transactions/`,
    DETAIL: (id: string | number) => `${API_PREFIX}/transactions/${id}/`,
    QUEUES: `${API_PREFIX}/transaction-queues/`,
    // New separate endpoints for history and processing
    HISTORY: `${API_PREFIX}/transactions-history/`,
    PURCHASES: `${API_PREFIX}/transaction-purchases/`,
    CASHOUTS: `${API_PREFIX}/transaction-cashouts/`,
    QUEUES_HISTORY: `${API_PREFIX}/transaction-queues-history/`,
    QUEUES_PROCESSING: `${API_PREFIX}/transaction-queues-processing/`,
    HANDLE_GAME_ACTION: 'api/handle-game-action', // Using Next.js API route to proxy request
    ACTION: 'api/transaction-action', // Using Next.js API route to proxy request for cancel/complete
  },
  BONUSES: {
    PURCHASE: `${API_PREFIX}/purchase-bonuses/`,
    RECHARGE: `${API_PREFIX}/recharge-bonuses/`,
    TRANSFER: `${API_PREFIX}/transfer-bonuses/`,
    SIGNUP: `${API_PREFIX}/signup-bonuses/`,
    FIRST_PURCHASE: `${API_PREFIX}/first-purchase-bonuses/`,
  },
  BANNERS: {
    LIST: `${API_PREFIX}/admin-banners/`,
    DETAIL: (id: number) => `${API_PREFIX}/admin-banners/${id}/`,
  },
  AFFILIATES: {
    LIST: `${API_PREFIX}/affiliates/`,
    DETAIL: (id: number) => `${API_PREFIX}/affiliates/${id}/`,
    ADD_MANUAL: `${API_PREFIX}/add-manual-affiliate/`,
    DEFAULTS: `${API_PREFIX}/affiliate-defaults/`,
  },
  DASHBOARD: {
    // TODO: Backend doesn't implement this endpoint yet
    // See hooks/use-dashboard-stats.ts - currently using fallback data
    STATS: `${API_PREFIX}/dashboard/stats/`, // NOT IMPLEMENTED
  },
  ANALYTICS: {
    DASHBOARD: 'api/admin/analytics', // Using Next.js API route to proxy request
    TRANSACTIONS_SUMMARY: 'api/admin/analytics/transactions/summary', // Using Next.js API route to proxy request
    TRANSACTIONS_PAYMENT_METHODS: 'api/admin/analytics/transactions/payment-methods', // Using Next.js API route to proxy request
    TRANSACTIONS_BONUS: 'api/admin/analytics/transactions/bonus', // Using Next.js API route to proxy request
    GAMES_SUMMARY: 'api/admin/analytics/games/summary', // Using Next.js API route to proxy request
    GAMES_BY_GAME: 'api/admin/analytics/games/by-game', // Using Next.js API route to proxy request
  },
  PAYMENT_METHODS: {
    LIST: `${API_PREFIX}/payment-methods/`,
    DETAIL: (id: number) => `${API_PREFIX}/payment-methods/${id}/`,
    MANAGEMENT: `${API_PREFIX}/payment-methods-management/`,
  },
  CHAT: {
    MESSAGES: 'api/chat-messages', // Chat messages history
    PURCHASES: 'api/chat-purchases', // Purchase history
    ADMIN_CHAT: `${API_PREFIX}/admin/chat/`, // New JWT-authenticated endpoint
    WEBSOCKET_BASE: '/ws/cschat/', // WebSocket endpoint base (backend)
  },
  CHAT_LINKS: {
    LIST: `${API_PREFIX}/chat-links/`,
    DETAIL: (id: number) => `${API_PREFIX}/chat-links/${id}/`,
  },
} as const;

export const TOKEN_KEY = 'auth_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const PROJECT_UUID_KEY = 'whitelabel_admin_uuid';
export const PROJECT_DOMAIN = process.env.NEXT_PUBLIC_PROJECT_DOMAIN || 'https://serverhub.biz';

