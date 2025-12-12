'use client';

import { useState, useEffect } from 'react';
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
    Pagination,
    SearchInput,
    Button,
    Drawer,
    ConfirmModal,
    PasswordResetModal
} from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { LoadingState, ErrorState, EmptyState, CompanyForm } from '@/components/features';
import { formatDate } from '@/lib/utils/formatters';
import { useCompaniesStore } from '@/stores';
import { companiesApi } from '@/lib/api';
import type { Company, CreateCompanyRequest, UpdateCompanyRequest } from '@/types';

export function SuperAdminCompanies() {
    const {
        companies: data,
        isLoading,
        error,
        currentPage,
        searchTerm,
        pageSize,
        fetchCompanies,
        createCompany,
        updateCompany,
        setPage,
        setSearchTerm,
    } = useCompaniesStore();

    const { addToast } = useToast();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        company: Company | null;
        isLoading: boolean;
    }>({
        isOpen: false,
        company: null,
        isLoading: false,
    });
    const [passwordModal, setPasswordModal] = useState<{
        isOpen: boolean;
        company: Company | null;
        isLoading: boolean;
    }>({
        isOpen: false,
        company: null,
        isLoading: false,
    });

    useEffect(() => {
        fetchCompanies();
    }, [fetchCompanies]);


    const handleCreateCompany = async (formData: CreateCompanyRequest | UpdateCompanyRequest) => {
        try {
            setIsSubmitting(true);
            setSubmitError('');
            await createCompany(formData as CreateCompanyRequest);
            addToast({
                type: 'success',
                title: 'Company Created',
                description: 'Company has been created successfully.',
            });
            setIsCreateModalOpen(false);
        } catch (err: unknown) {
            let errorMessage = 'Failed to create company';
            
            if (err instanceof Error) {
                errorMessage = err.message;
            } else if (err && typeof err === 'object') {
                // Try to extract error message from various error formats
                if ('message' in err && typeof err.message === 'string') {
                    errorMessage = err.message;
                } else if ('detail' in err) {
                    if (typeof err.detail === 'string') {
                        errorMessage = err.detail;
                    } else if (err.detail && typeof err.detail === 'object') {
                        // Format field-level errors
                        const fieldErrors: string[] = [];
                        Object.entries(err.detail).forEach(([field, messages]) => {
                            if (Array.isArray(messages)) {
                                fieldErrors.push(`${field}: ${messages.join(', ')}`);
                            } else if (typeof messages === 'string') {
                                fieldErrors.push(`${field}: ${messages}`);
                            }
                        });
                        if (fieldErrors.length > 0) {
                            errorMessage = fieldErrors.join('; ');
                        }
                    }
                }
            }
            
            console.error('Company creation error:', err);
            setSubmitError(errorMessage);
            addToast({
                type: 'error',
                title: 'Failed to Create Company',
                description: errorMessage,
            });
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateCompany = async (formData: CreateCompanyRequest | UpdateCompanyRequest) => {
        if (!selectedCompany) return;

        try {
            setIsSubmitting(true);
            setSubmitError('');
            await updateCompany(selectedCompany.id, formData as UpdateCompanyRequest);
            addToast({
                type: 'success',
                title: 'Company Updated',
                description: 'Company has been updated successfully.',
            });
            setIsEditModalOpen(false);
            setSelectedCompany(null);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update company';
            setSubmitError(errorMessage);
            addToast({
                type: 'error',
                title: 'Failed to Update Company',
                description: errorMessage,
            });
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatusClick = (company: Company) => {
        setConfirmModal({
            isOpen: true,
            company,
            isLoading: false,
        });
    };

    const handleConfirmToggleStatus = async () => {
        if (!confirmModal.company) return;

        const company = confirmModal.company;
        setConfirmModal(prev => ({ ...prev, isLoading: true }));

        try {
            await updateCompany(company.id, { is_active: !company.is_active });
            addToast({
                type: 'success',
                title: 'Company Status Updated',
                description: `Company "${company.project_name}" has been ${company.is_active ? 'deactivated' : 'activated'} successfully.`,
            });
            setConfirmModal({ isOpen: false, company: null, isLoading: false });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update company status';
            addToast({
                type: 'error',
                title: 'Failed to Update Status',
                description: errorMessage,
            });
            setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
    };

    const handleCancelToggleStatus = () => {
        setConfirmModal({ isOpen: false, company: null, isLoading: false });
    };

    const handleChangePasswordClick = (company: Company) => {
        setPasswordModal({
            isOpen: true,
            company,
            isLoading: false,
        });
    };

    const handleCancelPasswordChange = () => {
        setPasswordModal({ isOpen: false, company: null, isLoading: false });
    };

    const handleConfirmPasswordChange = async (password: string) => {
        if (!passwordModal.company) return;

        const company = passwordModal.company;
        setPasswordModal(prev => ({ ...prev, isLoading: true }));

        try {
            // API requires both password and confirm_password
            // Using PATCH endpoint to update password
            await companiesApi.partialUpdate(company.id, {
                password,
                confirm_password: password,
            } as UpdateCompanyRequest & { password: string; confirm_password: string });
            
            addToast({
                type: 'success',
                title: 'Password Updated',
                description: `Password for "${company.project_name}" has been updated successfully.`,
            });
            setPasswordModal({ isOpen: false, company: null, isLoading: false });
        } catch (err) {
            let errorMessage = 'Failed to update password';
            
            if (err instanceof Error) {
                errorMessage = err.message;
            } else if (err && typeof err === 'object' && 'detail' in err) {
                if (typeof err.detail === 'string') {
                    errorMessage = err.detail;
                } else if (err.detail && typeof err.detail === 'object') {
                    const fieldErrors: string[] = [];
                    Object.entries(err.detail).forEach(([field, messages]) => {
                        if (Array.isArray(messages)) {
                            fieldErrors.push(`${field}: ${messages.join(', ')}`);
                        } else if (typeof messages === 'string') {
                            fieldErrors.push(`${field}: ${messages}`);
                        }
                    });
                    if (fieldErrors.length > 0) {
                        errorMessage = fieldErrors.join('; ');
                    }
                }
            }
            
            addToast({
                type: 'error',
                title: 'Failed to Update Password',
                description: errorMessage,
            });
            setPasswordModal(prev => ({ ...prev, isLoading: false }));
            throw err;
        }
    };

    const openEditModal = (company: Company) => {
        setSelectedCompany(company);
        setIsEditModalOpen(true);
        setSubmitError('');
    };

    const closeModals = () => {
        setIsCreateModalOpen(false);
        setIsEditModalOpen(false);
        setSelectedCompany(null);
        setSubmitError('');
    };

    if (isLoading && !data) {
        return <LoadingState />;
    }

    if (error && !data) {
        return <ErrorState message={error} onRetry={fetchCompanies} />;
    }

    return (
        <div className="md:pb-0 pb-6 -mx-4 md:mx-0 px-2 md:px-0">
            {/* Sticky Mobile Header */}
            <div className="sticky top-0 z-10 md:relative md:top-auto md:z-auto bg-background/95 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none border-b md:border-b-0 mb-4 md:mb-6 -mx-4 md:mx-0 px-2 md:px-0 py-3 md:py-0">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">Company Management</h1>
                    <Button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="md:hidden h-10 px-3 text-sm active:scale-[0.98]"
                    >
                        <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add
                    </Button>
                </div>
            </div>

            {/* Desktop Add Button */}
            <div className="hidden md:flex items-center justify-end mb-6">
                <Button onClick={() => setIsCreateModalOpen(true)}>
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Company
                </Button>
            </div>

            <Card className="shadow-sm md:shadow-md border md:border-2 rounded-xl md:rounded-lg overflow-hidden">
                <CardHeader className="pb-3 md:pb-6 px-2 md:px-6 pt-3 md:pt-6 border-b md:border-b-0">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
                        <h2 className="text-base md:text-lg font-semibold">All Companies</h2>
                        {/* Sticky Search on Mobile */}
                        <div className="sticky top-14 md:static z-10 bg-background/95 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none -mx-4 md:mx-0 px-2 md:px-0 py-2 md:py-0 -mb-2 md:mb-0">
                            <div className="w-full md:w-64">
                                <SearchInput
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search companies..."
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {data?.results.length === 0 ? (
                        <EmptyState
                            title="No companies found"
                            description="Get started by creating a new company"
                        />
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Username</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Project Name</TableHead>
                                            <TableHead>Domain</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Created</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data?.results.map((company) => (
                                            <TableRow key={company.id}>
                                                <TableCell className="font-medium">{company.username}</TableCell>
                                                <TableCell>{company.email}</TableCell>
                                                <TableCell>{company.project_name}</TableCell>
                                                <TableCell className="text-xs max-w-xs truncate" title={company.project_domain}>
                                                    {company.project_domain}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={company.is_active ? 'success' : 'danger'}>
                                                        {company.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs">{formatDate(company.created)}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => openEditModal(company)}
                                                            title="Edit company"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleChangePasswordClick(company)}
                                                            title="Change password"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                                            </svg>
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant={company.is_active ? 'danger' : 'secondary'}
                                                            onClick={() => handleToggleStatusClick(company)}
                                                            title={company.is_active ? 'Deactivate' : 'Activate'}
                                                        >
                                                            {company.is_active ? (
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                            )}
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
                                {data?.results.map((company) => (
                                    <Card 
                                        key={company.id} 
                                        className="border shadow-md hover:shadow-lg transition-shadow active:scale-[0.99] rounded-2xl overflow-hidden bg-card"
                                    >
                                        <CardContent className="p-3 space-y-2">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-base leading-tight mb-1">{company.project_name}</h3>
                                                    <p className="text-xs text-muted-foreground mb-2">{company.username}</p>
                                                    <Badge 
                                                        variant={company.is_active ? 'success' : 'danger'} 
                                                        className="text-xs px-2 py-0.5"
                                                    >
                                                        {company.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-2 text-sm pt-2 border-t">
                                                <div className="flex items-start justify-between">
                                                    <span className="font-medium text-muted-foreground">Email:</span>
                                                    <p className="text-right break-words flex-1 ml-2">{company.email}</p>
                                                </div>
                                                <div className="flex items-start justify-between">
                                                    <span className="font-medium text-muted-foreground">Domain:</span>
                                                    <p className="text-right break-all flex-1 ml-2">{company.project_domain}</p>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-muted-foreground">Created:</span>
                                                    <span className="text-xs text-muted-foreground">{formatDate(company.created)}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-end gap-2 pt-2 border-t">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => openEditModal(company)}
                                                    title="Edit company"
                                                    className="flex-1 h-11 text-sm font-medium active:scale-[0.98]"
                                                >
                                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                    Edit
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleChangePasswordClick(company)}
                                                    title="Change password"
                                                    className="flex-1 h-11 text-sm font-medium active:scale-[0.98]"
                                                >
                                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                    </svg>
                                                    Password
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={company.is_active ? 'ghost' : 'secondary'}
                                                    onClick={() => handleToggleStatusClick(company)}
                                                    title={company.is_active ? 'Deactivate' : 'Activate'}
                                                    className={`flex-1 h-11 text-sm font-medium active:scale-[0.98] ${
                                                        company.is_active 
                                                            ? 'text-muted-foreground hover:text-foreground hover:bg-muted/50' 
                                                            : ''
                                                    }`}
                                                >
                                                    {company.is_active ? (
                                                        <>
                                                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                            </svg>
                                                            Deactivate
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            Activate
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {data && (
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={Math.ceil(data.count / pageSize)}
                                    onPageChange={setPage}
                                    hasNext={!!data.next}
                                    hasPrevious={!!data.previous}
                                />
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Create Company Drawer */}
            <Drawer
                isOpen={isCreateModalOpen}
                onClose={closeModals}
                title="Create New Company"
                size="xl"
            >
                {submitError && (
                    <div className="mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
                        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>{submitError}</span>
                    </div>
                )}
                <CompanyForm
                    onSubmit={handleCreateCompany as (data: CreateCompanyRequest | UpdateCompanyRequest) => Promise<void>}
                    onCancel={closeModals}
                    isLoading={isSubmitting}
                />
            </Drawer>

            {/* Edit Company Drawer */}
            <Drawer
                isOpen={isEditModalOpen}
                onClose={closeModals}
                title="Edit Company"
                size="xl"
            >
                {submitError && (
                    <div className="mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
                        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>{submitError}</span>
                    </div>
                )}
                {selectedCompany && (
                    <CompanyForm
                        company={selectedCompany}
                        onSubmit={handleUpdateCompany as (data: CreateCompanyRequest | UpdateCompanyRequest) => Promise<void>}
                        onCancel={closeModals}
                        isLoading={isSubmitting}
                    />
                )}
            </Drawer>

            {/* Confirmation Modal for Toggle Status */}
            {confirmModal.company && (
                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    onClose={handleCancelToggleStatus}
                    onConfirm={handleConfirmToggleStatus}
                    title={confirmModal.company.is_active ? 'Deactivate Company' : 'Activate Company'}
                    description={`Are you sure you want to ${confirmModal.company.is_active ? 'deactivate' : 'activate'} "${confirmModal.company.project_name}"?`}
                    confirmText={confirmModal.company.is_active ? 'Yes, Deactivate' : 'Yes, Activate'}
                    cancelText="Cancel"
                    variant={confirmModal.company.is_active ? 'warning' : 'info'}
                    isLoading={confirmModal.isLoading}
                />
            )}

            {/* Password Reset Modal */}
            {passwordModal.company && (
                <PasswordResetModal
                    isOpen={passwordModal.isOpen}
                    onClose={handleCancelPasswordChange}
                    onConfirm={handleConfirmPasswordChange}
                    title="Change Admin Password"
                    description={`Enter a new password for "${passwordModal.company.project_name}" admin account. The admin will need to use this password to log in.`}
                    username={passwordModal.company.username}
                    isLoading={passwordModal.isLoading}
                />
            )}
        </div>
    );
}
