'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useBannersStore } from '@/stores';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  SearchInput,
  Pagination,
  Skeleton,
} from '@/components/ui';
import { ErrorState, EmptyState } from '@/components/features';
import { formatDate } from '@/lib/utils/formatters';
import type { Banner } from '@/types';

const SECTION_TITLE = 'Banners';
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

function BannersHeader() {
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
        <div className="flex flex-col shrink-0">
          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {SECTION_TITLE}
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            View banner configurations (read-only)
          </p>
        </div>
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

function BannersTable({ data }: { data: Banner[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Thumbnail</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((banner) => (
            <BannersTableRow key={banner.id} banner={banner} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function BannersTableRow({ banner }: { banner: Banner }) {
  // Prefer web_banner, fallback to mobile_banner
  const thumbnailUrl = banner.web_banner || banner.mobile_banner;

  return (
    <TableRow className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <TableCell>
        {thumbnailUrl ? (
          <div className="relative h-16 w-24 overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
            <Image
              src={thumbnailUrl}
              alt={banner.title}
              fill
              className="object-cover"
              sizes="96px"
              unoptimized
              onError={(e) => {
                // Hide image on error
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className="flex h-16 w-24 items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
            <span className="text-xs text-gray-400 dark:text-gray-500">No image</span>
          </div>
        )}
      </TableCell>
      <TableCell>
        <span className="font-medium text-gray-900 dark:text-gray-100">{banner.title}</span>
      </TableCell>
      <TableCell>
        <Badge variant={mapBannerTypeVariant(banner.banner_type)}>
          {formatBannerLabel(banner.banner_type)}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={banner.is_active ? 'success' : 'default'}>
          {banner.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {formatDate(banner.created)}
        </div>
      </TableCell>
    </TableRow>
  );
}

/**
 * Staff Banners Section - Read-only
 * Shows banners but does not allow editing
 */
export function StaffBannersSection() {
  const {
    banners,
    isLoading,
    error,
    currentPage,
    searchTerm,
    fetchBanners,
    setPage,
    setSearchTerm,
    pageSize,
  } = useBannersStore();

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
          <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
            <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg shrink-0" />
            <Skeleton className="h-6 sm:h-7 md:h-8 lg:h-9 w-32 shrink-0" />
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
                <div className="grid grid-cols-5 gap-4 px-4 py-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-4 w-24" />
                  ))}
                </div>
              </div>
              
              {/* Table Rows Skeleton */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="grid grid-cols-5 gap-4 px-4 py-4">
                    <Skeleton className="h-16 w-24 rounded-md" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-4 w-24" />
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
      <BannersHeader />
      <BannersSearch value={searchTerm} onChange={setSearchTerm} />
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {!banners || list.length === 0 ? (
          <div className="py-12">
            <EmptyState title={EMPTY_ROW_TEXT} />
          </div>
        ) : (
          <>
            <BannersTable data={list} />
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
    </div>
  );
}

