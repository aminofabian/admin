'use client';

import { useEffect, useMemo } from 'react';
import { Card, CardHeader, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Skeleton } from '@/components/ui';
import { useTransactionsStore } from '@/stores';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { EmptyState } from '@/components/features';

export function SuperAdminHistoryTransactions() {
    const transactions = useTransactionsStore((state) => state.transactions);
    const isLoading = useTransactionsStore((state) => state.isLoading);
    const error = useTransactionsStore((state) => state.error);
    const setFilter = useTransactionsStore((state) => state.setFilter);

    // Set filter to 'history' and fetch transactions on mount
    useEffect(() => {
        setFilter('history');
    }, [setFilter]);

    // Calculate stats from actual data
    const stats = useMemo(() => {
        const results = transactions?.results || [];
        
        const totalTransactions = results.length;
        const completed = results.filter(t => t.status === 'completed').length;
        const pending = results.filter(t => t.status === 'pending').length;
        const totalVolume = results.reduce((sum, t) => {
            const amount = parseFloat(t.amount || '0');
            return sum + amount;
        }, 0);

        return {
            totalTransactions,
            completed,
            pending,
            totalVolume,
        };
    }, [transactions]);

    const transactionList = transactions?.results || [];

    if (isLoading && !transactionList.length) {
        return (
            <div className="md:pb-0 pb-6 -mx-4 md:mx-0 px-2 md:px-0">
                <div className="sticky top-0 z-10 md:relative md:top-auto md:z-auto bg-background/95 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none border-b md:border-b-0 mb-4 md:mb-6 -mx-4 md:mx-0 px-2 md:px-0 py-3 md:py-0">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">Transaction History</h1>
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="md:pb-0 pb-6 -mx-4 md:mx-0 px-2 md:px-0">
                <div className="sticky top-0 z-10 md:relative md:top-auto md:z-auto bg-background/95 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none border-b md:border-b-0 mb-4 md:mb-6 -mx-4 md:mx-0 px-2 md:px-0 py-3 md:py-0">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">Transaction History</h1>
                </div>
                <Card className="p-6">
                    <div className="text-center text-red-600 dark:text-red-400">
                        <p className="font-semibold">Error loading transactions</p>
                        <p className="text-sm mt-2">{error}</p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="md:pb-0 pb-6 -mx-4 md:mx-0 px-2 md:px-0">
            {/* Sticky Mobile Header */}
            <div className="sticky top-0 z-10 md:relative md:top-auto md:z-auto bg-background/95 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none border-b md:border-b-0 mb-4 md:mb-6 -mx-4 md:mx-0 px-2 md:px-0 py-3 md:py-0">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Transaction History</h1>
            </div>

            {/* Transaction Stats - Compact Mobile Design */}
            <div className="grid grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800 shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                            <div className="flex-1">
                                <div className="text-xs md:text-sm font-medium text-blue-700 dark:text-blue-300 mb-0.5 md:mb-1">Total</div>
                                <div className="text-xl md:text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.totalTransactions}</div>
                            </div>
                            <div className="p-2 md:p-3 bg-blue-500/10 rounded-lg md:rounded-xl w-fit">
                                <svg className="w-5 h-5 md:w-8 md:h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-green-200 dark:border-green-800 shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                            <div className="flex-1">
                                <div className="text-xs md:text-sm font-medium text-green-700 dark:text-green-300 mb-0.5 md:mb-1">Completed</div>
                                <div className="text-xl md:text-3xl font-bold text-green-900 dark:text-green-100">{stats.completed}</div>
                            </div>
                            <div className="p-2 md:p-3 bg-green-500/10 rounded-lg md:rounded-xl w-fit">
                                <svg className="w-5 h-5 md:w-8 md:h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950/20 dark:to-yellow-900/10 border-yellow-200 dark:border-yellow-800 shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                            <div className="flex-1">
                                <div className="text-xs md:text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-0.5 md:mb-1">Pending</div>
                                <div className="text-xl md:text-3xl font-bold text-yellow-900 dark:text-yellow-100">{stats.pending}</div>
                            </div>
                            <div className="p-2 md:p-3 bg-yellow-500/10 rounded-lg md:rounded-xl w-fit">
                                <svg className="w-5 h-5 md:w-8 md:h-8 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 border-purple-200 dark:border-purple-800 shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                            <div className="flex-1">
                                <div className="text-xs md:text-sm font-medium text-purple-700 dark:text-purple-300 mb-0.5 md:mb-1">Volume</div>
                                <div className="text-xl md:text-3xl font-bold text-purple-900 dark:text-purple-100">
                                    {formatCurrency(String(stats.totalVolume))}
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
            </div>

            {/* Transactions Table */}
            <Card className="shadow-sm md:shadow-md border md:border-2 rounded-xl md:rounded-lg overflow-hidden">
                <CardHeader className="pb-3 md:pb-6 px-2 md:px-6 pt-3 md:pt-6 border-b md:border-b-0">
                    <h2 className="text-base md:text-lg font-semibold">Recent Transactions</h2>
                </CardHeader>
                <CardContent className="p-0">
                    {transactionList.length === 0 ? (
                        <div className="py-12">
                            <EmptyState 
                                title="No transactions found" 
                                description="No completed or cancelled transactions found"
                            />
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Username</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactionList.map((transaction) => {
                                            const username = transaction.user?.username || transaction.username || `User ${transaction.user_id || transaction.id}`;
                                            const transactionType = transaction.txn_type || transaction.type || '—';
                                            
                                            return (
                                                <TableRow key={transaction.id}>
                                                    <TableCell className="font-medium">{username}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="info" className="capitalize">
                                                            {transactionType}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="font-semibold">
                                                        {formatCurrency(transaction.amount || '0')}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={
                                                                transaction.status === 'completed' ? 'success' :
                                                                transaction.status === 'pending' ? 'warning' :
                                                                transaction.status === 'failed' ? 'danger' : 'default'
                                                            }
                                                            className="capitalize"
                                                        >
                                                            {transaction.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {formatDate(transaction.created)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="md:hidden space-y-2 px-2 pb-3">
                                {transactionList.map((transaction) => {
                                    const username = transaction.user?.username || transaction.username || `User ${transaction.user_id || transaction.id}`;
                                    const transactionType = transaction.txn_type || transaction.type || '—';
                                    
                                    return (
                                        <Card 
                                            key={transaction.id} 
                                            className="border shadow-md hover:shadow-lg transition-shadow active:scale-[0.99] rounded-2xl overflow-hidden bg-card"
                                        >
                                            <CardContent className="p-3 space-y-2">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold text-base leading-tight mb-1">{username}</h3>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Badge 
                                                                variant={
                                                                    transaction.status === 'completed' ? 'success' :
                                                                    transaction.status === 'pending' ? 'warning' :
                                                                    transaction.status === 'failed' ? 'danger' : 'default'
                                                                }
                                                                className="text-xs px-2 py-0.5 capitalize"
                                                            >
                                                                {transaction.status}
                                                            </Badge>
                                                            <Badge variant="info" className="text-xs px-2 py-0.5 capitalize">
                                                                {transactionType}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 text-sm pt-2 border-t">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium text-muted-foreground">Amount:</span>
                                                        <span className="font-semibold">{formatCurrency(transaction.amount || '0')}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium text-muted-foreground">Date:</span>
                                                        <span className="text-xs text-muted-foreground">{formatDate(transaction.created)}</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
