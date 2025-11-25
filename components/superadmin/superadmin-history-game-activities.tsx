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
    return (
        <div>
            {/* Superadmin Badge */}
            <div className="mb-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 px-4 py-3 flex items-center gap-2 rounded-lg">
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="font-medium text-primary">Superadmin View - System-Wide Game Activity History</span>
            </div>

            <div className="mb-6">
                <h1 className="text-3xl font-bold text-foreground">Game Activity History</h1>
                <p className="text-muted-foreground mt-1">View all game activities across the platform (Mock Data)</p>
            </div>

            {/* Activity Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Total Activities</div>
                        <div className="text-2xl font-bold text-foreground mt-1">{MOCK_GAME_ACTIVITIES.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Total Bets</div>
                        <div className="text-2xl font-bold text-foreground mt-1">
                            ${MOCK_GAME_ACTIVITIES.reduce((sum, a) => sum + a.bet, 0).toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Total Wins</div>
                        <div className="text-2xl font-bold text-green-600 mt-1">
                            ${MOCK_GAME_ACTIVITIES.reduce((sum, a) => sum + a.win, 0).toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Net Profit</div>
                        <div className={`text-2xl font-bold mt-1 ${MOCK_GAME_ACTIVITIES.reduce((sum, a) => sum + a.profit, 0) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                            ${MOCK_GAME_ACTIVITIES.reduce((sum, a) => sum + a.profit, 0).toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Game Activities Table */}
            <Card>
                <CardHeader>
                    <h2 className="text-lg font-semibold">Recent Game Activities</h2>
                </CardHeader>
                <CardContent className="p-0">
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
                </CardContent>
            </Card>
        </div>
    );
}
