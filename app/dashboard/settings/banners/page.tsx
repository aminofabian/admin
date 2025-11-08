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

  useEffect(() => {
    fetchBanners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (formData: CreateBannerRequest | UpdateBannerRequest) => {
    try {
      if (selectedBanner) {
        await updateBanner(selectedBanner.id, formData as UpdateBannerRequest);
      } else {
        await createBanner(formData as CreateBannerRequest);
      }
      setIsModalOpen(false);
      setSelectedBanner(null);
    } catch (err) {
      console.error('Error saving banner:', err);
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
    <div className="space-y-8">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-md dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7h16M4 12h10M4 17h7" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Banners</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Manage promotional banners and advertisements
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-4 lg:ml-auto lg:max-w-sm lg:border-l lg:border-gray-100 lg:pl-6 dark:lg:border-gray-800/60">
            <Button
              size="lg"
              className="justify-center lg:self-end"
              onClick={handleCreate}
            >
              <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Banner
            </Button>
            <SearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search banners by title..."
              className="h-12 rounded-xl border-gray-200 text-base dark:border-gray-700"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Banners</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{banners?.count ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">
            {banners?.results?.filter((banner) => banner.is_active).length ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Inactive</p>
          <p className="mt-2 text-2xl font-semibold text-gray-500 dark:text-gray-300">
            {banners?.results?.filter((banner) => !banner.is_active).length ?? 0}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md dark:border-gray-800 dark:bg-gray-900">
        {banners?.results.length === 0 ? (
          <div className="py-12">
            <EmptyState 
              title="No banners found" 
              description="Get started by creating your first banner"
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banners?.results.map((banner) => (
                  <TableRow key={banner.id}>
                    <TableCell className="align-top">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{banner.title}</span>
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant={banner.banner_type === 'HOMEPAGE' ? 'info' : 'success'}>
                        {banner.banner_type.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant="warning">{banner.banner_category.toLowerCase()}</Badge>
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant={banner.is_active ? 'success' : 'default'}>
                        {banner.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <span>{formatDate(banner.created)}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          Updated {formatDate(banner.modified)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => handleEdit(banner)}>
                          Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(banner.id)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
