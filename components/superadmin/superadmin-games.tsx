'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    Card,
    CardHeader,
    CardContent,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Badge,
    SearchInput,
    Button,
    ConfirmModal
} from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { EmptyState, LoadingState, ErrorState } from '@/components/features';
import { gamesApi } from '@/lib/api';
import type { Company, Game } from '@/types';

interface OffmarketGame extends Game {
    enabled_by_superadmin?: boolean;
    company_id?: number;
    company_name?: string;
}

export function SuperAdminGames() {
    const [searchTerm, setSearchTerm] = useState('');
    const [companySearchTerm, setCompanySearchTerm] = useState('');
    const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
    const [games, setGames] = useState<OffmarketGame[]>([]);
    const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
    const [isLoadingGames, setIsLoadingGames] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        action: 'toggle' | 'enableAll' | 'disableAll';
        gameId?: number;
        isLoading: boolean;
    }>({
        isOpen: false,
        action: 'toggle',
        isLoading: false,
    });

    const { addToast } = useToast();

    useEffect(() => {
        fetchCompanies();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (selectedCompanyId) {
            fetchCompanyGames(selectedCompanyId);
        } else {
            setGames([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCompanyId]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (isCompanyDropdownOpen && !target.closest('[data-company-dropdown]')) {
                setIsCompanyDropdownOpen(false);
                setCompanySearchTerm('');
            }
        };

        if (isCompanyDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isCompanyDropdownOpen]);

    const fetchCompanies = async () => {
        setIsLoadingCompanies(true);
        setError(null);
        try {
            const response = await gamesApi.getOffmarketCompanies();
            if (response.companies) {
                setCompanies(response.companies);
                // If there's a selected_company and no company is currently selected, set it and load its games
                if (response.selected_company && !selectedCompanyId) {
                    setSelectedCompanyId(response.selected_company.id);
                    // Also set games if they're included in the response
                    if (response.company_games) {
                        setGames(response.company_games);
                    }
                }
            } else {
                setCompanies([]);
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load companies';
            setError(errorMessage);
            addToast({
                type: 'error',
                title: 'Failed to Load Companies',
                description: errorMessage,
            });
        } finally {
            setIsLoadingCompanies(false);
        }
    };

    const fetchCompanyGames = async (companyId: number) => {
        setIsLoadingGames(true);
        setError(null);
        try {
            const response = await gamesApi.getOffmarketCompanyGames(companyId);
            if (response.company_games) {
                setGames(response.company_games);
            } else {
                setGames([]);
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load games';
            setError(errorMessage);
            addToast({
                type: 'error',
                title: 'Failed to Load Games',
                description: errorMessage,
            });
        } finally {
            setIsLoadingGames(false);
        }
    };

    const handleToggleGame = (gameId: number) => {
        setConfirmModal({
            isOpen: true,
            action: 'toggle',
            gameId,
            isLoading: false,
        });
    };

    const handleEnableAll = () => {
        setConfirmModal({
            isOpen: true,
            action: 'enableAll',
            isLoading: false,
        });
    };

    const handleDisableAll = () => {
        setConfirmModal({
            isOpen: true,
            action: 'disableAll',
            isLoading: false,
        });
    };

    const handleConfirmAction = async () => {
        if (!selectedCompanyId) return;

        setConfirmModal(prev => ({ ...prev, isLoading: true }));

        try {
            if (confirmModal.action === 'toggle' && confirmModal.gameId) {
                await gamesApi.toggleGameStatus(confirmModal.gameId);
                addToast({
                    type: 'success',
                    title: 'Game Status Updated',
                    description: 'Game status has been toggled successfully.',
                });
            } else if (confirmModal.action === 'enableAll') {
                await gamesApi.enableAllGames(selectedCompanyId);
                addToast({
                    type: 'success',
                    title: 'All Games Enabled',
                    description: 'All games have been enabled successfully.',
                });
            } else if (confirmModal.action === 'disableAll') {
                await gamesApi.disableAllGames(selectedCompanyId);
                addToast({
                    type: 'success',
                    title: 'All Games Disabled',
                    description: 'All games have been disabled successfully.',
                });
            }

            // Refresh games after action
            await fetchCompanyGames(selectedCompanyId);
            setConfirmModal({ isOpen: false, action: 'toggle', isLoading: false });
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update games';
            addToast({
                type: 'error',
                title: 'Failed to Update Games',
                description: errorMessage,
            });
            setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
    };

    const handleCancelAction = () => {
        setConfirmModal({ isOpen: false, action: 'toggle', isLoading: false });
    };

    const filteredCompanies = useMemo(() => {
        if (!companySearchTerm.trim()) return companies;

        const search = companySearchTerm.toLowerCase();
        return companies.filter(
            (company) =>
                company.project_name.toLowerCase().includes(search) ||
                company.username.toLowerCase().includes(search)
        );
    }, [companies, companySearchTerm]);

    const filteredGames = useMemo(() => {
        if (!searchTerm.trim()) return games;

        const search = searchTerm.toLowerCase();
        return games.filter(
            (game) =>
                game.title.toLowerCase().includes(search) ||
                game.code.toLowerCase().includes(search)
        );
    }, [games, searchTerm]);

    const selectedCompany = companies.find(c => c.id === selectedCompanyId);

    if (isLoadingCompanies && companies.length === 0) {
        return <LoadingState />;
    }

    if (error && companies.length === 0) {
        return <ErrorState message={error} onRetry={fetchCompanies} />;
    }

    return (
        <div className="md:pb-0 pb-6 -mx-4 md:mx-0 px-2 md:px-0">
            {/* Sticky Mobile Header */}
            <div className="sticky top-0 z-10 md:relative md:top-auto md:z-auto bg-background/95 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none border-b md:border-b-0 mb-4 md:mb-6 -mx-4 md:mx-0 px-2 md:px-0 py-3 md:py-0">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Games Management</h1>
            </div>

            {/* Company Selector - Searchable Dropdown */}
            <Card className="mb-4 md:mb-6 shadow-sm md:shadow-md border md:border-2 rounded-xl md:rounded-lg overflow-visible">
                <CardHeader className="pb-3 md:pb-4 px-4 md:px-6 pt-4 md:pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base md:text-lg font-semibold">Select Company</h2>
                            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                                {companies.length} {companies.length === 1 ? 'company' : 'companies'} available
                            </p>
                        </div>
                        {selectedCompany && (
                            <Badge variant="info" className="hidden md:inline-flex">
                                {games.length} games
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
                    {companies.length === 0 ? (
                        <EmptyState
                            title="No companies found"
                            description="No companies available to manage games"
                        />
                    ) : (
                        <div className="relative" data-company-dropdown>
                            {/* Selected Company Display / Dropdown Trigger */}
                            <button
                                onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
                                className="w-full p-4 md:p-5 rounded-xl border-2 border-border bg-card hover:border-primary/50 hover:bg-accent transition-all text-left group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-[0.99]"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                                        {/* Company Icon */}
                                        <div className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 rounded-xl flex items-center justify-center shadow-sm border border-primary/10">
                                            <svg className="w-6 h-6 md:w-7 md:h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                        </div>

                                        {/* Company Info */}
                                        <div className="flex-1 min-w-0">
                                            {selectedCompany ? (
                                                <>
                                                    <div className="font-semibold text-base md:text-lg text-foreground truncate">
                                                        {selectedCompany.project_name}
                                                    </div>
                                                    <div className="text-sm md:text-base text-muted-foreground mt-0.5 truncate">
                                                        @{selectedCompany.username}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-base md:text-lg text-muted-foreground">
                                                    Choose a company to manage...
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Dropdown Arrow */}
                                    <div className="flex-shrink-0 ml-3">
                                        <svg
                                            className={`w-5 h-5 md:w-6 md:h-6 text-muted-foreground transition-transform duration-200 ${isCompanyDropdownOpen ? 'rotate-180' : ''
                                                }`}
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </button>

                            {/* Dropdown Menu */}
                            {isCompanyDropdownOpen && (
                                <div className="absolute z-50 w-full mt-2 bg-card border-2 border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    {/* Search Input */}
                                    <div className="p-3 border-b border-border bg-muted/30">
                                        <div className="relative">
                                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            <input
                                                type="text"
                                                value={companySearchTerm}
                                                onChange={(e) => setCompanySearchTerm(e.target.value)}
                                                placeholder="Search companies..."
                                                className="w-full pl-10 pr-4 py-2.5 md:py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm md:text-base"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>

                                    {/* Company List */}
                                    <div className="max-h-[300px] md:max-h-[400px] overflow-y-auto">
                                        {filteredCompanies.length === 0 ? (
                                            <div className="p-6 text-center text-muted-foreground">
                                                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <p className="text-sm">No companies match your search</p>
                                            </div>
                                        ) : (
                                            filteredCompanies.map((company) => (
                                                <button
                                                    key={company.id}
                                                    onClick={() => {
                                                        setSelectedCompanyId(company.id);
                                                        setIsCompanyDropdownOpen(false);
                                                        setCompanySearchTerm('');
                                                    }}
                                                    className={`w-full p-3 md:p-4 text-left transition-all hover:bg-accent border-b border-border/50 last:border-b-0 group ${selectedCompanyId === company.id ? 'bg-primary/5' : ''
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {/* Company Avatar */}
                                                        <div className={`flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center font-bold text-sm md:text-base transition-all ${selectedCompanyId === company.id
                                                            ? 'bg-primary text-primary-foreground shadow-md'
                                                            : 'bg-gradient-to-br from-muted to-muted/50 text-muted-foreground group-hover:from-primary/20 group-hover:to-primary/10 group-hover:text-primary'
                                                            }`}>
                                                            {company.project_name.charAt(0).toUpperCase()}
                                                        </div>

                                                        {/* Company Details */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-semibold text-sm md:text-base text-foreground truncate">
                                                                {company.project_name}
                                                            </div>
                                                            <div className="text-xs md:text-sm text-muted-foreground truncate">
                                                                @{company.username}
                                                            </div>
                                                        </div>

                                                        {/* Selected Indicator */}
                                                        {selectedCompanyId === company.id && (
                                                            <div className="flex-shrink-0">
                                                                <svg className="w-5 h-5 md:w-6 md:h-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                </svg>
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Games Table */}
            {selectedCompanyId ? (
                <Card className="shadow-sm md:shadow-md border md:border-2 rounded-xl md:rounded-lg overflow-hidden">
                    <CardHeader className="pb-4 md:pb-6 px-4 md:px-6 pt-4 md:pt-6 border-b">
                        <div className="space-y-4">
                            {/* Title Section */}
                            <div>
                                <h2 className="text-base md:text-lg font-semibold">
                                    {selectedCompany ? `${selectedCompany.project_name} Games` : 'Games'}
                                </h2>
                                {selectedCompany && (
                                    <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">
                                        Managing games for {selectedCompany.username}
                                    </p>
                                )}
                            </div>

                            {/* Full-Width Search */}
                            <div className="w-full">
                                <SearchInput
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search games by title or code..."
                                    className="w-full"
                                />
                            </div>

                            {/* Action Buttons - Organized by Type */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Enable All Card */}
                                <div className="bg-gradient-to-br from-green-50/50 to-emerald-50/30 dark:from-green-950/20 dark:to-emerald-950/10 border border-green-200 dark:border-green-800/50 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="p-1.5 bg-green-500/10 rounded-md">
                                            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-semibold text-green-900 dark:text-green-100">Enable All Games</span>
                                    </div>
                                    <Button
                                        variant="secondary"
                                        onClick={handleEnableAll}
                                        disabled={isLoadingGames || games.length === 0}
                                        className="w-full bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200 active:scale-[0.98] transition-all"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Enable All
                                    </Button>
                                </div>

                                {/* Disable All Card */}
                                <div className="bg-gradient-to-br from-red-50/50 to-orange-50/30 dark:from-red-950/20 dark:to-orange-950/10 border border-red-200 dark:border-red-800/50 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="p-1.5 bg-red-500/10 rounded-md">
                                            <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-semibold text-red-900 dark:text-red-100">Disable All Games</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        onClick={handleDisableAll}
                                        disabled={isLoadingGames || games.length === 0}
                                        className="w-full bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200 active:scale-[0.98] transition-all"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                        </svg>
                                        Disable All
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoadingGames ? (
                            <div className="p-8 flex items-center justify-center">
                                <LoadingState />
                            </div>
                        ) : filteredGames.length === 0 ? (
                            <EmptyState
                                title="No games found"
                                description={searchTerm ? `No games match "${searchTerm}"` : selectedCompany ? `No games available for ${selectedCompany.project_name}` : "Select a company to view games"}
                            />
                        ) : (
                            <>
                                {/* Desktop Table */}
                                <div className="hidden md:block overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Game Name</TableHead>
                                                <TableHead>Code</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredGames.map((game) => (
                                                <TableRow key={game.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                                                                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                            </div>
                                                            <span>{game.title}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="info">{game.code}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={game.enabled_by_superadmin ? 'success' : 'default'}>
                                                            {game.enabled_by_superadmin ? 'Enabled' : 'Disabled'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            size="sm"
                                                            variant={game.enabled_by_superadmin ? 'danger' : 'secondary'}
                                                            onClick={() => handleToggleGame(game.id)}
                                                            disabled={confirmModal.isLoading}
                                                        >
                                                            {game.enabled_by_superadmin ? (
                                                                <>
                                                                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                                    </svg>
                                                                    Disable
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                    Enable
                                                                </>
                                                            )}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Mobile Cards */}
                                <div className="md:hidden space-y-2 px-2 pb-3">
                                    {filteredGames.map((game) => (
                                        <Card
                                            key={game.id}
                                            className="border shadow-md hover:shadow-lg transition-shadow active:scale-[0.99] rounded-2xl overflow-hidden bg-card"
                                        >
                                            <CardContent className="p-3 space-y-2">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                                                        <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold text-base leading-tight mb-2">{game.title}</h3>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Badge variant="info" className="text-xs px-2 py-0.5">{game.code}</Badge>
                                                            <Badge
                                                                variant={game.enabled_by_superadmin ? 'success' : 'default'}
                                                                className="text-xs px-2 py-0.5"
                                                            >
                                                                {game.enabled_by_superadmin ? 'Enabled' : 'Disabled'}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pt-2 border-t">
                                                    <Button
                                                        size="sm"
                                                        variant={game.enabled_by_superadmin ? 'ghost' : 'secondary'}
                                                        onClick={() => handleToggleGame(game.id)}
                                                        disabled={confirmModal.isLoading}
                                                        className={`w-full h-11 text-sm font-medium active:scale-[0.98] ${game.enabled_by_superadmin
                                                            ? 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                                            : ''
                                                            }`}
                                                    >
                                                        {game.enabled_by_superadmin ? (
                                                            <>
                                                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                                </svg>
                                                                Disable
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                Enable
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <Card className="shadow-sm md:shadow-md border md:border-2 rounded-xl md:rounded-lg overflow-hidden">
                    <CardContent className="p-3 md:p-8">
                        <EmptyState
                            title="No Company Selected"
                            description="Please select a company from above to view and manage its games"
                        />
                    </CardContent>
                </Card>
            )
            }

            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={handleCancelAction}
                onConfirm={handleConfirmAction}
                title={
                    confirmModal.action === 'toggle'
                        ? 'Toggle Game Status'
                        : confirmModal.action === 'enableAll'
                            ? 'Enable All Games'
                            : 'Disable All Games'
                }
                description={
                    confirmModal.action === 'toggle'
                        ? 'Are you sure you want to toggle this game\'s status?'
                        : confirmModal.action === 'enableAll'
                            ? `Are you sure you want to enable all games for ${selectedCompany?.project_name || 'this company'}?`
                            : `Are you sure you want to disable all games for ${selectedCompany?.project_name || 'this company'}?`
                }
                confirmText={
                    confirmModal.action === 'toggle'
                        ? 'Yes, Toggle'
                        : confirmModal.action === 'enableAll'
                            ? 'Yes, Enable All'
                            : 'Yes, Disable All'
                }
                cancelText="Cancel"
                variant={confirmModal.action === 'disableAll' ? 'warning' : 'info'}
                isLoading={confirmModal.isLoading}
            />
        </div >
    );
}
