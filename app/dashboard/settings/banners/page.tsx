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
  Drawer,
  Skeleton,
} from '@/components/ui';
import { BannerForm, ErrorState, EmptyState } from '@/components/features';
import { formatDate } from '@/lib/utils/formatters';
import type { Banner, CreateBannerRequest, UpdateBannerRequest } from '@/types';

const SECTION_TITLE = 'Banners';
const SECTION_SUBTITLE = 'Manage promotional banners and advertisements';
const ADD_BUTTON_LABEL = 'Add Banner';
const SEARCH_PLACEHOLDER = 'Search banners by title...';
const EMPTY_ROW_TEXT = 'No banners found';

function formatBannerLabel(value?: string | null) {
  if (!value) return '—';
  return value
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function mapBannerTypeVariant(bannerType: Banner['banner_type']) {
  return bannerType === 'HOMEPAGE' ? 'info' : 'success';
}

function BannersHeader({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
      <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
        {/* Icon */}
        <div className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shrink-0">
          <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7h16M4 12h10M4 17h7" />
          </svg>
        </div>
        
        {/* Title */}
        <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100 shrink-0">
          {SECTION_TITLE}
        </h2>
        
        {/* Spacer */}
        <div className="flex-1 min-w-0" />
        
        {/* Add Banner Button */}
        <Button variant="primary" size="sm" onClick={onCreate} className="shrink-0">
          {ADD_BUTTON_LABEL}
        </Button>
      </div>
    </div>
  );
}

function BannersSearch({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  return (
    <section className="rounded-2xl border border-border/70 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <SearchInput value={value} onChange={(event) => onChange(event.target.value)} placeholder={SEARCH_PLACEHOLDER} />
    </section>
  );
}

function BannersTable({
  data,
  onEdit,
  onDelete,
}: {
  data: Banner[];
  onEdit: (banner: Banner) => void;
  onDelete: (banner: Banner) => void;
}) {
  return (
    <div className="overflow-x-auto">
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
          {data.map((banner) => (
            <BannersTableRow key={banner.id} banner={banner} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function BannersTableRow({
  banner,
  onEdit,
  onDelete,
}: {
  banner: Banner;
  onEdit: (item: Banner) => void;
  onDelete: (item: Banner) => void;
}) {
  return (
    <TableRow className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <TableCell>
        <span className="font-medium text-gray-900 dark:text-gray-100">{banner.title}</span>
      </TableCell>
      <TableCell>
        <Badge variant={mapBannerTypeVariant(banner.banner_type)}>
          {formatBannerLabel(banner.banner_type)}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="warning">{formatBannerLabel(banner.banner_category)}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant={banner.is_active ? 'success' : 'default'}>
          {banner.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-col text-sm text-gray-600 dark:text-gray-400">
          <span>{formatDate(banner.created)}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Updated {formatDate(banner.modified)}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(banner)}
            className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(banner)}
            className="flex items-center gap-2 rounded-full border border-red-200 px-4 py-1.5 text-sm font-medium text-red-700 shadow-sm hover:border-red-300 hover:bg-red-50 dark:border-red-700 dark:bg-red-900 dark:text-red-200 dark:hover:border-red-600 dark:hover:bg-red-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}


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
    pageSize,
  } = useBannersStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);

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

  const handleDelete = async (banner: Banner) => {
    const confirmed = confirm(`Delete banner "${banner.title}"?`);
    if (!confirmed) return;
    try {
      await deleteBanner(banner.id);
    } catch (err) {
      console.error('Error deleting banner:', err);
    }
  };

  const handleCreate = () => {
    setSelectedBanner(null);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
          <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
            <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg shrink-0" />
            <Skeleton className="h-6 sm:h-7 md:h-8 lg:h-9 w-32 shrink-0" />
            <div className="flex-1 min-w-0" />
            <Skeleton className="h-9 w-32 rounded-md shrink-0" />
          </div>
        </div>

        {/* Search Skeleton */}
        <section className="rounded-2xl border border-border/70 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <Skeleton className="h-10 w-full" />
        </section>

        {/* Table Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Table Header Skeleton */}
              <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-6 gap-4 px-4 py-3">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-4 w-24" />
                  ))}
                </div>
              </div>
              
              {/* Table Rows Skeleton */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="grid grid-cols-6 gap-4 px-4 py-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Skeleton className="h-8 w-20 rounded-full" />
                      <Skeleton className="h-8 w-20 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !banners) {
    return <ErrorState message={error} onRetry={fetchBanners} />;
  }

  const list = banners?.results ?? [];
  const totalCount = banners?.count ?? 0;

  return (
    <div className="space-y-6">
      <BannersHeader onCreate={handleCreate} />
      <BannersSearch value={searchTerm} onChange={setSearchTerm} />
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {!banners || list.length === 0 ? (
          <div className="py-12">
            <EmptyState title={EMPTY_ROW_TEXT} />
          </div>
        ) : (
          <>
            <BannersTable data={list} onEdit={handleEdit} onDelete={handleDelete} />
            {totalCount > pageSize && (
              <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(totalCount / pageSize)}
                  hasNext={Boolean(banners?.next)}
                  hasPrevious={Boolean(banners?.previous)}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>
      <Drawer
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
      </Drawer>
    </div>
  );
}
