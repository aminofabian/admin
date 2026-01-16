'use client';

import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { useAdminAnalytics } from '@/hooks/use-admin-analytics';
import {
  useTransactionSummary,
  usePaymentMethods,
  useBonusAnalytics,
} from '@/hooks/use-analytics-transactions';
import { useGameSummary, useGamesByGame } from '@/hooks/use-analytics-games';
import { Card, CardContent, CardHeader, Button, Select } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/formatters';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import type { AnalyticsFilters } from '@/lib/api/analytics';

// US States for filter
const US_STATES = [
  { value: '', label: 'All States' },
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

// Helper to get date range for preset
function getDateRange(preset: string): { start: string; end: string } {
  const today = new Date();
  let end = new Date(today);
  end.setHours(23, 59, 59, 999);

  let start = new Date(today);

  switch (preset) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'yesterday':
      start = new Date(today);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(today);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'this_month':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'last_month':
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last_30_days':
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    case 'last_3_months':
      start.setMonth(start.getMonth() - 3);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      start.setMonth(start.getMonth() - 3);
      start.setHours(0, 0, 0, 0);
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: analyticsData, loading: loadingDashboard, error: dashboardError } = useAdminAnalytics();

  // Filter state
  const [datePreset, setDatePreset] = useState('last_3_months');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [username, setUsername] = useState('');
  const [state, setState] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');

  // Initialize date range
  useEffect(() => {
    const range = getDateRange(datePreset);
    setStartDate(range.start);
    setEndDate(range.end);
  }, [datePreset]);

  // Build filters object
  const filters = useMemo<AnalyticsFilters>(() => {
    const filterObj: AnalyticsFilters = {};
    if (startDate) filterObj.start_date = startDate;
    if (endDate) filterObj.end_date = endDate;
    if (username) filterObj.username = username;
    if (state) filterObj.state = state;
    if (gender) filterObj.gender = gender;
    return filterObj;
  }, [startDate, endDate, username, state, gender]);

  // Fetch analytics data
  const {
    data: transactionSummary,
    loading: loadingSummary,
    error: summaryError,
  } = useTransactionSummary(filters);

  const {
    data: paymentMethods,
    loading: loadingPaymentMethods,
    error: paymentMethodsError,
  } = usePaymentMethods(filters);

  const {
    data: bonusAnalytics,
    loading: loadingBonus,
    error: bonusError,
  } = useBonusAnalytics(filters);

  const {
    data: gameSummary,
    loading: loadingGameSummary,
    error: gameSummaryError,
  } = useGameSummary(filters);

  const {
    data: gamesByGame,
    loading: loadingGamesByGame,
    error: gamesByGameError,
  } = useGamesByGame(filters);

  // Redirect if user is not a company admin
  useEffect(() => {
    if (user && user.role !== USER_ROLES.COMPANY) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const range = getDateRange(preset);
      setStartDate(range.start);
      setEndDate(range.end);
    }
  };

  const handleClearFilters = () => {
    setDatePreset('last_3_months');
    const range = getDateRange('last_3_months');
    setStartDate(range.start);
    setEndDate(range.end);
    setUsername('');
    setState('');
    setGender('');
  };

  // Show loading state
  if (loadingDashboard) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground mt-2">Loading analytics data...</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2 mt-2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (dashboardError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground mt-2">Dashboard analytics and insights</p>
          </div>
          <Card className="border-red-500/50 bg-red-50/50 dark:bg-red-950/20">
            <CardHeader>
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Error Loading Analytics</h3>
              <p className="text-sm text-muted-foreground mt-1">{dashboardError}</p>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-2">Dashboard analytics and insights</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Filters</h3>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Date Preset */}
              <div>
                <label className="text-sm font-medium mb-2 block">Date Range Preset</label>
                <Select
                  value={datePreset}
                  onChange={(value: string) => handlePresetChange(value)}
                  options={[
                    { value: 'today', label: 'Today' },
                    { value: 'yesterday', label: 'Yesterday' },
                    { value: 'this_month', label: 'This Month' },
                    { value: 'last_month', label: 'Last Month' },
                    { value: 'last_30_days', label: 'Last 30 Days' },
                    { value: 'last_3_months', label: 'Last 3 Months' },
                    { value: 'custom', label: 'Custom Range' },
                  ]}
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="text-sm font-medium mb-2 block">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  max={endDate || undefined}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="text-sm font-medium mb-2 block">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  min={startDate || undefined}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              {/* Username */}
              <div>
                <label className="text-sm font-medium mb-2 block">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Search by username"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              {/* State */}
              <div>
                <label className="text-sm font-medium mb-2 block">State</label>
                <Select
                  value={state}
                  onChange={(value: string) => setState(value)}
                  options={US_STATES}
                  placeholder="All States"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="text-sm font-medium mb-2 block">Gender</label>
                <Select
                  value={gender}
                  onChange={(value: string) => setGender(value as 'male' | 'female' | '')}
                  options={[
                    { value: '', label: 'All' },
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                  ]}
                  placeholder="All"
                />
              </div>

              {/* Clear Button */}
              <div className="flex items-end">
                <Button onClick={handleClearFilters} variant="secondary" className="w-full">
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Stats */}
        {analyticsData && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">Total Players</h3>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.total_players ?? 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">Total Managers</h3>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.total_managers ?? 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">Total Agents</h3>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.total_agents ?? 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">Total Staff</h3>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.total_staffs ?? 0}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Transaction Analytics */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Transaction Analytics</h2>

          {/* Transaction Summary */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Summary Metrics</h3>
            </CardHeader>
            <CardContent>
              {loadingSummary ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              ) : summaryError ? (
                <p className="text-sm text-destructive">{summaryError}</p>
              ) : transactionSummary ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Purchase</p>
                    <p className="text-2xl font-bold">{formatCurrency(transactionSummary.total_purchase)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Cashout</p>
                    <p className="text-2xl font-bold">{formatCurrency(transactionSummary.total_cashout)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Transfer</p>
                    <p className="text-2xl font-bold">{formatCurrency(transactionSummary.total_transfer)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data available</p>
              )}
            </CardContent>
          </Card>

          {/* Payment Methods Breakdown */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Payment Method Breakdown</h3>
            </CardHeader>
            <CardContent>
              {loadingPaymentMethods ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              ) : paymentMethodsError ? (
                <p className="text-sm text-destructive">{paymentMethodsError}</p>
              ) : paymentMethods.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Payment Method</th>
                        <th className="text-right p-2">Purchase</th>
                        <th className="text-right p-2">Bonus</th>
                        <th className="text-right p-2">Avg Bonus %</th>
                        <th className="text-right p-2">Cashout</th>
                        <th className="text-right p-2">Success Rate</th>
                        <th className="text-right p-2">Avg Tx Size</th>
                        <th className="text-right p-2">Usage %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentMethods.map((method, idx) => {
                        // Format payment method name for display
                        const formatPaymentMethodName = (name: string): string => {
                          return name
                            .split('_')
                            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ');
                        };

                        return (
                          <tr key={idx} className="border-b">
                            <td className="p-2 font-medium">{formatPaymentMethodName(method.payment_method)}</td>
                            <td className="p-2 text-right">{formatCurrency(method.purchase ?? 0)}</td>
                            <td className="p-2 text-right">{formatCurrency(method.bonus ?? 0)}</td>
                            <td className="p-2 text-right">
                              {method.average_bonus_pct != null
                                ? `${method.average_bonus_pct.toFixed(2)}%`
                                : '0.00%'}
                            </td>
                            <td className="p-2 text-right">{formatCurrency(method.cashout ?? 0)}</td>
                            <td className="p-2 text-right">
                              {method.success_rate != null
                                ? `${method.success_rate.toFixed(2)}%`
                                : '0.00%'}
                            </td>
                            <td className="p-2 text-right">{formatCurrency(method.average_transaction_size ?? 0)}</td>
                            <td className="p-2 text-right">
                              {method.usage_distribution_pct != null
                                ? `${method.usage_distribution_pct.toFixed(2)}%`
                                : '0.00%'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No payment method data available</p>
              )}
            </CardContent>
          </Card>

          {/* Bonus Analytics */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Bonus Analytics</h3>
            </CardHeader>
            <CardContent>
              {loadingBonus ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              ) : bonusError ? (
                <p className="text-sm text-destructive">{bonusError}</p>
              ) : bonusAnalytics ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Bonus</p>
                    <p className="text-2xl font-bold">{formatCurrency(bonusAnalytics.total_bonus)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Purchase Bonus</p>
                    <p className="text-2xl font-bold">{formatCurrency(bonusAnalytics.purchase_bonus)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Purchase Bonus %</p>
                    <p className="text-2xl font-bold">
                      {bonusAnalytics.average_purchase_bonus_percent != null
                        ? `${bonusAnalytics.average_purchase_bonus_percent.toFixed(2)}%`
                        : '0.00%'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Signup Bonus</p>
                    <p className="text-2xl font-bold">{formatCurrency(bonusAnalytics.signup_bonus)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">First Deposit Bonus</p>
                    <p className="text-2xl font-bold">{formatCurrency(bonusAnalytics.first_deposit_bonus)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Transfer Bonus</p>
                    <p className="text-2xl font-bold">{formatCurrency(bonusAnalytics.transfer_bonus)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Transfer Bonus %</p>
                    <p className="text-2xl font-bold">
                      {bonusAnalytics.average_transfer_bonus_percent != null
                        ? `${bonusAnalytics.average_transfer_bonus_percent.toFixed(2)}%`
                        : '0.00%'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No bonus data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Game Activity Analytics */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Game Activity Analytics</h2>

          {/* Game Summary */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Summary Metrics (All Games Combined)</h3>
            </CardHeader>
            <CardContent>
              {loadingGameSummary ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              ) : gameSummaryError ? (
                <p className="text-sm text-destructive">{gameSummaryError}</p>
              ) : gameSummary ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Recharge</p>
                    <p className="text-2xl font-bold">{formatCurrency(gameSummary.total_recharge)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Bonus</p>
                    <p className="text-2xl font-bold">{formatCurrency(gameSummary.total_bonus)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Average Bonus %</p>
                    <p className="text-2xl font-bold">
                      {gameSummary.average_bonus_percent != null
                        ? `${gameSummary.average_bonus_percent.toFixed(2)}%`
                        : '0.00%'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Redeem</p>
                    <p className="text-2xl font-bold">{formatCurrency(gameSummary.total_redeem)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Net Game Activity</p>
                    <p className="text-2xl font-bold">{formatCurrency(gameSummary.net_game_activity)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No game summary data available</p>
              )}
            </CardContent>
          </Card>

          {/* Games By Game */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Per-Game Breakdown</h3>
            </CardHeader>
            <CardContent>
              {loadingGamesByGame ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              ) : gamesByGameError ? (
                <p className="text-sm text-destructive">{gamesByGameError}</p>
              ) : gamesByGame.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Game</th>
                        <th className="text-right p-2">Recharge</th>
                        <th className="text-right p-2">Bonus</th>
                        <th className="text-right p-2">Avg Bonus %</th>
                        <th className="text-right p-2">Redeem</th>
                        <th className="text-right p-2">Net Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gamesByGame.map((game, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="p-2 font-medium">{game.game_title}</td>
                          <td className="p-2 text-right">{formatCurrency(game.recharge)}</td>
                          <td className="p-2 text-right">{formatCurrency(game.bonus)}</td>
                          <td className="p-2 text-right">
                            {game.average_bonus_percent != null
                              ? `${game.average_bonus_percent.toFixed(2)}%`
                              : '0.00%'}
                          </td>
                          <td className="p-2 text-right">{formatCurrency(game.redeem)}</td>
                          <td className="p-2 text-right">{formatCurrency(game.net_game_activity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No game data available</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
