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
    ConfirmModal
} from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { LoadingState, ErrorState, EmptyState, CompanyForm } from '@/components/features';
import { formatDate } from '@/lib/utils/formatters';
import { useCompaniesStore } from '@/stores';
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
        <div>
            {/* Superadmin Badge */}
            <div className="mb-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 px-4 py-3 flex items-center gap-2 rounded-lg">
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="font-medium text-primary">Superadmin View - System-Wide Company Management</span>
            </div>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Company Management</h1>
                    <p className="text-muted-foreground mt-1">Manage all companies across the platform</p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Company
                </Button>
            </div>


            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">All Companies</h2>
                        <div className="w-64">
                            <SearchInput
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search companies..."
                            />
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
        </div>
    );
}
