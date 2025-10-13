'use client';

import { useState, useEffect } from 'react';
import { bannersApi } from '@/lib/api';
import { usePagination, useSearch } from '@/lib/hooks';
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
import type { Banner, CreateBannerRequest, UpdateBannerRequest } from '@/types';

export function BannersSection() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const { currentPage, pageSize, handlePageChange } = usePagination();
  const { searchTerm, handleSearch } = useSearch();

  useEffect(() => {
    fetchBanners();
  }, [currentPage, pageSize, searchTerm]);

  const fetchBanners = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await bannersApi.list();
      setBanners(response.results);
      setTotalCount(response.count);
    } catch (err) {
      setError('Failed to load banners');
      console.error('Error fetching banners:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBanner = async (formData: CreateBannerRequest | UpdateBannerRequest) => {
    try {
      if (selectedBanner) {
        await bannersApi.update(selectedBanner.id, formData as UpdateBannerRequest);
      } else {
        await bannersApi.create(formData as CreateBannerRequest);
      }
      setIsDrawerOpen(false);
      setSelectedBanner(null);
      await fetchBanners();
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
      await bannersApi.delete(id);
      await fetchBanners();
    } catch (err) {
      console.error('Error deleting banner:', err);
      alert('Failed to delete banner');
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      await bannersApi.update(banner.id, { is_active: !banner.is_active });
      await fetchBanners();
    } catch (err) {
      console.error('Error toggling banner status:', err);
      alert('Failed to update banner status');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

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
        onChange={handleSearch}
        placeholder="Search banners..."
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
                <TableCell colSpan={7} className="text-center py-12 text-gray-500 dark:text-gray-400">
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
                      <Badge variant={banner.is_active ? 'success' : 'error'}>
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
        totalPages={Math.ceil(totalCount / pageSize)}
        onPageChange={handlePageChange}
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
          onSubmit={handleCreateBanner}
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

