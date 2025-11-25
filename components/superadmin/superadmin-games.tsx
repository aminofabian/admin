'use client';

import { Card, CardHeader, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from '@/components/ui';

// Mock games data
const MOCK_GAMES = [
    { id: 1, name: 'Mega Slots Deluxe', provider: 'PlayTech', status: 'active', players: 1247 },
    { id: 2, name: 'Fortune Wheel', provider: 'Evolution', status: 'active', players: 892 },
    { id: 3, name: 'Blackjack Pro', provider: 'NetEnt', status: 'active', players: 645 },
    { id: 4, name: 'Roulette Royal', provider: 'Microgaming', status: 'inactive', players: 0 },
    { id: 5, name: 'Poker Championship', provider: 'PlayTech', status: 'active', players: 523 },
];

export function SuperAdminGames() {
    return (
        <div>
            {/* Superadmin Badge */}
            <div className="mb-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 px-4 py-3 flex items-center gap-2 rounded-lg">
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="font-medium text-primary">Superadmin View - Global Games Management</span>
            </div>

            <div className="mb-6">
                <h1 className="text-3xl font-bold text-foreground">Games Management</h1>
                <p className="text-muted-foreground mt-1">Manage games across all companies (Mock Data)</p>
            </div>

            {/* Games Stats */}
            <div className="grid grid-cols-1 md://grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Total Games</div>
                        <div className="text-2xl font-bold text-foreground mt-1">{MOCK_GAMES.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Active Games</div>
                        <div className="text-2xl font-bold text-green-600 mt-1">
                            {MOCK_GAMES.filter(g => g.status === 'active').length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Total Players</div>
                        <div className="text-2xl font-bold text-foreground mt-1">
                            {MOCK_GAMES.reduce((sum, g) => sum + g.players, 0).toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Providers</div>
                        <div className="text-2xl font-bold text-foreground mt-1">
                            {new Set(MOCK_GAMES.map(g => g.provider)).size}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Games Table */}
            <Card>
                <CardHeader>
                    <h2 className="text-lg font-semibold">All Games</h2>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Game Name</TableHead>
                                <TableHead>Provider</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Active Players</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {MOCK_GAMES.map((game) => (
                                <TableRow key={game.id}>
                                    <TableCell className="font-medium">{game.name}</TableCell>
                                    <TableCell>{game.provider}</TableCell>
                                    <TableCell>
                                        <Badge variant={game.status === 'active' ? 'success' : 'default'}>
                                            {game.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{game.players.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
