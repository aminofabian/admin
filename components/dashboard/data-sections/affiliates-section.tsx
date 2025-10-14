'use client';

import { useState, useEffect } from 'react';
import { affiliatesApi } from '@/lib/api';
import { usePagination, useSearch } from '@/lib/hooks';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SearchInput } from '@/components/ui/search-input';
import { Pagination } from '@/components/ui/pagination';
import { Drawer } from '@/components/ui/drawer';
import { AffiliateForm } from '@/components/features';
import type { Affiliate, UpdateAffiliateRequest } from '@/types';

export function AffiliatesSection() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const { page, pageSize, setPage } = usePagination();
  const { search, debouncedSearch, setSearch } = useSearch();

  useEffect(() => {
    fetchAffiliates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch]);

  const fetchAffiliates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await affiliatesApi.list({
        search: debouncedSearch,
        page: page,
        page_size: pageSize,
      });
      setAffiliates(response.results);
      setTotalCount(response.count);
    } catch (err) {
      setError('Failed to load affiliates');
      console.error('Error fetching affiliates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAffiliate = async (formData: UpdateAffiliateRequest) => {
    if (!selectedAffiliate) return;

    try {
      await affiliatesApi.update(selectedAffiliate.id, formData);
      setIsDrawerOpen(false);
      setSelectedAffiliate(null);
      await fetchAffiliates();
    } catch (err) {
      console.error('Error updating affiliate:', err);
      throw err;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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
          Affiliate Network
        </h2>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Total Affiliates: {totalCount}
        </div>
      </div>

      <SearchInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search affiliates by name or email..."
      />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Players</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Fees</TableHead>
              <TableHead className="text-right">Total Topup</TableHead>
              <TableHead className="text-right">Total Cashout</TableHead>
              <TableHead className="text-right">Earnings</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {affiliates.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-12 text-gray-500 dark:text-gray-400" colSpan={9}>
                  No affiliates found
                </TableCell>
              </TableRow>
            ) : (
              affiliates.map((affiliate) => (
                <TableRow key={affiliate.id}>
                  <TableCell className="font-medium">
                    {affiliate.name}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {affiliate.email}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-[#6366f1] dark:text-[#6366f1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span className="font-semibold text-[#6366f1] dark:text-[#6366f1]">
                        {affiliate.total_players}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      {affiliate.affiliate_percentage}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      <div>Aff: {affiliate.affiliate_fee}%</div>
                      <div>PMF: {affiliate.payment_method_fee}%</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                    {formatCurrency(affiliate.total_topup)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-red-600 dark:text-red-400">
                    {formatCurrency(affiliate.total_cashout)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-[#6366f1] dark:text-[#6366f1]">
                    {formatCurrency(affiliate.total_earnings)}
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => {
                        setSelectedAffiliate(affiliate);
                        setIsDrawerOpen(true);
                      }}
                      className="text-[#6366f1] dark:text-[#6366f1] hover:text-[#5558e3] dark:hover:text-[#5558e3]"
                    >
                      Edit Commission
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={page}
        totalPages={Math.ceil(totalCount / pageSize)}
        onPageChange={setPage}
        hasPrevious={page > 1}
        hasNext={page < Math.ceil(totalCount / pageSize)}
      />

      {selectedAffiliate && (
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedAffiliate(null);
          }}
          title="Update Affiliate Commission"
        >
          <AffiliateForm
            onSubmit={handleUpdateAffiliate}
            onCancel={() => {
              setIsDrawerOpen(false);
              setSelectedAffiliate(null);
            }}
            initialData={selectedAffiliate}
          />
        </Drawer>
      )}
    </div>
  );
}

