'use client';

import { useState, useEffect } from 'react';
import { useBannersStore } from '@/stores';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/ui/search-input';
import { Pagination } from '@/components/ui/pagination';
import { Drawer } from '@/components/ui/drawer';
import { BannerForm } from '@/components/features';
import { LoadingState, ErrorState } from '@/components/features';
import type { Banner, CreateBannerRequest, UpdateBannerRequest } from '@/types';

export function BannersSection() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);

  const {
    banners: bannersData,
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

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const handleSubmit = async (formData: CreateBannerRequest | UpdateBannerRequest) => {
    try {
      if (selectedBanner) {
        await updateBanner(selectedBanner.id, formData as UpdateBannerRequest);
      } else {
        await createBanner(formData as CreateBannerRequest);
      }
      setIsDrawerOpen(false);
      setSelectedBanner(null);
    } catch (err) {
      console.error('Error saving banner:', err);
      throw err;
    }
  };

  const handleEdit = (banner: Banner) => {
    setSelectedBanner(banner);
    setIsDrawerOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;

    try {
      await deleteBanner(id);
    } catch (err) {
      console.error('Error deleting banner:', err);
      alert('Failed to delete banner');
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      await updateBanner(banner.id, { is_active: !banner.is_active });
    } catch (err) {
      console.error('Error toggling banner status:', err);
      alert('Failed to update banner status');
    }
  };

  if (isLoading && !bannersData) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchBanners} />;
  }

  const banners = bannersData?.results || [];
  const totalCount = bannersData?.count || 0;
  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Admin Banners
        </h2>
        <button
          onClick={() => {
            setSelectedBanner(null);
            setIsDrawerOpen(true);
          }}
          className="px-4 py-2 bg-[#6366f1] hover:bg-[#5558e3] text-white rounded-lg transition-colors"
        >
          Add Banner
        </button>
      </div>

      <SearchInput
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search banners by title, type, or category..."
      />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Redirect URL</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banners.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-12 text-gray-500 dark:text-gray-400" colSpan={7}>
                  No banners found
                </TableCell>
              </TableRow>
            ) : (
              banners.map((banner) => (
                <TableRow key={banner.id}>
                  <TableCell className="font-medium">
                    {banner.title}
                  </TableCell>
                  <TableCell>
                    <Badge variant={banner.banner_type === 'HOMEPAGE' ? 'success' : 'info'}>
                      {banner.banner_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {banner.banner_category}
                    </span>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleToggleActive(banner)}
                      className="focus:outline-none"
                    >
                      <Badge variant={banner.is_active ? 'success' : 'danger'}>
                        {banner.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell>
                    {banner.redirect_url ? (
                      <a
                        href={banner.redirect_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#6366f1] dark:text-[#6366f1] hover:underline text-sm"
                      >
                        {banner.redirect_url.length > 30
                          ? `${banner.redirect_url.substring(0, 30)}...`
                          : banner.redirect_url}
                      </a>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-600">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(banner.created).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(banner)}
                        className="text-[#6366f1] dark:text-[#6366f1] hover:text-[#5558e3] dark:hover:text-[#5558e3]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(banner.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
        hasPrevious={currentPage > 1}
        hasNext={currentPage < totalPages}
      />

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedBanner(null);
        }}
        title={selectedBanner ? 'Edit Banner' : 'Add New Banner'}
      >
        <BannerForm
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsDrawerOpen(false);
            setSelectedBanner(null);
          }}
          initialData={selectedBanner || undefined}
        />
      </Drawer>
    </div>
  );
}

