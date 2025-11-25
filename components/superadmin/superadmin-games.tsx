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
                await gamesApi.enableAllGames();
                addToast({
                    type: 'success',
                    title: 'All Games Enabled',
                    description: 'All games have been enabled successfully.',
                });
            } else if (confirmModal.action === 'disableAll') {
                await gamesApi.disableAllGames();
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
                game.code.toLowerCase().includes(search) ||
                (game.game_category && game.game_category.toLowerCase().includes(search))
        );
    }, [games, searchTerm]);

    const stats = useMemo(() => {
        const activeGames = games.filter(g => g.enabled_by_superadmin).length;
        const totalGames = games.length;
        const categories = new Set(games.map(g => g.game_category).filter(Boolean)).size;
        
        return {
            total: totalGames,
            active: activeGames,
            inactive: totalGames - activeGames,
            categories,
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
                <p className="text-muted-foreground mt-1">Manage games across all companies</p>
            </div>

            {/* Company Selector */}
            <Card className="mb-6">
                <CardHeader>
                    <h2 className="text-lg font-semibold">Select Company</h2>
                </CardHeader>
                <CardContent>
                    {companies.length === 0 ? (
                        <EmptyState
                            title="No companies found"
                            description="No companies available to manage games"
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            {companies.map((company) => (
                                <button
                                    key={company.id}
                                    onClick={() => setSelectedCompanyId(company.id)}
                                    className={`relative p-4 rounded-lg border-2 transition-all text-left w-full group ${
                                        selectedCompanyId === company.id
                                            ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20'
                                            : 'border-border bg-card hover:border-primary/50 hover:bg-accent hover:shadow-md active:scale-[0.98]'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className={`font-semibold ${selectedCompanyId === company.id ? 'text-primary-foreground' : 'text-foreground'}`}>
                                                {company.project_name}
                                            </div>
                                            <div className={`text-sm mt-1 ${selectedCompanyId === company.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                                {company.username}
                                            </div>
                                        </div>
                                        {selectedCompanyId === company.id && (
                                            <div className="ml-3 flex-shrink-0">
                                                <svg className="w-5 h-5 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
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

            {/* Games Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Total Games</div>
                                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</div>
                            </div>
                            <div className="p-3 bg-blue-500/10 rounded-xl">
                                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-green-200 dark:border-green-800">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">Active Games</div>
                                <div className="text-3xl font-bold text-green-900 dark:text-green-100">{stats.active}</div>
                            </div>
                            <div className="p-3 bg-green-500/10 rounded-xl">
                                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 border-red-200 dark:border-red-800">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">Inactive Games</div>
                                <div className="text-3xl font-bold text-red-900 dark:text-red-100">{stats.inactive}</div>
                            </div>
                            <div className="p-3 bg-red-500/10 rounded-xl">
                                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10 border-orange-200 dark:border-orange-800">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-1">Categories</div>
                                <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">{stats.categories}</div>
                            </div>
                            <div className="p-3 bg-orange-500/10 rounded-xl">
                                <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Games Table */}
            {selectedCompanyId ? (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    {selectedCompany ? `${selectedCompany.project_name} Games` : 'Games'}
                                </h2>
                                {selectedCompany && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Managing games for {selectedCompany.username}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-64">
                                    <SearchInput
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search games..."
                                    />
                                </div>
                                <Button
                                    variant="secondary"
                                    onClick={handleEnableAll}
                                    disabled={isLoadingGames || games.length === 0}
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
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Game Name</TableHead>
                                        <TableHead>Code</TableHead>
                                        <TableHead>Category</TableHead>
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
                                                <span className="text-sm text-muted-foreground">
                                                    {game.game_category || 'N/A'}
                                                </span>
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
                        )}
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="p-8">
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
