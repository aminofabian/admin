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
    }, []);

    useEffect(() => {
        if (selectedCompanyId) {
            fetchCompanyGames(selectedCompanyId);
        } else {
            setGames([]);
        }
    }, [selectedCompanyId]);

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

    const filteredGames = useMemo(() => {
        if (!searchTerm.trim()) return games;
        
        const search = searchTerm.toLowerCase();
        return games.filter(
            (game) =>
                game.title.toLowerCase().includes(search) ||
                game.code.toLowerCase().includes(search)
        );
    }, [games, searchTerm]);

    const stats = useMemo(() => {
        const activeGames = games.filter(g => g.enabled_by_superadmin).length;
        const totalGames = games.length;
        
        return {
            total: totalGames,
            active: activeGames,
            inactive: totalGames - activeGames,
        };
    }, [games]);

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

            {/* Company Selector */}
            <Card className="mb-4 md:mb-6 shadow-sm md:shadow-md border md:border-2 rounded-xl md:rounded-lg overflow-hidden">
                <CardHeader className="pb-3 md:pb-6 px-4 md:px-6 pt-4 md:pt-6">
                    <h2 className="text-base md:text-lg font-semibold">Select Company</h2>
                </CardHeader>
                <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
                    {companies.length === 0 ? (
                        <EmptyState
                            title="No companies found"
                            description="No companies available to manage games"
                        />
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3">
                            {companies.map((company) => (
                                <button
                                    key={company.id}
                                    onClick={() => setSelectedCompanyId(company.id)}
                                    className={`relative p-3 md:p-4 rounded-xl md:rounded-lg border-2 transition-all text-left w-full group active:scale-[0.97] md:active:scale-[0.98] ${
                                        selectedCompanyId === company.id
                                            ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30 md:shadow-md md:shadow-primary/20'
                                            : 'border-border bg-card hover:border-primary/50 hover:bg-accent hover:shadow-lg md:hover:shadow-md'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className={`font-semibold text-sm md:text-base truncate ${selectedCompanyId === company.id ? 'text-primary-foreground' : 'text-foreground'}`}>
                                                {company.project_name}
                                            </div>
                                            <div className={`text-xs md:text-sm mt-0.5 md:mt-1 truncate ${selectedCompanyId === company.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                                {company.username}
                                            </div>
                                        </div>
                                        {selectedCompanyId === company.id && (
                                            <div className="ml-2 md:ml-3 flex-shrink-0">
                                                <svg className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Games Stats - Compact Mobile Design */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800 shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                            <div className="flex-1">
                                <div className="text-xs md:text-sm font-medium text-blue-700 dark:text-blue-300 mb-0.5 md:mb-1">Total</div>
                                <div className="text-xl md:text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</div>
                            </div>
                            <div className="p-2 md:p-3 bg-blue-500/10 rounded-lg md:rounded-xl w-fit">
                                <svg className="w-5 h-5 md:w-8 md:h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-green-200 dark:border-green-800 shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                            <div className="flex-1">
                                <div className="text-xs md:text-sm font-medium text-green-700 dark:text-green-300 mb-0.5 md:mb-1">Active</div>
                                <div className="text-xl md:text-3xl font-bold text-green-900 dark:text-green-100">{stats.active}</div>
                            </div>
                            <div className="p-2 md:p-3 bg-green-500/10 rounded-lg md:rounded-xl w-fit">
                                <svg className="w-5 h-5 md:w-8 md:h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 border-red-200 dark:border-red-800 shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                            <div className="flex-1">
                                <div className="text-xs md:text-sm font-medium text-red-700 dark:text-red-300 mb-0.5 md:mb-1">Inactive</div>
                                <div className="text-xl md:text-3xl font-bold text-red-900 dark:text-red-100">{stats.inactive}</div>
                            </div>
                            <div className="p-2 md:p-3 bg-red-500/10 rounded-lg md:rounded-xl w-fit">
                                <svg className="w-5 h-5 md:w-8 md:h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Games Table */}
            {selectedCompanyId ? (
                <Card className="shadow-sm md:shadow-md border md:border-2 rounded-xl md:rounded-lg overflow-hidden">
                    <CardHeader className="pb-3 md:pb-6 px-4 md:px-6 pt-4 md:pt-6 border-b md:border-b-0">
                        <div className="flex flex-col gap-3 md:gap-4">
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
                            {/* Sticky Search on Mobile */}
                            <div className="sticky top-14 md:static z-10 bg-background/95 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none -mx-4 md:mx-0 px-2 md:px-0 py-2 md:py-0 -mb-2 md:mb-0">
                                <div className="w-full md:w-64">
                                    <SearchInput
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search games..."
                                        className="w-full"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:flex md:flex-row gap-2 md:gap-3">
                                <Button
                                    variant="secondary"
                                    onClick={handleEnableAll}
                                    disabled={isLoadingGames || games.length === 0}
                                    className="w-full h-11 md:h-auto text-sm md:text-base active:scale-[0.98]"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Enable All
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={handleDisableAll}
                                    disabled={isLoadingGames || games.length === 0}
                                    className="w-full h-11 md:h-auto text-sm md:text-base active:scale-[0.98]"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                    Disable All
                                </Button>
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
                                <div className="md:hidden space-y-3 px-4 pb-4">
                                    {filteredGames.map((game) => (
                                        <Card 
                                            key={game.id} 
                                            className="border shadow-md hover:shadow-lg transition-shadow active:scale-[0.99] rounded-2xl overflow-hidden bg-card"
                                        >
                                            <CardContent className="p-4 space-y-3">
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
                                                        className={`w-full h-11 text-sm font-medium active:scale-[0.98] ${
                                                            game.enabled_by_superadmin 
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
                    <CardContent className="p-6 md:p-8">
                        <EmptyState
                            title="No Company Selected"
                            description="Please select a company from above to view and manage its games"
                        />
                    </CardContent>
                </Card>
            )}

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
        </div>
    );
}
