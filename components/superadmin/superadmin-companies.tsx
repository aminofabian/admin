'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import {
    Card,
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
import { CompanyRowActions } from '@/components/superadmin/company-row-actions';

const URL_PROTOCOL_PATTERN = /^https?:\/\//;

function displayDomain(domain?: string | null): string {
    return domain ? domain.replace(URL_PROTOCOL_PATTERN, '') : '—';
}

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
    const [isLoadingCompany, setIsLoadingCompany] = useState(false);
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

    const openEditModal = async (company: Company) => {
        setIsEditModalOpen(true);
        setSubmitError('');
        setSelectedCompany(company);
        setIsLoadingCompany(true);

        try {
            const fullCompany = await companiesApi.get(company.id);
            setSelectedCompany(fullCompany);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load company details';
            setSubmitError(errorMessage);
            addToast({
                type: 'error',
                title: 'Failed to Load Company',
                description: errorMessage,
            });
        } finally {
            setIsLoadingCompany(false);
        }
    };

    const closeModals = () => {
        setIsCreateModalOpen(false);
        setIsEditModalOpen(false);
        setSelectedCompany(null);
        setIsLoadingCompany(false);
        setSubmitError('');
    };

    if (isLoading && !data) {
        return <LoadingState />;
    }

    if (error && !data) {
        return <ErrorState message={error} onRetry={fetchCompanies} />;
    }

    return (
        <div className="space-y-4 pb-6 md:pb-0">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">Companies</h1>
                    <p className="text-sm text-muted-foreground">
                        {data ? `${data.count} ${data.count === 1 ? 'whitelabel' : 'whitelabels'}` : 'Whitelabels'} on the platform
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex-1 md:w-64">
                        <SearchInput
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search companies..."
                            className="h-10 text-sm"
                        />
                    </div>
                    <Button onClick={() => setIsCreateModalOpen(true)} className="h-10 shrink-0 text-sm">
                        <Plus className="mr-1.5 h-4 w-4" />
                        Add company
                    </Button>
                </div>
            </div>

            <Card className="overflow-hidden">
                {data?.results.length === 0 ? (
                    <EmptyState
                        title="No companies found"
                        description="Get started by creating a new company"
                    />
                ) : (
                    <>
                        <div className="hidden md:block overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Company</TableHead>
                                        <TableHead>Domain</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="hidden xl:table-cell">Created</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data?.results.map((company) => (
                                        <TableRow key={company.id}>
                                            <TableCell className="py-2.5">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-primary">
                                                        {company.project_name.charAt(0).toUpperCase()}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-medium text-foreground">{company.project_name}</div>
                                                        <div className="truncate text-xs text-muted-foreground">@{company.username} · {company.email}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-[16rem] truncate py-2.5 text-xs text-muted-foreground" title={company.project_domain}>
                                                {displayDomain(company.project_domain)}
                                            </TableCell>
                                            <TableCell className="py-2.5">
                                                <Badge variant={company.is_active ? 'success' : 'danger'}>
                                                    {company.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden whitespace-nowrap py-2.5 text-xs tabular-nums text-muted-foreground xl:table-cell">{formatDate(company.created)}</TableCell>
                                            <TableCell className="py-2.5">
                                                <CompanyRowActions
                                                    isActive={company.is_active}
                                                    onEdit={() => openEditModal(company)}
                                                    onChangePassword={() => handleChangePasswordClick(company)}
                                                    onToggleStatus={() => handleToggleStatusClick(company)}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <ul className="md:hidden divide-y divide-border">
                            {data?.results.map((company) => (
                                <li key={company.id} className="flex items-center gap-3 px-3 py-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-bold text-primary">
                                        {company.project_name.charAt(0).toUpperCase()}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="truncate text-sm font-medium">{company.project_name}</span>
                                            <Badge variant={company.is_active ? 'success' : 'danger'} className="text-[10px] px-1.5 py-0">
                                                {company.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </div>
                                        <div className="truncate text-xs text-muted-foreground">{displayDomain(company.project_domain)}</div>
                                    </div>
                                    <CompanyRowActions
                                        isActive={company.is_active}
                                        onEdit={() => openEditModal(company)}
                                        onChangePassword={() => handleChangePasswordClick(company)}
                                        onToggleStatus={() => handleToggleStatusClick(company)}
                                    />
                                </li>
                            ))}
                        </ul>

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
            </Card>

            {/* Create Company Drawer */}
            <Drawer
                isOpen={isCreateModalOpen}
                onClose={closeModals}
                title="Create New Company"
                subtitle="Set up the company in two quick steps — integrations are optional"
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
                subtitle="Update company details and integration credentials"
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
                {isLoadingCompany ? (
                    <LoadingState />
                ) : selectedCompany ? (
                    <CompanyForm
                        key={selectedCompany.id}
                        company={selectedCompany}
                        onSubmit={handleUpdateCompany as (data: CreateCompanyRequest | UpdateCompanyRequest) => Promise<void>}
                        onCancel={closeModals}
                        isLoading={isSubmitting}
                    />
                ) : null}
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
