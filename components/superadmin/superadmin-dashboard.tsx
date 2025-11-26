'use client';

import { useState } from 'react';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import { Card, CardHeader, CardContent } from '@/components/ui';
import {
    SuperAdminCompanies,
    SuperAdminGames,
    SuperAdminHistoryTransactions,
    SuperAdminHistoryGameActivities,
    SuperAdminPaymentSettings,
} from '@/components/superadmin';

type QuickActionSection = 'companies' | 'games' | 'payment-settings' | 'transactions' | 'game-activities' | 'system-settings';

export function SuperAdminDashboard() {
    const { stats, loading: statsLoading } = useDashboardStats();
    const [activeSection, setActiveSection] = useState<QuickActionSection | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleQuickActionClick = (section: QuickActionSection) => {
        setActiveSection(section);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTimeout(() => setActiveSection(null), 300);
    };

    const renderSection = () => {
        switch (activeSection) {
            case 'companies':
                return <SuperAdminCompanies />;
            case 'games':
                return <SuperAdminGames />;
            case 'payment-settings':
                return <SuperAdminPaymentSettings />;
            case 'transactions':
                return <SuperAdminHistoryTransactions />;
            case 'game-activities':
                return <SuperAdminHistoryGameActivities />;
            case 'system-settings':
                return <div className="p-6 text-center text-muted-foreground">System Settings - Coming Soon</div>;
            default:
                return null;
        }
    };

    const getSectionTitle = () => {
        if (!activeSection) return '';

        const titleMap: Record<QuickActionSection, string> = {
            'companies': 'Companies',
            'games': 'Games',
            'payment-settings': 'Payment Settings',
            'transactions': 'Transactions',
            'game-activities': 'Game Activities',
            'system-settings': 'System Settings',
        };

        return titleMap[activeSection] || activeSection;
    };

    return (
        <>
            {/* Full Screen Modal for Quick Actions */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                        onClick={handleCloseModal}
                    />

                    {/* Modal Content */}
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                        <div className="relative w-full h-full max-w-7xl bg-background shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                            {/* Modal Header */}
                            <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-foreground">{getSectionTitle()}</h2>
                                <button
                                    onClick={handleCloseModal}
                                    className="p-2 hover:bg-muted transition-colors rounded-lg"
                                    title="Close"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="overflow-y-auto h-[calc(100%-5rem)] p-6">
                                {renderSection()}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-4 md:space-y-6 md:pb-0 pb-6 -mx-4 md:mx-0 px-2 md:px-0">
            {/* Sticky Mobile Header */}
            <div className="sticky top-0 z-10 md:relative md:top-auto md:z-auto bg-background/95 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none border-b md:border-b-0 mb-4 md:mb-6 -mx-4 md:mx-0 px-2 md:px-0 py-3 md:py-0">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Superadmin Dashboard</h1>
            </div>

            {/* Stats and Quick Actions Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Quick Actions - Left Side */}
                <div className="lg:col-span-4 relative">
                {/* Creative Header */}
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary via-primary/80 to-primary/60 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-background rounded-full animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                                Quick Actions
                            </h3>
                            <p className="text-xs text-muted-foreground">Instant access to key features</p>
                        </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20">
                        <span className="text-sm font-bold text-primary">6</span>
                        <span className="text-xs text-muted-foreground">items</span>
                    </div>
                </div>

                {/* Main Grid Container - Mobile App Style */}
                <div className="grid grid-cols-3 lg:grid-cols-2 gap-2.5 sm:gap-3">
                    {/* Companies */}
                    <button
                        onClick={() => handleQuickActionClick('companies')}
                        className="group relative w-full flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2.5 sm:p-3 lg:p-4 2xl:p-2.5 min-h-[85px] sm:min-h-[95px] lg:min-h-[110px] 2xl:min-h-[95px] rounded-2xl border transition-all duration-200 bg-gradient-to-br from-card/95 via-card/90 to-card/85 hover:from-card hover:via-card/95 hover:to-card/90 border-border/30 hover:border-primary/30 shadow-md hover:shadow-lg active:scale-[0.97]"
                        title="Companies"
                    >
                        {/* Icon Container */}
                        <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 2xl:w-8 2xl:h-8 flex items-center justify-center transition-all duration-200 opacity-70 group-hover:opacity-100">
                            <div className="transition-all duration-200 w-4 h-4 sm:w-5 sm:h-5 lg:w-5 lg:h-5 2xl:w-4 2xl:h-4 text-foreground">
                                <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                        </div>
                        {/* Text Label */}
                        <div className="w-full text-center px-1">
                            <div className="text-xs lg:text-sm 2xl:text-xs font-medium transition-colors duration-200 leading-tight line-clamp-2 text-foreground">
                                Companies
                            </div>
                        </div>
                    </button>

                    {/* Games */}
                    <button
                        onClick={() => handleQuickActionClick('games')}
                        className="group relative w-full flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2.5 sm:p-3 lg:p-4 2xl:p-2.5 min-h-[85px] sm:min-h-[95px] lg:min-h-[110px] 2xl:min-h-[95px] rounded-2xl border transition-all duration-200 bg-gradient-to-br from-card/95 via-card/90 to-card/85 hover:from-card hover:via-card/95 hover:to-card/90 border-border/30 hover:border-primary/30 shadow-md hover:shadow-lg active:scale-[0.97]"
                        title="Games"
                    >
                        <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 2xl:w-8 2xl:h-8 flex items-center justify-center transition-all duration-200 opacity-70 group-hover:opacity-100">
                            <div className="transition-all duration-200 w-4 h-4 sm:w-5 sm:h-5 lg:w-5 lg:h-5 2xl:w-4 2xl:h-4 text-foreground">
                                <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                        <div className="w-full text-center px-1">
                            <div className="text-xs lg:text-sm 2xl:text-xs font-medium transition-colors duration-200 leading-tight line-clamp-2 text-foreground">
                                Games
                            </div>
                        </div>
                    </button>

                    {/* Payment Methods */}
                    <button
                        onClick={() => handleQuickActionClick('payment-settings')}
                        className="group relative w-full flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2.5 sm:p-3 lg:p-4 2xl:p-2.5 min-h-[85px] sm:min-h-[95px] lg:min-h-[110px] 2xl:min-h-[95px] rounded-2xl border transition-all duration-200 bg-gradient-to-br from-card/95 via-card/90 to-card/85 hover:from-card hover:via-card/95 hover:to-card/90 border-border/30 hover:border-primary/30 shadow-md hover:shadow-lg active:scale-[0.97]"
                        title="Payment Methods"
                    >
                        <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 2xl:w-8 2xl:h-8 flex items-center justify-center transition-all duration-200 opacity-70 group-hover:opacity-100">
                            <div className="transition-all duration-200 w-4 h-4 sm:w-5 sm:h-5 lg:w-5 lg:h-5 2xl:w-4 2xl:h-4 text-foreground">
                                <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                            </div>
                        </div>
                        <div className="w-full text-center px-1">
                            <div className="text-xs lg:text-sm 2xl:text-xs font-medium transition-colors duration-200 leading-tight line-clamp-2 text-foreground">
                                Payment Methods
                            </div>
                        </div>
                    </button>

                    {/* Transactions */}
                    <button
                        onClick={() => handleQuickActionClick('transactions')}
                        className="group relative w-full flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2.5 sm:p-3 lg:p-4 2xl:p-2.5 min-h-[85px] sm:min-h-[95px] lg:min-h-[110px] 2xl:min-h-[95px] rounded-2xl border transition-all duration-200 bg-gradient-to-br from-card/95 via-card/90 to-card/85 hover:from-card hover:via-card/95 hover:to-card/90 border-border/30 hover:border-primary/30 shadow-md hover:shadow-lg active:scale-[0.97]"
                        title="Transactions"
                    >
                        <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 2xl:w-8 2xl:h-8 flex items-center justify-center transition-all duration-200 opacity-70 group-hover:opacity-100">
                            <div className="transition-all duration-200 w-4 h-4 sm:w-5 sm:h-5 lg:w-5 lg:h-5 2xl:w-4 2xl:h-4 text-foreground">
                                <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                        </div>
                        <div className="w-full text-center px-1">
                            <div className="text-xs lg:text-sm 2xl:text-xs font-medium transition-colors duration-200 leading-tight line-clamp-2 text-foreground">
                                Transactions
                            </div>
                        </div>
                    </button>

                    {/* Game Activities */}
                    <button
                        onClick={() => handleQuickActionClick('game-activities')}
                        className="group relative w-full flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2.5 sm:p-3 lg:p-4 2xl:p-2.5 min-h-[85px] sm:min-h-[95px] lg:min-h-[110px] 2xl:min-h-[95px] rounded-2xl border transition-all duration-200 bg-gradient-to-br from-card/95 via-card/90 to-card/85 hover:from-card hover:via-card/95 hover:to-card/90 border-border/30 hover:border-primary/30 shadow-md hover:shadow-lg active:scale-[0.97]"
                        title="Game Activities"
                    >
                        <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 2xl:w-8 2xl:h-8 flex items-center justify-center transition-all duration-200 opacity-70 group-hover:opacity-100">
                            <div className="transition-all duration-200 w-4 h-4 sm:w-5 sm:h-5 lg:w-5 lg:h-5 2xl:w-4 2xl:h-4 text-foreground">
                                <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                        </div>
                        <div className="w-full text-center px-1">
                            <div className="text-xs lg:text-sm 2xl:text-xs font-medium transition-colors duration-200 leading-tight line-clamp-2 text-foreground">
                                Game Activities
                            </div>
                        </div>
                    </button>

                    {/* System Settings */}
                    <button
                        onClick={() => handleQuickActionClick('system-settings')}
                        className="group relative w-full flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2.5 sm:p-3 lg:p-4 2xl:p-2.5 min-h-[85px] sm:min-h-[95px] lg:min-h-[110px] 2xl:min-h-[95px] rounded-2xl border transition-all duration-200 bg-gradient-to-br from-card/95 via-card/90 to-card/85 hover:from-card hover:via-card/95 hover:to-card/90 border-border/30 hover:border-primary/30 shadow-md hover:shadow-lg active:scale-[0.97]"
                        title="System Settings"
                    >
                        <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 2xl:w-8 2xl:h-8 flex items-center justify-center transition-all duration-200 opacity-70 group-hover:opacity-100">
                            <div className="transition-all duration-200 w-4 h-4 sm:w-5 sm:h-5 lg:w-5 lg:h-5 2xl:w-4 2xl:h-4 text-foreground">
                                <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                        </div>
                        <div className="w-full text-center px-1">
                            <div className="text-xs lg:text-sm 2xl:text-xs font-medium transition-colors duration-200 leading-tight line-clamp-2 text-foreground">
                                System Settings
                            </div>
                        </div>
                    </button>
                </div>

                {/* Footer Info */}
                <div className="mt-4 pt-4 border-t border-border/30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                            <p className="text-xs text-muted-foreground">
                                6 quick actions available
                            </p>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-1 h-1 bg-primary/40 rounded-full" />
                            <div className="w-1 h-1 bg-primary/60 rounded-full" />
                            <div className="w-1 h-1 bg-primary/80 rounded-full" />
                        </div>
                    </div>
                </div>
                </div>

                {/* Key Metrics Grid - Right Side */}
                <div className="lg:col-span-8 space-y-4 md:space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-6">
                    {/* Total Companies */}
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800 shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden">
                        <CardContent className="p-3 md:p-6">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                                <div className="flex-1">
                                    <p className="text-xs md:text-sm font-medium text-blue-700 dark:text-blue-300 mb-0.5 md:mb-1">Companies</p>
                                    <p className="text-xl md:text-3xl font-bold text-blue-900 dark:text-blue-100">
                                        {statsLoading ? '...' : (stats?.totalCompanies ?? 0)}
                                    </p>
                                </div>
                                <div className="p-2 md:p-3 bg-blue-500/10 rounded-lg md:rounded-xl w-fit">
                                    <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Total Players */}
                    <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-green-200 dark:border-green-800 shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden">
                        <CardContent className="p-3 md:p-6">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                                <div className="flex-1">
                                    <p className="text-xs md:text-sm font-medium text-green-700 dark:text-green-300 mb-0.5 md:mb-1">Players</p>
                                    <p className="text-xl md:text-3xl font-bold text-green-900 dark:text-green-100">
                                        {statsLoading ? '...' : (stats?.totalPlayers ?? 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-2 md:p-3 bg-green-500/10 rounded-lg md:rounded-xl w-fit">
                                    <svg className="w-5 h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Active Games */}
                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 border-purple-200 dark:border-purple-800 shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden">
                        <CardContent className="p-3 md:p-6">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                                <div className="flex-1">
                                    <p className="text-xs md:text-sm font-medium text-purple-700 dark:text-purple-300 mb-0.5 md:mb-1">Games</p>
                                    <p className="text-xl md:text-3xl font-bold text-purple-900 dark:text-purple-100">
                                        {statsLoading ? '...' : (stats?.activeGames ?? 0)}
                                    </p>
                                </div>
                                <div className="p-2 md:p-3 bg-purple-500/10 rounded-lg md:rounded-xl w-fit">
                                    <svg className="w-5 h-5 md:w-6 md:h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Platform Liquidity */}
                    <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10 border-amber-200 dark:border-amber-800 shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden">
                        <CardContent className="p-3 md:p-6">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                                <div className="flex-1">
                                    <p className="text-xs md:text-sm font-medium text-amber-700 dark:text-amber-300 mb-0.5 md:mb-1">Liquidity</p>
                                    <p className="text-xl md:text-3xl font-bold text-amber-900 dark:text-amber-100">
                                        {statsLoading ? '...' : `$${(stats?.platformLiquidity ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                    </p>
                                </div>
                                <div className="p-2 md:p-3 bg-amber-500/10 rounded-lg md:rounded-xl w-fit">
                                    <svg className="w-5 h-5 md:w-6 md:h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* System Status - Below Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <Card className="shadow-sm md:shadow-md border md:border-2 rounded-xl md:rounded-lg overflow-hidden">
                    <CardHeader className="pb-3 md:pb-6 px-4 md:px-6 pt-4 md:pt-6">
                        <h2 className="text-base md:text-lg font-semibold">System Health</h2>
                    </CardHeader>
                    <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
                        <div className="space-y-3 md:space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm text-foreground">API Server</span>
                                </div>
                                <span className="text-sm font-medium text-green-500">Online</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm text-foreground">Database</span>
                                </div>
                                <span className="text-sm font-medium text-green-500">Connected</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm text-foreground">WebSocket</span>
                                </div>
                                <span className="text-sm font-medium text-green-500">Active</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm md:shadow-md border md:border-2 rounded-xl md:rounded-lg overflow-hidden">
                    <CardHeader className="pb-3 md:pb-6 px-4 md:px-6 pt-4 md:pt-6">
                        <h2 className="text-base md:text-lg font-semibold">Recent Activity</h2>
                    </CardHeader>
                    <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">No recent system alerts</p>
                        </div>
                    </CardContent>
                </Card>
                </div>
                </div>
            </div>
        </div>
        </>
    );
}
