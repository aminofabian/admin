import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import type { 
  PaginatedResponse,
  Game,
  Player,
  Transaction,
  TransactionQueue,
  Affiliate
} from '@/types';

export interface DashboardStats {
  // User counts
  totalPlayers: number;
  activePlayers: number;
  totalManagers: number;
  totalAgents: number;
  totalStaff: number;
  
  // Financial metrics
  totalBalance: number;
  totalWinningBalance: number;
  platformLiquidity: number;
  
  // Transaction metrics
  pendingTransactions: number;
  completedToday: number;
  failedToday: number;
  transactionSuccessRate: number;
  totalPurchasesToday: number;
  totalCashoutsToday: number;
  
  // Game metrics
  totalGames: number;
  activeGames: number;
  inactiveGames: number;
  topGames: Array<{
    id: number;
    name: string;
    image_url: string;
    playerCount: number;
    status: string;
  }>;
  
  // Affiliate metrics
  totalAffiliates: number;
  topAffiliates: Array<{
    id: number;
    agent_id: number;
    total_players: number;
    total_earnings: string;
    total_topup: string;
    total_cashout: string;
  }>;
}

export const dashboardStatsApi = {
  /**
   * Fetch comprehensive dashboard statistics
   * Aggregates data from multiple endpoints
   */
  async getStats(): Promise<DashboardStats> {
    try {
      // Fetch all data in parallel
      const [
        playersResponse,
        managersResponse,
        agentsResponse,
        staffsResponse,
        gamesResponse,
        transactionsResponse,
        queuesPendingResponse,
        affiliatesResponse,
      ] = await Promise.all([
        apiClient.get<PaginatedResponse<Player>>(API_ENDPOINTS.PLAYERS.LIST, {
          params: { page_size: 1000 } // Get all players for accurate stats
        }),
        apiClient.get<PaginatedResponse<any>>(API_ENDPOINTS.MANAGERS.LIST, {
          params: { page_size: 1 }
        }),
        apiClient.get<PaginatedResponse<any>>(API_ENDPOINTS.AGENTS.LIST, {
          params: { page_size: 1 }
        }),
        apiClient.get<PaginatedResponse<any>>(API_ENDPOINTS.STAFFS.LIST, {
          params: { page_size: 1 }
        }),
        apiClient.get<PaginatedResponse<Game>>(API_ENDPOINTS.GAMES.LIST, {
          params: { page_size: 100 }
        }),
        apiClient.get<PaginatedResponse<Transaction>>(API_ENDPOINTS.TRANSACTIONS.LIST, {
          params: { type: 'history', page_size: 1000 }
        }),
        apiClient.get<PaginatedResponse<TransactionQueue>>(API_ENDPOINTS.TRANSACTIONS.QUEUES, {
          params: { type: 'processing' }
        }),
        apiClient.get<PaginatedResponse<Affiliate>>(API_ENDPOINTS.AFFILIATES.LIST, {
          params: { page_size: 100 }
        }),
      ]);

      const players = playersResponse.data.results || [];
      const games = gamesResponse.data.results || [];
      const transactions = transactionsResponse.data.results || [];
      const pendingQueues = queuesPendingResponse.data.results || [];
      const affiliates = affiliatesResponse.data.results || [];

      // Calculate player metrics
      const activePlayers = players.filter(p => p.is_active).length;
      
      // Calculate financial metrics
      const totalBalance = players.reduce((sum, p) => sum + parseFloat(p.balance || '0'), 0);
      const totalWinningBalance = players.reduce((sum, p) => sum + parseFloat(p.winning_balance || '0'), 0);
      const platformLiquidity = totalBalance + totalWinningBalance;

      // Calculate transaction metrics
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const todayTransactions = transactions.filter(t => {
        const txDate = new Date(t.created);
        return txDate >= todayStart;
      });

      const completedToday = todayTransactions.filter(t => t.status === 'completed').length;
      const failedToday = todayTransactions.filter(t => t.status === 'failed').length;
      const totalToday = todayTransactions.length;
      const transactionSuccessRate = totalToday > 0 ? (completedToday / totalToday) * 100 : 0;

      const totalPurchasesToday = todayTransactions.filter(t => t.type === 'purchase').length;
      const totalCashoutsToday = todayTransactions.filter(t => t.type === 'cashout').length;

      // Calculate game metrics
      const activeGames = games.filter(g => g.is_active).length;
      const inactiveGames = games.filter(g => !g.is_active).length;

      // Get top games (mock player count for now - would need user-games endpoint)
      const topGames = games
        .filter(g => g.is_active)
        .slice(0, 5)
        .map(g => ({
          id: g.id,
          name: g.game_name,
          image_url: g.image_url,
          playerCount: Math.floor(Math.random() * 1000), // TODO: Get real player count from user-games
          status: g.is_active ? 'active' : 'inactive'
        }))
        .sort((a, b) => b.playerCount - a.playerCount);

      // Get top affiliates
      const topAffiliates = affiliates
        .sort((a, b) => parseFloat(b.total_earnings || '0') - parseFloat(a.total_earnings || '0'))
        .slice(0, 5)
        .map(a => ({
          id: a.id,
          agent_id: a.agent,
          total_players: a.total_players || 0,
          total_earnings: a.total_earnings || '0',
          total_topup: a.total_topup || '0',
          total_cashout: a.total_cashout || '0',
        }));

      return {
        // User counts
        totalPlayers: playersResponse.data.count || 0,
        activePlayers,
        totalManagers: managersResponse.data.count || 0,
        totalAgents: agentsResponse.data.count || 0,
        totalStaff: staffsResponse.data.count || 0,
        
        // Financial metrics
        totalBalance,
        totalWinningBalance,
        platformLiquidity,
        
        // Transaction metrics
        pendingTransactions: pendingQueues.length,
        completedToday,
        failedToday,
        transactionSuccessRate,
        totalPurchasesToday,
        totalCashoutsToday,
        
        // Game metrics
        totalGames: gamesResponse.data.count || 0,
        activeGames,
        inactiveGames,
        topGames,
        
        // Affiliate metrics
        totalAffiliates: affiliatesResponse.data.count || 0,
        topAffiliates,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  },

  /**
   * Get real-time transaction queue status
   */
  async getTransactionStatus() {
    try {
      const [processingResponse, historyResponse] = await Promise.all([
        apiClient.get<PaginatedResponse<TransactionQueue>>(API_ENDPOINTS.TRANSACTIONS.QUEUES, {
          params: { type: 'processing' }
        }),
        apiClient.get<PaginatedResponse<Transaction>>(API_ENDPOINTS.TRANSACTIONS.LIST, {
          params: { type: 'history', page_size: 100 }
        }),
      ]);

      const processing = processingResponse.data.results || [];
      const history = historyResponse.data.results || [];

      // Calculate today's transactions
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const todayTransactions = history.filter(t => {
        const txDate = new Date(t.created);
        return txDate >= todayStart;
      });

      const completed = todayTransactions.filter(t => t.status === 'completed').length;
      const failed = todayTransactions.filter(t => t.status === 'failed').length;
      const total = todayTransactions.length;
      const successRate = total > 0 ? (completed / total) * 100 : 100;

      return {
        pendingCount: processing.length,
        status: processing.length < 50 ? 'Processing Smoothly' : 'High Load',
        totalToday: total,
        successRate: parseFloat(successRate.toFixed(1)),
      };
    } catch (error) {
      console.error('Error fetching transaction status:', error);
      throw error;
    }
  },

  /**
   * Get active games with player counts
   */
  async getTopGames() {
    try {
      const response = await apiClient.get<PaginatedResponse<Game>>(API_ENDPOINTS.GAMES.LIST, {
        params: { page_size: 100 }
      });

      const games = response.data.results || [];
      
      // Filter active games and mock player counts
      // TODO: Integrate with user-games endpoint for real player counts
      const topGames = games
        .filter(g => g.is_active)
        .slice(0, 10)
        .map(g => ({
          id: g.id,
          name: g.game_name,
          image: g.image_url,
          players: Math.floor(Math.random() * 1500), // Mock for now
          status: Math.random() > 0.7 ? 'hot' : 'active' as 'hot' | 'active' | 'normal',
        }))
        .sort((a, b) => b.players - a.players);

      return topGames;
    } catch (error) {
      console.error('Error fetching top games:', error);
      throw error;
    }
  },

  /**
   * Get bonus program statistics
   */
  async getBonusStats() {
    try {
      const [rechargeResponse, signupResponse, transferResponse] = await Promise.all([
        apiClient.get<PaginatedResponse<any>>(API_ENDPOINTS.BONUSES.RECHARGE, {
          params: { page_size: 100 }
        }),
        apiClient.get<PaginatedResponse<any>>(API_ENDPOINTS.BONUSES.SIGNUP, {
          params: { page_size: 100 }
        }),
        apiClient.get<PaginatedResponse<any>>(API_ENDPOINTS.BONUSES.TRANSFER, {
          params: { page_size: 100 }
        }),
      ]);

      const rechargeActive = rechargeResponse.data.results?.filter(b => b.is_enabled).length || 0;
      const signupActive = signupResponse.data.results?.filter(b => b.is_enabled).length || 0;
      const transferActive = transferResponse.data.results?.filter(b => b.is_enabled).length || 0;

      return {
        totalBonuses: (rechargeResponse.data.count || 0) + (signupResponse.data.count || 0) + (transferResponse.data.count || 0),
        activeBonuses: rechargeActive + signupActive + transferActive,
        rechargeCount: rechargeActive,
        signupCount: signupActive,
        transferCount: transferActive,
      };
    } catch (error) {
      console.error('Error fetching bonus stats:', error);
      return {
        totalBonuses: 0,
        activeBonuses: 0,
        rechargeCount: 0,
        signupCount: 0,
        transferCount: 0,
      };
    }
  },
};

