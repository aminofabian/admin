'use client';

import { useState, useEffect } from 'react';
import { bannersApi } from '@/lib/api';
import { 
  Card, CardHeader, CardContent, Table, TableHeader, TableBody, 
  TableRow, TableHead, TableCell, Badge, Button 
} from '@/components/ui';
import { LoadingState, ErrorState, EmptyState } from '@/components/features';
import { formatDate } from '@/lib/utils/formatters';
import type { Banner, PaginatedResponse } from '@/types';

export default function BannersPage() {
  const [data, setData] = useState<PaginatedResponse<Banner> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await bannersApi.list();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load banners');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={loadBanners} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Banners</h1>
        <Button>Add Banner</Button>
      </div>
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">All Banners</h2>
        </CardHeader>
        <CardContent className="p-0">
          {data?.results.length === 0 ? (
            <EmptyState title="No banners found" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.results.map((banner) => (
                  <TableRow key={banner.id}>
                    <TableCell className="font-medium">{banner.title}</TableCell>
                    <TableCell className="capitalize">{banner.banner_type.toLowerCase()}</TableCell>
                    <TableCell>{banner.banner_category}</TableCell>
                    <TableCell>
                      <Badge variant={banner.is_active ? 'success' : 'danger'}>
                        {banner.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(banner.created)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

