'use client';

import { Card, CardHeader, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from '@/components/ui';

// Mock game activities data
const MOCK_GAME_ACTIVITIES = [
    { id: 1, username: 'player123', game: 'Mega Slots Deluxe', bet: 50, win: 250, profit: 200, company: 'Gaming Pro', date: '2025-11-25 09:45' },
    { id: 2, username: 'player456', game: 'Blackjack Pro', bet: 100, win: 0, profit: -100, company: 'Casino King', date: '2025-11-25 09:30' },
    { id: 3, username: 'player789', game: 'Fortune Wheel', bet: 25, win: 125, profit: 100, company: 'Slots Master', date: '2025-11-25 09:15' },
    { id: 4, username: 'player321', game: 'Roulette Royal', bet: 200, win: 400, profit: 200, company: 'Gaming Pro', date: '2025-11-25 09:00' },
    { id: 5, username: 'player654', game: 'Poker Championship', bet: 150, win: 75, profit: -75, company: 'Bet Zone', date: '2025-11-25 08:45' },
];

export function SuperAdminHistoryGameActivities() {
    const totalBets = MOCK_GAME_ACTIVITIES.reduce((sum, a) => sum + a.bet, 0);
    const totalWins = MOCK_GAME_ACTIVITIES.reduce((sum, a) => sum + a.win, 0);
    const netProfit = MOCK_GAME_ACTIVITIES.reduce((sum, a) => sum + a.profit, 0);

    return (
        <div className="md:pb-0 pb-6">
            {/* Sticky Mobile Header */}
            <div className="sticky top-0 z-10 md:relative md:top-auto md:z-auto bg-background/95 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none border-b md:border-b-0 mb-4 md:mb-6 -mx-4 md:mx-0 px-4 md:px-0 py-3 md:py-0">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Game Activity History</h1>
            </div>

            {/* Activity Stats - Compact Mobile Design */}
            <div className="grid grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800 shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                            <div className="flex-1">
                                <div className="text-xs md:text-sm font-medium text-blue-700 dark:text-blue-300 mb-0.5 md:mb-1">Activities</div>
                                <div className="text-xl md:text-3xl font-bold text-blue-900 dark:text-blue-100">{MOCK_GAME_ACTIVITIES.length}</div>
                            </div>
                            <div className="p-2 md:p-3 bg-blue-500/10 rounded-lg md:rounded-xl w-fit">
                                <svg className="w-5 h-5 md:w-8 md:h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 border-purple-200 dark:border-purple-800 shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                            <div className="flex-1">
                                <div className="text-xs md:text-sm font-medium text-purple-700 dark:text-purple-300 mb-0.5 md:mb-1">Bets</div>
                                <div className="text-xl md:text-3xl font-bold text-purple-900 dark:text-purple-100">
                                    ${totalBets.toLocaleString()}
                                </div>
                            </div>
                            <div className="p-2 md:p-3 bg-purple-500/10 rounded-lg md:rounded-xl w-fit">
                                <svg className="w-5 h-5 md:w-8 md:h-8 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-green-200 dark:border-green-800 shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                            <div className="flex-1">
                                <div className="text-xs md:text-sm font-medium text-green-700 dark:text-green-300 mb-0.5 md:mb-1">Wins</div>
                                <div className="text-xl md:text-3xl font-bold text-green-900 dark:text-green-100">
                                    ${totalWins.toLocaleString()}
                                </div>
                            </div>
                            <div className="p-2 md:p-3 bg-green-500/10 rounded-lg md:rounded-xl w-fit">
                                <svg className="w-5 h-5 md:w-8 md:h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className={`bg-gradient-to-br shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden ${
                    netProfit >= 0 
                        ? 'from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-green-200 dark:border-green-800'
                        : 'from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 border-red-200 dark:border-red-800'
                }`}>
                    <CardContent className="p-3 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                            <div className="flex-1">
                                <div className={`text-xs md:text-sm font-medium mb-0.5 md:mb-1 ${
                                    netProfit >= 0 
                                        ? 'text-green-700 dark:text-green-300' 
                                        : 'text-red-700 dark:text-red-300'
                                }`}>Profit</div>
                                <div className={`text-xl md:text-3xl font-bold ${
                                    netProfit >= 0 
                                        ? 'text-green-900 dark:text-green-100' 
                                        : 'text-red-900 dark:text-red-100'
                                }`}>
                                    ${netProfit.toLocaleString()}
                                </div>
                            </div>
                            <div className={`p-2 md:p-3 rounded-lg md:rounded-xl w-fit ${
                                netProfit >= 0 
                                    ? 'bg-green-500/10' 
                                    : 'bg-red-500/10'
                            }`}>
                                <svg className={`w-5 h-5 md:w-8 md:h-8 ${
                                    netProfit >= 0 
                                        ? 'text-green-600 dark:text-green-400' 
                                        : 'text-red-600 dark:text-red-400'
                                }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Game Activities Table */}
            <Card className="shadow-sm md:shadow-md border md:border-2 rounded-xl md:rounded-lg overflow-hidden">
                <CardHeader className="pb-3 md:pb-6 px-4 md:px-6 pt-4 md:pt-6 border-b md:border-b-0">
                    <h2 className="text-base md:text-lg font-semibold">Recent Game Activities</h2>
                </CardHeader>
                <CardContent className="p-0">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Game</TableHead>
                                    <TableHead>Bet Amount</TableHead>
                                    <TableHead>Win Amount</TableHead>
                                    <TableHead>Profit/Loss</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {MOCK_GAME_ACTIVITIES.map((activity) => (
                                    <TableRow key={activity.id}>
                                        <TableCell className="font-medium">{activity.username}</TableCell>
                                        <TableCell>{activity.company}</TableCell>
                                        <TableCell>{activity.game}</TableCell>
                                        <TableCell>${activity.bet.toLocaleString()}</TableCell>
                                        <TableCell className="font-semibold text-green-600">${activity.win.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <span className={activity.profit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                                {activity.profit >= 0 ? '+' : ''} ${activity.profit.toLocaleString()}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{activity.date}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3 px-4 pb-4">
                        {MOCK_GAME_ACTIVITIES.map((activity) => (
                            <Card 
                                key={activity.id} 
                                className="border shadow-md hover:shadow-lg transition-shadow active:scale-[0.99] rounded-2xl overflow-hidden bg-card"
                            >
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-base leading-tight mb-1">{activity.username}</h3>
                                            <p className="text-xs text-muted-foreground mb-2">{activity.company}</p>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="info" className="text-xs px-2 py-0.5">{activity.game}</Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm pt-2 border-t">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-muted-foreground">Bet:</span>
                                            <span className="font-semibold">${activity.bet.toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-muted-foreground">Win:</span>
                                            <span className="font-semibold text-green-600">${activity.win.toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-muted-foreground">Profit/Loss:</span>
                                            <span className={`font-semibold ${activity.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {activity.profit >= 0 ? '+' : ''} ${activity.profit.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-muted-foreground">Date:</span>
                                            <span className="text-xs text-muted-foreground">{activity.date}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
