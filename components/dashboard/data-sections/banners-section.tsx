'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
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
import { formatDate } from '@/lib/utils/formatters';
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
    <div className="space-y-6">
      <div className="relative bg-card/95 backdrop-blur-sm p-6 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-foreground">
                Admin Banners
              </h2>
              <p className="text-muted-foreground mt-1">
                Manage promotional banners across the platform
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedBanner(null);
              setIsDrawerOpen(true);
            }}
            className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 transition-colors inline-flex items-center font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Banner
          </button>
        </div>
        
        {/* Info Section */}
        <div className="relative mt-6 p-4 bg-gradient-to-br from-card/80 via-card/60 to-card/40 border border-border/30">
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex flex-wrap gap-4">
              <span><strong className="text-primary">Types:</strong> HOMEPAGE (main page banners) • PROMOTIONAL (marketing banners)</span>
              <span><strong className="text-primary">Categories:</strong> DESKTOP • MOBILE_RESPONSIVE • MOBILE_APP</span>
            </div>
            <div>
              <strong className="text-primary">Note:</strong> At least one image (web, mobile, or thumbnail) is required for new banners. 
              File formats: PNG, JPEG, JPG (max 5MB each)
            </div>
          </div>
        </div>
      </div>

      <div className="relative bg-card/95 backdrop-blur-sm p-4 border border-border/50 shadow-lg overflow-hidden">
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        <div className="relative">
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search banners by title, type, or category..."
          />
        </div>
      </div>

      <div className="relative bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg overflow-hidden">
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        {/* Table Header */}
        <div className="relative p-6 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a1 1 0 010 2H6v2a1 1 0 01-2 0V6zM14 6a1 1 0 000 2h2v2a1 1 0 002 0V6a2 2 0 00-2-2h-2zM4 16a1 1 0 012 0v2h2a1 1 0 010 2H6a2 2 0 01-2-2v-2zM16 18h2a2 2 0 002-2v-2a1 1 0 00-2 0v2h-2a1 1 0 000 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Banner Gallery</h3>
              <p className="text-sm text-muted-foreground">Manage banner display and settings</p>
            </div>
          </div>
        </div>
        
        <div className="relative">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/30">
                <TableHead className="font-semibold text-foreground">Preview</TableHead>
                <TableHead className="font-semibold text-foreground">Title</TableHead>
                <TableHead className="font-semibold text-foreground">Type</TableHead>
                <TableHead className="font-semibold text-foreground">Category</TableHead>
                <TableHead className="font-semibold text-foreground">Status</TableHead>
                <TableHead className="font-semibold text-foreground">Redirect URL</TableHead>
                <TableHead className="font-semibold text-foreground">Created</TableHead>
                <TableHead className="font-semibold text-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-12 text-muted-foreground" colSpan={8}>
                    No banners found
                  </TableCell>
                </TableRow>
              ) : (
                banners.map((banner) => (
                  <TableRow key={banner.id} className="hover:bg-card/50 border-border/20 transition-colors">
                    <TableCell>
                      {banner.web_banner || banner.mobile_banner || banner.banner_thumbnail ? (
                        <div className="relative overflow-hidden border border-border/30 shadow-sm">
                          <Image
                            src={banner.web_banner || banner.mobile_banner || banner.banner_thumbnail || ''}
                            alt={`${banner.title} preview`}
                            width={64}
                            height={40}
                            className="w-16 h-10 object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-10 bg-gradient-to-br from-muted/30 via-muted/10 to-transparent border border-border/30 flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">No image</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {banner.title}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={banner.banner_type === 'HOMEPAGE' ? 'success' : 'info'}
                        className={banner.banner_type === 'HOMEPAGE' 
                          ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                          : 'bg-primary/10 text-primary border-primary/20'
                        }
                      >
                        {banner.banner_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground font-medium">
                        {banner.banner_category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggleActive(banner)}
                        className="focus:outline-none transition-transform hover:scale-105"
                      >
                        <Badge 
                          variant={banner.is_active ? 'success' : 'danger'}
                          className={banner.is_active 
                            ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                            : 'bg-red-500/10 text-red-500 border-red-500/20'
                          }
                        >
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
                          className="text-primary hover:text-primary/80 hover:underline text-sm font-medium transition-colors"
                        >
                          {banner.redirect_url.length > 30
                            ? `${banner.redirect_url.substring(0, 30)}...`
                            : banner.redirect_url}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(banner.created)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(banner)}
                          className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/30 font-medium text-sm transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(banner.id)}
                          className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 hover:border-red-500/30 font-medium text-sm transition-colors"
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
      </div>

      {totalPages > 1 && (
        <div className="relative bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg overflow-hidden">
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
          </div>
          <div className="relative">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setPage}
              hasPrevious={currentPage > 1}
              hasNext={currentPage < totalPages}
            />
          </div>
        </div>
      )}

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

