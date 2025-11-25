'use client';

import { Card, CardHeader, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from '@/components/ui';

// Mock transactions data
const MOCK_TRANSACTIONS = [
    { id: 1, username: 'player123', type: 'Purchase', amount: 500, status: 'completed', company: 'Gaming Pro', date: '2025-11-25 09:30' },
    { id: 2, username: 'player456', type: 'Cashout', amount: 1200, status: 'pending', company: 'Casino King', date: '2025-11-25 09:15' },
    { id: 3, username: 'player789', type: 'Purchase', amount: 250, status: 'completed', company: 'Slots Master', date: '2025-11-25 08:45' },
    { id: 4, username: 'player321', type: 'Cashout', amount: 800, status: 'completed', company: 'Gaming Pro', date: '2025-11-25 08:30' },
    { id: 5, username: 'player654', type: 'Purchase', amount: 1000, status: 'failed', company: 'Bet Zone', date: '2025-11-25 08:00' },
];

export function SuperAdminHistoryTransactions() {
    return (
        <div>
            {/* Superadmin Badge */}
            <div className="mb-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 px-4 py-3 flex items-center gap-2 rounded-lg">
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="font-medium text-primary">Superadmin View - System-Wide Transaction History</span>
            </div>

            <div className="mb-6">
                <h1 className="text-3xl font-bold text-foreground">Transaction History</h1>
                <p className="text-muted-foreground mt-1">View all transactions across the platform (Mock Data)</p>
            </div>

            {/* Transaction Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Total Transactions</div>
                        <div className="text-2xl font-bold text-foreground mt-1">{MOCK_TRANSACTIONS.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Completed</div>
                        <div className="text-2xl font-bold text-green-600 mt-1">
                            {MOCK_TRANSACTIONS.filter(t => t.status === 'completed').length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Pending</div>
                        <div className="text-2xl font-bold text-yellow-600 mt-1">
                            {MOCK_TRANSACTIONS.filter(t => t.status === 'pending').length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Total Volume</div>
                        <div className="text-2xl font-bold text-foreground mt-1">
                            ${MOCK_TRANSACTIONS.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Transactions Table */}
            <Card>
                <CardHeader>
                    <h2 className="text-lg font-semibold">Recent Transactions</h2>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Username</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {MOCK_TRANSACTIONS.map((transaction) => (
                                <TableRow key={transaction.id}>
                                    <TableCell className="font-medium">{transaction.username}</TableCell>
                                    <TableCell>{transaction.company}</TableCell>
                                    <TableCell>{transaction.type}</TableCell>
                                    <TableCell className="font-semibold">${transaction.amount.toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                transaction.status === 'completed' ? 'success' :
                                                    transaction.status === 'pending' ? 'warning' :
                                                        'danger'
                                            }
                                        >
                                            {transaction.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{transaction.date}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
