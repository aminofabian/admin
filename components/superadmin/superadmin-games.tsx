'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, Gamepad2 } from 'lucide-react';
import {
    Card,
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
import { Category2GameApiToggle } from '@/components/superadmin/category2-game-api-toggle';
import { CompanyPicker } from '@/components/superadmin/company-picker';
import type { Company, Game } from '@/types';

interface OffmarketGame extends Game {
    enabled_by_superadmin?: boolean;
    company_id?: number;
    company_name?: string;
}

type SortField = 'title' | 'code' | 'status';
type SortDirection = 'asc' | 'desc';

const SORT_COLUMNS: { field: SortField; label: string }[] = [
    { field: 'title', label: 'Game' },
    { field: 'code', label: 'Code' },
    { field: 'status', label: 'Status' },
];

function compareGames(a: OffmarketGame, b: OffmarketGame, field: SortField): number {
    if (field === 'title') return a.title.localeCompare(b.title);
    if (field === 'code') return a.code.localeCompare(b.code);
    return Number(Boolean(a.enabled_by_superadmin)) - Number(Boolean(b.enabled_by_superadmin));
}

function SortableHead({ label, isActive, direction, onSort }: {
    label: string;
    isActive: boolean;
    direction: SortDirection;
    onSort: () => void;
}) {
    const activeIcon = direction === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />;
    return (
        <TableHead>
            <button
                type="button"
                onClick={onSort}
                className={`flex items-center gap-1 hover:text-primary ${isActive ? 'text-primary' : ''}`}
            >
                {label}
                {isActive ? activeIcon : <ChevronDown className="h-3.5 w-3.5 opacity-30" />}
            </button>
        </TableHead>
    );
}

function StatusBadge({ enabled }: { enabled?: boolean }) {
    return <Badge variant={enabled ? 'success' : 'default'}>{enabled ? 'Enabled' : 'Disabled'}</Badge>;
}

function ToggleGameButton({ enabled, disabled, onClick }: {
    enabled?: boolean;
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <Button size="sm" variant={enabled ? 'ghost' : 'secondary'} onClick={onClick} disabled={disabled}>
            {enabled ? 'Disable' : 'Enable'}
        </Button>
    );
}

export function SuperAdminGames() {
    const [searchTerm, setSearchTerm] = useState('');
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
    const [games, setGames] = useState<OffmarketGame[]>([]);
    const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
    const [isLoadingGames, setIsLoadingGames] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sortField, setSortField] = useState<SortField>('title');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        action: 'toggle';
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

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const filteredGames = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();
        const filtered = search
            ? games.filter((game) =>
                game.title.toLowerCase().includes(search) || game.code.toLowerCase().includes(search))
            : games;
        const sign = sortDirection === 'asc' ? 1 : -1;
        return [...filtered].sort((a, b) => sign * compareGames(a, b, sortField));
    }, [games, searchTerm, sortField, sortDirection]);

    const selectedCompany = companies.find(c => c.id === selectedCompanyId);
    const enabledCount = games.filter((game) => game.enabled_by_superadmin).length;

    if (isLoadingCompanies && companies.length === 0) {
        return <LoadingState />;
    }

    if (error && companies.length === 0) {
        return <ErrorState message={error} onRetry={fetchCompanies} />;
    }

    const renderGames = () => {
        if (!selectedCompanyId) {
            return (
                <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
                    <Gamepad2 className="h-6 w-6 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Pick a company to manage its games</p>
                    <p className="text-xs text-muted-foreground">
                        {companies.length} {companies.length === 1 ? 'company' : 'companies'} available
                    </p>
                </div>
            );
        }
        if (isLoadingGames) {
            return <div className="p-6"><LoadingState /></div>;
        }
        if (filteredGames.length === 0) {
            return (
                <EmptyState
                    title="No games found"
                    description={searchTerm ? `No games match "${searchTerm}"` : `No games available for ${selectedCompany?.project_name ?? 'this company'}`}
                />
            );
        }
        return (
            <>
                <div className="hidden md:block overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {SORT_COLUMNS.map(({ field, label }) => (
                                    <SortableHead
                                        key={field}
                                        label={label}
                                        isActive={sortField === field}
                                        direction={sortDirection}
                                        onSort={() => handleSort(field)}
                                    />
                                ))}
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredGames.map((game) => (
                                <TableRow key={game.id}>
                                    <TableCell className="py-2 font-medium">{game.title}</TableCell>
                                    <TableCell className="py-2"><Badge variant="info">{game.code}</Badge></TableCell>
                                    <TableCell className="py-2"><StatusBadge enabled={game.enabled_by_superadmin} /></TableCell>
                                    <TableCell className="py-2 text-right">
                                        <ToggleGameButton
                                            enabled={game.enabled_by_superadmin}
                                            disabled={confirmModal.isLoading}
                                            onClick={() => handleToggleGame(game.id)}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <ul className="md:hidden divide-y divide-border">
                    {filteredGames.map((game) => (
                        <li key={game.id} className="flex items-center gap-3 px-3 py-2.5">
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{game.title}</p>
                                <div className="mt-1 flex items-center gap-1.5">
                                    <Badge variant="info" className="text-xs px-2 py-0.5">{game.code}</Badge>
                                    <StatusBadge enabled={game.enabled_by_superadmin} />
                                </div>
                            </div>
                            <ToggleGameButton
                                enabled={game.enabled_by_superadmin}
                                disabled={confirmModal.isLoading}
                                onClick={() => handleToggleGame(game.id)}
                            />
                        </li>
                    ))}
                </ul>
            </>
        );
    };

    return (
        <div className="space-y-3 md:space-y-4 pb-6 md:pb-0">
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Games Management</h1>

            <Category2GameApiToggle />

            <Card className="overflow-visible">
                <div className="flex flex-col gap-2 border-b border-border p-3 md:flex-row md:items-center md:px-4">
                    {companies.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No companies available to manage games</p>
                    ) : (
                        <CompanyPicker
                            companies={companies}
                            selectedCompanyId={selectedCompanyId}
                            onSelect={setSelectedCompanyId}
                        />
                    )}
                    {selectedCompany && (
                        <>
                            <div className="w-full md:flex-1">
                                <SearchInput
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search games by title or code..."
                                    className="h-10 text-sm"
                                />
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground">
                                {enabledCount} of {games.length} enabled
                            </span>
                        </>
                    )}
                </div>
                {renderGames()}
            </Card>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={handleCancelAction}
                onConfirm={handleConfirmAction}
                title="Toggle Game Status"
                description="Are you sure you want to toggle this game's status?"
                confirmText="Yes, Toggle"
                cancelText="Cancel"
                variant="info"
                isLoading={confirmModal.isLoading}
            />
        </div>
    );
}
