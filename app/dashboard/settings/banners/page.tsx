'use client';

import { useState, useEffect } from 'react';
import { useBannersStore } from '@/stores';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell,
  Badge,
  Button,
  SearchInput,
  Pagination,
  Modal,
} from '@/components/ui';
import { BannerForm, LoadingState, ErrorState, EmptyState } from '@/components/features';
import { formatDate } from '@/lib/utils/formatters';
import type { Banner, CreateBannerRequest, UpdateBannerRequest } from '@/types';

export default function BannersPage() {
  const { 
    banners,
    isLoading,
    error,
    currentPage,
    searchTerm,
    fetchBanners,
    createBanner,
    updateBanner,
    deleteBanner,
    setPage,
    setSearchTerm,
  } = useBannersStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchBanners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (formData: CreateBannerRequest | UpdateBannerRequest) => {
    try {
      setIsSubmitting(true);
      if (selectedBanner) {
        await updateBanner(selectedBanner.id, formData as UpdateBannerRequest);
      } else {
        await createBanner(formData as CreateBannerRequest);
      }
      setIsModalOpen(false);
      setSelectedBanner(null);
    } catch (err) {
      console.error('Error saving banner:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (banner: Banner) => {
    setSelectedBanner(banner);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this banner?')) {
      try {
        await deleteBanner(id);
      } catch (err) {
        console.error('Error deleting banner:', err);
      }
    }
  };

  const handleCreate = () => {
    setSelectedBanner(null);
    setIsModalOpen(true);
  };

  if (isLoading && !banners) {
    return <LoadingState />;
  }

  if (error && !banners) {
    return <ErrorState message={error} onRetry={fetchBanners} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Banners</h1>
          <p className="text-muted-foreground mt-1">
            Manage promotional banners and advertisements
          </p>
        </div>
        <Button onClick={handleCreate}>+ Add Banner</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Banners</span>
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-2xl font-bold">{banners?.count || 0}</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Active</span>
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-green-600">
            {banners?.results?.filter(b => b.is_active).length || 0}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Inactive</span>
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-muted-foreground">
            {banners?.results?.filter(b => !b.is_active).length || 0}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="w-full max-w-md">
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search banners by title..."
        />
      </div>

      {/* Banners Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {banners?.results.length === 0 ? (
          <div className="py-12">
            <EmptyState 
              title="No banners found" 
              description="Get started by creating your first banner"
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {banners?.results.map((banner) => (
                    <TableRow key={banner.id}>
                      <TableCell className="font-medium">{banner.title}</TableCell>
                      <TableCell>
                        <Badge variant={banner.banner_type === 'HOMEPAGE' ? 'info' : 'success'}>
                          {banner.banner_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="warning">{banner.banner_category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={banner.is_active ? 'success' : 'default'}>
                          {banner.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(banner.created)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleEdit(banner)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(banner.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {banners && banners.count > 10 && (
              <div className="border-t border-border px-4 py-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(banners.count / 10)}
                  onPageChange={setPage}
                  hasNext={!!banners.next}
                  hasPrevious={!!banners.previous}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Banner Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedBanner(null);
        }}
        title={selectedBanner ? 'Edit Banner' : 'Add New Banner'}
      >
        <BannerForm
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsModalOpen(false);
            setSelectedBanner(null);
          }}
          initialData={selectedBanner || undefined}
        />
      </Modal>
    </div>
  );
}
