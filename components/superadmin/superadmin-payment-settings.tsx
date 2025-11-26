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
    Button,
    SearchInput,
    ConfirmModal
} from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { EmptyState, LoadingState, ErrorState } from '@/components/features';
import { paymentMethodsApi } from '@/lib/api';
import type { Company, PaymentMethod } from '@/types';

export function SuperAdminPaymentSettings() {
    const [searchTerm, setSearchTerm] = useState('');
    const [companySearchTerm, setCompanySearchTerm] = useState('');
    const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
    const [isLoadingMethods, setIsLoadingMethods] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        action: 'toggleCashout' | 'togglePurchase' | 'enableAllPurchase' | 'enableAllCashout' | 'disableAllPurchase' | 'disableAllCashout';
        paymentMethodId?: number;
        isLoading: boolean;
    }>({
        isOpen: false,
        action: 'toggleCashout',
        isLoading: false,
    });

    const { addToast } = useToast();

    useEffect(() => {
        fetchCompanies();
    }, []);

    useEffect(() => {
        if (selectedCompanyId) {
            fetchCompanyPaymentMethods(selectedCompanyId);
        } else {
            setPaymentMethods([]);
        }
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
            const response = await paymentMethodsApi.getManagementCompanies();
            if (response.companies) {
                setCompanies(response.companies);
                // If there's a selected_company and no company is currently selected, set it and load its payment methods
                if (response.selected_company && !selectedCompanyId) {
                    setSelectedCompanyId(response.selected_company.id);
                    // Also set payment methods if they're included in the response
                    if (response.company_payment_methods) {
                        setPaymentMethods(response.company_payment_methods);
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

    const fetchCompanyPaymentMethods = async (companyId: number) => {
        setIsLoadingMethods(true);
        setError(null);
        try {
            const response = await paymentMethodsApi.getManagementCompanyPaymentMethods(companyId);
            if (response.company_payment_methods) {
                setPaymentMethods(response.company_payment_methods);
            } else {
                setPaymentMethods([]);
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load payment methods';
            setError(errorMessage);
            addToast({
                type: 'error',
                title: 'Failed to Load Payment Methods',
                description: errorMessage,
            });
        } finally {
            setIsLoadingMethods(false);
        }
    };

    const handleToggleCashout = (paymentMethodId: number) => {
        setConfirmModal({
            isOpen: true,
            action: 'toggleCashout',
            paymentMethodId,
            isLoading: false,
        });
    };

    const handleTogglePurchase = (paymentMethodId: number) => {
        setConfirmModal({
            isOpen: true,
            action: 'togglePurchase',
            paymentMethodId,
            isLoading: false,
        });
    };

    const handleEnableAllPurchase = () => {
        setConfirmModal({
            isOpen: true,
            action: 'enableAllPurchase',
            isLoading: false,
        });
    };

    const handleEnableAllCashout = () => {
        setConfirmModal({
            isOpen: true,
            action: 'enableAllCashout',
            isLoading: false,
        });
    };

    const handleDisableAllPurchase = () => {
        setConfirmModal({
            isOpen: true,
            action: 'disableAllPurchase',
            isLoading: false,
        });
    };

    const handleDisableAllCashout = () => {
        setConfirmModal({
            isOpen: true,
            action: 'disableAllCashout',
            isLoading: false,
        });
    };

    const handleConfirmAction = async () => {
        if (!selectedCompanyId) return;

        setConfirmModal(prev => ({ ...prev, isLoading: true }));

        try {
            if (confirmModal.action === 'toggleCashout' && confirmModal.paymentMethodId) {
                await paymentMethodsApi.toggleCashout(confirmModal.paymentMethodId);
                addToast({
                    type: 'success',
                    title: 'Cashout Status Updated',
                    description: 'Payment method cashout status has been toggled successfully.',
                });
            } else if (confirmModal.action === 'togglePurchase' && confirmModal.paymentMethodId) {
                await paymentMethodsApi.togglePurchase(confirmModal.paymentMethodId);
                addToast({
                    type: 'success',
                    title: 'Purchase Status Updated',
                    description: 'Payment method purchase status has been toggled successfully.',
                });
            } else if (confirmModal.action === 'enableAllPurchase') {
                await paymentMethodsApi.enableAllPurchase(selectedCompanyId);
                addToast({
                    type: 'success',
                    title: 'All Purchases Enabled',
                    description: 'All payment methods have been enabled for purchase.',
                });
            } else if (confirmModal.action === 'enableAllCashout') {
                await paymentMethodsApi.enableAllCashout(selectedCompanyId);
                addToast({
                    type: 'success',
                    title: 'All Cashouts Enabled',
                    description: 'All payment methods have been enabled for cashout.',
                });
            } else if (confirmModal.action === 'disableAllPurchase') {
                await paymentMethodsApi.disableAllPurchase(selectedCompanyId);
                addToast({
                    type: 'success',
                    title: 'All Purchases Disabled',
                    description: 'All payment methods have been disabled for purchase.',
                });
            } else if (confirmModal.action === 'disableAllCashout') {
                await paymentMethodsApi.disableAllCashout(selectedCompanyId);
                addToast({
                    type: 'success',
                    title: 'All Cashouts Disabled',
                    description: 'All payment methods have been disabled for cashout.',
                });
            }

            // Refresh payment methods after action
            await fetchCompanyPaymentMethods(selectedCompanyId);
            setConfirmModal({ isOpen: false, action: 'toggleCashout', isLoading: false });
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update payment methods';
            addToast({
                type: 'error',
                title: 'Failed to Update Payment Methods',
                description: errorMessage,
            });
            setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
    };
    const handleCancelAction = () => {
        setConfirmModal({ isOpen: false, action: 'toggleCashout', isLoading: false });
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

    const filteredPaymentMethods = useMemo(() => {
        if (!searchTerm.trim()) return paymentMethods;

        const search = searchTerm.toLowerCase();
        return paymentMethods.filter(
            (method) =>
                method.payment_method_display.toLowerCase().includes(search) ||
                method.payment_method.toLowerCase().includes(search) ||
                (method.method_type && method.method_type.toLowerCase().includes(search))
        );
    }, [paymentMethods, searchTerm]);

    const stats = useMemo(() => {
        const enabledForCashout = paymentMethods.filter(m => m.is_enabled_for_cashout).length;
        const enabledForPurchase = paymentMethods.filter(m => m.is_enabled_for_purchase).length;
        const totalMethods = paymentMethods.length;
        const types = new Set(paymentMethods.map(m => m.method_type).filter(Boolean)).size;

        return {
            total: totalMethods,
            enabledCashout: enabledForCashout,
            enabledPurchase: enabledForPurchase,
            types,
        };
    }, [paymentMethods]);

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
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Payment Methods</h1>
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
                                {paymentMethods.length} methods
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
                    {companies.length === 0 ? (
                        <EmptyState
                            title="No companies found"
                            description="No companies available to manage payment methods"
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

            {/* Payment Stats - Compact Mobile Design */}
            <div className="grid grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800 shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                            <div className="flex-1">
                                <div className="text-xs md:text-sm font-medium text-blue-700 dark:text-blue-300 mb-0.5 md:mb-1">Total</div>
                                <div className="text-xl md:text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</div>
                            </div>
                            <div className="p-2 md:p-3 bg-blue-500/10 rounded-lg md:rounded-xl w-fit">
                                <svg className="w-5 h-5 md:w-8 md:h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-green-200 dark:border-green-800 shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                            <div className="flex-1">
                                <div className="text-xs md:text-sm font-medium text-green-700 dark:text-green-300 mb-0.5 md:mb-1">Purchase</div>
                                <div className="text-xl md:text-3xl font-bold text-green-900 dark:text-green-100">{stats.enabledPurchase}</div>
                            </div>
                            <div className="p-2 md:p-3 bg-green-500/10 rounded-lg md:rounded-xl w-fit">
                                <svg className="w-5 h-5 md:w-8 md:h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 border-purple-200 dark:border-purple-800 shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                            <div className="flex-1">
                                <div className="text-xs md:text-sm font-medium text-purple-700 dark:text-purple-300 mb-0.5 md:mb-1">Cashout</div>
                                <div className="text-xl md:text-3xl font-bold text-purple-900 dark:text-purple-100">{stats.enabledCashout}</div>
                            </div>
                            <div className="p-2 md:p-3 bg-purple-500/10 rounded-lg md:rounded-xl w-fit">
                                <svg className="w-5 h-5 md:w-8 md:h-8 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10 border-orange-200 dark:border-orange-800 shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                            <div className="flex-1">
                                <div className="text-xs md:text-sm font-medium text-orange-700 dark:text-orange-300 mb-0.5 md:mb-1">Types</div>
                                <div className="text-xl md:text-3xl font-bold text-orange-900 dark:text-orange-100">{stats.types}</div>
                            </div>
                            <div className="p-2 md:p-3 bg-orange-500/10 rounded-lg md:rounded-xl w-fit">
                                <svg className="w-5 h-5 md:w-8 md:h-8 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Payment Methods Table */}
            {selectedCompanyId ? (
                <Card className="shadow-sm md:shadow-md border md:border-2 rounded-xl md:rounded-lg overflow-hidden">
                    <CardHeader className="pb-3 md:pb-6 px-2 md:px-6 pt-3 md:pt-6 border-b md:border-b-0">
                        <div className="flex flex-col gap-3 md:gap-4">
                            <div>
                                <h2 className="text-base md:text-lg font-semibold">
                                    {selectedCompany ? `${selectedCompany.project_name} Payment Methods` : 'Payment Methods'}
                                </h2>
                                {selectedCompany && (
                                    <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">
                                        Managing payment methods for {selectedCompany.username}
                                    </p>
                                )}
                            </div>
                            {/* Sticky Search on Mobile */}
                            <div className="sticky top-14 md:static z-10 bg-background/95 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none -mx-4 md:mx-0 px-2 md:px-0 py-2 md:py-0 -mb-2 md:mb-0">
                                <div className="w-full md:w-64">
                                    <SearchInput
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search payment methods..."
                                        className="w-full"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:flex md:flex-row gap-2 md:gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleEnableAllPurchase}
                                    disabled={isLoadingMethods || paymentMethods.length === 0}
                                    className="w-full h-11 md:h-auto text-xs md:text-sm active:scale-[0.98]"
                                >
                                    Enable Purchase
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleEnableAllCashout}
                                    disabled={isLoadingMethods || paymentMethods.length === 0}
                                    className="w-full h-11 md:h-auto text-xs md:text-sm active:scale-[0.98]"
                                >
                                    Enable Cashout
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleDisableAllPurchase}
                                    disabled={isLoadingMethods || paymentMethods.length === 0}
                                    className="w-full h-11 md:h-auto text-xs md:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-[0.98]"
                                >
                                    Disable Purchase
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleDisableAllCashout}
                                    disabled={isLoadingMethods || paymentMethods.length === 0}
                                    className="w-full h-11 md:h-auto text-xs md:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-[0.98]"
                                >
                                    Disable Cashout
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoadingMethods ? (
                            <div className="p-8 flex items-center justify-center">
                                <LoadingState />
                            </div>
                        ) : filteredPaymentMethods.length === 0 ? (
                            <EmptyState
                                title="No payment methods found"
                                description={searchTerm ? `No payment methods match "${searchTerm}"` : selectedCompany ? `No payment methods available for ${selectedCompany.project_name}` : "Select a company to view payment methods"}
                            />
                        ) : (
                            <>
                                {/* Desktop Table */}
                                <div className="hidden md:block overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Payment Method</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Purchase</TableHead>
                                                <TableHead>Cashout</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredPaymentMethods.map((method) => (
                                                <TableRow key={method.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                                                                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <div>{method.payment_method_display}</div>
                                                                <div className="text-xs text-muted-foreground">{method.payment_method}</div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="info">{method.method_type || 'N/A'}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={method.is_enabled_for_purchase ? 'success' : 'default'}>
                                                            {method.is_enabled_for_purchase ? 'Enabled' : 'Disabled'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={method.is_enabled_for_cashout ? 'success' : 'default'}>
                                                            {method.is_enabled_for_cashout ? 'Enabled' : 'Disabled'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant={method.is_enabled_for_purchase ? 'danger' : 'secondary'}
                                                                onClick={() => handleTogglePurchase(method.id)}
                                                                disabled={confirmModal.isLoading}
                                                            >
                                                                {method.is_enabled_for_purchase ? 'Disable Purchase' : 'Enable Purchase'}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant={method.is_enabled_for_cashout ? 'danger' : 'secondary'}
                                                                onClick={() => handleToggleCashout(method.id)}
                                                                disabled={confirmModal.isLoading}
                                                            >
                                                                {method.is_enabled_for_cashout ? 'Disable Cashout' : 'Enable Cashout'}
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Mobile Cards */}
                                <div className="md:hidden space-y-2 px-2 pb-3">
                                    {filteredPaymentMethods.map((method) => (
                                        <Card
                                            key={method.id}
                                            className="border shadow-md hover:shadow-lg transition-shadow active:scale-[0.99] rounded-2xl overflow-hidden bg-card"
                                        >
                                            <CardContent className="p-3 space-y-2">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                                                        <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold text-base leading-tight mb-1">{method.payment_method_display}</h3>
                                                        <p className="text-xs text-muted-foreground mb-2">{method.payment_method}</p>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Badge variant="info" className="text-xs px-2 py-0.5">{method.method_type || 'N/A'}</Badge>
                                                            <Badge
                                                                variant={method.is_enabled_for_purchase ? 'success' : 'default'}
                                                                className="text-xs px-2 py-0.5"
                                                            >
                                                                Purchase: {method.is_enabled_for_purchase ? 'Enabled' : 'Disabled'}
                                                            </Badge>
                                                            <Badge
                                                                variant={method.is_enabled_for_cashout ? 'success' : 'default'}
                                                                className="text-xs px-2 py-0.5"
                                                            >
                                                                Cashout: {method.is_enabled_for_cashout ? 'Enabled' : 'Disabled'}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pt-2 border-t space-y-2">
                                                    <Button
                                                        size="sm"
                                                        variant={method.is_enabled_for_purchase ? 'ghost' : 'secondary'}
                                                        onClick={() => handleTogglePurchase(method.id)}
                                                        disabled={confirmModal.isLoading}
                                                        className={`w-full h-11 text-sm font-medium active:scale-[0.98] ${method.is_enabled_for_purchase
                                                            ? 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                                            : ''
                                                            }`}
                                                    >
                                                        {method.is_enabled_for_purchase ? 'Disable Purchase' : 'Enable Purchase'}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant={method.is_enabled_for_cashout ? 'ghost' : 'secondary'}
                                                        onClick={() => handleToggleCashout(method.id)}
                                                        disabled={confirmModal.isLoading}
                                                        className={`w-full h-11 text-sm font-medium active:scale-[0.98] ${method.is_enabled_for_cashout
                                                            ? 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                                            : ''
                                                            }`}
                                                    >
                                                        {method.is_enabled_for_cashout ? 'Disable Cashout' : 'Enable Cashout'}
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
                            description="Please select a company from above to view and manage its payment methods"
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
                    confirmModal.action === 'toggleCashout'
                        ? 'Toggle Cashout Status'
                        : confirmModal.action === 'togglePurchase'
                            ? 'Toggle Purchase Status'
                            : confirmModal.action === 'enableAllPurchase'
                                ? 'Enable All Purchases'
                                : confirmModal.action === 'enableAllCashout'
                                    ? 'Enable All Cashouts'
                                    : confirmModal.action === 'disableAllPurchase'
                                        ? 'Disable All Purchases'
                                        : 'Disable All Cashouts'
                }
                description={
                    confirmModal.action === 'toggleCashout'
                        ? 'Are you sure you want to toggle this payment method\'s cashout status?'
                        : confirmModal.action === 'togglePurchase'
                            ? 'Are you sure you want to toggle this payment method\'s purchase status?'
                            : confirmModal.action === 'enableAllPurchase'
                                ? `Are you sure you want to enable all payment methods for purchase for ${selectedCompany?.project_name || 'this company'}?`
                                : confirmModal.action === 'enableAllCashout'
                                    ? `Are you sure you want to enable all payment methods for cashout for ${selectedCompany?.project_name || 'this company'}?`
                                    : confirmModal.action === 'disableAllPurchase'
                                        ? `Are you sure you want to disable all payment methods for purchase for ${selectedCompany?.project_name || 'this company'}?`
                                        : `Are you sure you want to disable all payment methods for cashout for ${selectedCompany?.project_name || 'this company'}?`
                }
                confirmText={
                    confirmModal.action === 'toggleCashout' || confirmModal.action === 'togglePurchase'
                        ? 'Yes, Toggle'
                        : confirmModal.action === 'enableAllPurchase' || confirmModal.action === 'enableAllCashout'
                            ? 'Yes, Enable All'
                            : 'Yes, Disable All'
                }
                cancelText="Cancel"
                variant={confirmModal.action === 'disableAllPurchase' || confirmModal.action === 'disableAllCashout' ? 'warning' : 'info'}
                isLoading={confirmModal.isLoading}
            />
        </div>
    );
}
