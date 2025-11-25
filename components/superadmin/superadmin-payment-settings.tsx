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
        <div>
            {/* Superadmin Badge */}
            <div className="mb-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 px-4 py-3 flex items-center gap-2 rounded-lg">
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="font-medium text-primary">Superadmin View - System Payment Configuration</span>
            </div>

            <div className="mb-6">
                <h1 className="text-3xl font-bold text-foreground">Payment Methods</h1>
                <p className="text-muted-foreground mt-1">Manage payment methods across all companies</p>
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
                            description="No companies available to manage payment methods"
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {companies.map((company) => (
                                <button
                                    key={company.id}
                                    onClick={() => setSelectedCompanyId(company.id)}
                                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                                        selectedCompanyId === company.id
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/50'
                                    }`}
                                >
                                    <div className="font-medium text-foreground">{company.project_name}</div>
                                    <div className="text-sm text-muted-foreground mt-1">{company.username}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Payment Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Total Methods</div>
                                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</div>
                            </div>
                            <div className="p-3 bg-blue-500/10 rounded-xl">
                                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-green-200 dark:border-green-800">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">Enabled for Purchase</div>
                                <div className="text-3xl font-bold text-green-900 dark:text-green-100">{stats.enabledPurchase}</div>
                            </div>
                            <div className="p-3 bg-green-500/10 rounded-xl">
                                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 border-purple-200 dark:border-purple-800">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">Enabled for Cashout</div>
                                <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">{stats.enabledCashout}</div>
                            </div>
                            <div className="p-3 bg-purple-500/10 rounded-xl">
                                <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10 border-orange-200 dark:border-orange-800">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-1">Payment Types</div>
                                <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">{stats.types}</div>
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

            {/* Payment Methods Table */}
            {selectedCompanyId ? (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    {selectedCompany ? `${selectedCompany.project_name} Payment Methods` : 'Payment Methods'}
                                </h2>
                                {selectedCompany && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Managing payment methods for {selectedCompany.username}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-64">
                                    <SearchInput
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search payment methods..."
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={handleEnableAllPurchase}
                                        disabled={isLoadingMethods || paymentMethods.length === 0}
                                    >
                                        Enable All Purchase
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={handleEnableAllCashout}
                                        disabled={isLoadingMethods || paymentMethods.length === 0}
                                    >
                                        Enable All Cashout
                                    </Button>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={handleDisableAllPurchase}
                                        disabled={isLoadingMethods || paymentMethods.length === 0}
                                    >
                                        Disable All Purchase
                                    </Button>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={handleDisableAllCashout}
                                        disabled={isLoadingMethods || paymentMethods.length === 0}
                                    >
                                        Disable All Cashout
                                    </Button>
                                </div>
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
                        )}
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="p-8">
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
