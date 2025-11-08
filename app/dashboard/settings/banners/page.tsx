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
import { BannerForm, LoadingState, ErrorState } from '@/components/features';
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
    <section className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#6366f1] dark:bg-[#312e81] dark:text-[#a5b4fc]">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7h16M4 12h10M4 17h7" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{SECTION_TITLE}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">{SECTION_SUBTITLE}</p>
        </div>
      </div>
      <Button variant="primary" size="md" onClick={onCreate} className="lg:self-auto">
        {ADD_BUTTON_LABEL}
      </Button>
    </section>
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
  const hasBanners = data.length > 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <Table>
        <TableHeader>
          <TableRow className="uppercase tracking-wide text-xs text-gray-500 dark:text-gray-400">
            <TableHead className="w-[280px]">Title</TableHead>
            <TableHead className="w-[180px]">Type</TableHead>
            <TableHead className="w-[200px]">Category</TableHead>
            <TableHead className="w-[160px]">Status</TableHead>
            <TableHead className="w-[220px]">Dates</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hasBanners
            ? data.map((banner) => (
                <BannersTableRow key={banner.id} banner={banner} onEdit={onEdit} onDelete={onDelete} />
              ))
            : (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  {EMPTY_ROW_TEXT}
                </TableCell>
              </TableRow>
            )}
        </TableBody>
      </Table>
    </section>
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
    <TableRow className="border-b border-border/40 last:border-0 dark:border-slate-700/80">
      <TableCell>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{banner.title}</span>
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
        <div className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
          <span>{formatDate(banner.created)}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Updated {formatDate(banner.modified)}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={() => onEdit(banner)}>
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => onDelete(banner)}>
            Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function BannersPagination({
  totalCount,
  pageSize,
  currentPage,
  hasNext,
  hasPrevious,
  onPageChange,
}: {
  totalCount: number;
  pageSize: number;
  currentPage: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onPageChange: (page: number) => void;
}) {
  if (totalCount <= pageSize) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-border/70 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(totalCount / pageSize)}
        hasNext={hasNext}
        hasPrevious={hasPrevious}
        onPageChange={onPageChange}
      />
    </section>
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

  if (isLoading && !banners) {
    return <LoadingState />;
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
      <BannersTable data={list} onEdit={handleEdit} onDelete={handleDelete} />
      <BannersPagination
        totalCount={totalCount}
        pageSize={pageSize}
        currentPage={currentPage}
        hasNext={Boolean(banners?.next)}
        hasPrevious={Boolean(banners?.previous)}
        onPageChange={setPage}
      />
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
