'use client';

import { useEffect, useState } from 'react';
import { useChatLinksStore } from '@/stores';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
  Input,
  Switch,
  Skeleton,
  Drawer,
} from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils/formatters';
import type { ChatLink, UpdateChatLinkRequest } from '@/types';

function ChatLinksHeader() {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
      <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
        <div className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shrink-0">
          <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Social Links
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Configure chat platform links and enable/disable them
          </p>
        </div>
      </div>
    </div>
  );
}

interface ChatLinkRowProps {
  chatLink: ChatLink;
  onEdit: (chatLink: ChatLink) => void;
  onToggleDashboard: (id: number, checked: boolean) => Promise<void>;
  onToggleLandingPage: (id: number, checked: boolean) => Promise<void>;
}

function getPlatformIcon(platform: string) {
  const iconClass = 'w-5 h-5';
  switch (platform.toLowerCase()) {
    case 'messenger':
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.373 0 0 4.925 0 11c0 2.153.74 4.163 2.016 5.816L0 24l7.351-1.931c.98.27 2.01.42 3.049.42 6.627 0 12-4.925 12-11S18.627 0 12 0zm0 19.077c-.864 0-1.715-.116-2.54-.332l-.549-.146-3.754.987.985-3.648-.207-.572C4.9 14.464 4.154 12.79 4.154 11c0-4.79 4.23-8.692 9.423-8.692 5.192 0 9.423 3.902 9.423 8.692S17.192 19.077 12 19.077z"/>
        </svg>
      );
    case 'signal':
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16l-1.414 1.414-2.121-2.121-2.121 2.121-1.414-1.414 2.121-2.121L10.498 3.93l1.414 1.414 2.121-2.121 2.121 2.121 1.414-1.414-2.121-2.121L17.568 8.16z"/>
        </svg>
      );
    case 'whatsapp':
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      );
    case 'telegram':
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.12l-6.87 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
        </svg>
      );
    default:
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      );
  }
}

function ChatLinkRow({ chatLink, onEdit, onToggleDashboard, onToggleLandingPage }: ChatLinkRowProps) {
  const [localDashboardEnabled, setLocalDashboardEnabled] = useState(chatLink.is_enabled_for_dashboard);
  const [localLandingPageEnabled, setLocalLandingPageEnabled] = useState(chatLink.is_enabled_for_landing_page);
  const [isTogglingDashboard, setIsTogglingDashboard] = useState(false);
  const [isTogglingLandingPage, setIsTogglingLandingPage] = useState(false);
  const { addToast } = useToast();

  // Sync local state with prop changes
  useEffect(() => {
    setLocalDashboardEnabled(chatLink.is_enabled_for_dashboard);
  }, [chatLink.is_enabled_for_dashboard]);

  useEffect(() => {
    setLocalLandingPageEnabled(chatLink.is_enabled_for_landing_page);
  }, [chatLink.is_enabled_for_landing_page]);

  const handleToggleDashboard = async (checked: boolean) => {
    // Optimistic update - update UI immediately
    setLocalDashboardEnabled(checked);
    setIsTogglingDashboard(true);
    
    try {
      await onToggleDashboard(chatLink.id, checked);
      addToast({
        type: 'success',
        title: `${chatLink.platform_display} ${checked ? 'enabled' : 'disabled'} for dashboard`,
        description: `The ${chatLink.platform_display} link has been ${checked ? 'enabled' : 'disabled'} for dashboard successfully.`,
      });
    } catch (err) {
      // Revert on error
      setLocalDashboardEnabled(chatLink.is_enabled_for_dashboard);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update status';
      addToast({
        type: 'error',
        title: 'Failed to update status',
        description: errorMessage,
      });
    } finally {
      setIsTogglingDashboard(false);
    }
  };

  const handleToggleLandingPage = async (checked: boolean) => {
    // Optimistic update - update UI immediately
    setLocalLandingPageEnabled(checked);
    setIsTogglingLandingPage(true);
    
    try {
      await onToggleLandingPage(chatLink.id, checked);
      addToast({
        type: 'success',
        title: `${chatLink.platform_display} ${checked ? 'enabled' : 'disabled'} for landing page`,
        description: `The ${chatLink.platform_display} link has been ${checked ? 'enabled' : 'disabled'} for landing page successfully.`,
      });
    } catch (err) {
      // Revert on error
      setLocalLandingPageEnabled(chatLink.is_enabled_for_landing_page);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update status';
      addToast({
        type: 'error',
        title: 'Failed to update status',
        description: errorMessage,
      });
    } finally {
      setIsTogglingLandingPage(false);
    }
  };

  return (
    <TableRow className="transition-all duration-200 hover:bg-gray-50/80 dark:hover:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700/50">
      <TableCell className="py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 border border-indigo-200/50 dark:border-indigo-700/50 text-indigo-600 dark:text-indigo-400 shrink-0">
            {getPlatformIcon(chatLink.platform)}
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              {chatLink.platform_display}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
              {chatLink.platform}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="py-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Switch
              checked={localDashboardEnabled}
              onChange={handleToggleDashboard}
              disabled={isTogglingDashboard}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={localLandingPageEnabled}
              onChange={handleToggleLandingPage}
              disabled={isTogglingLandingPage}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Landing Page</span>
          </div>
        </div>
      </TableCell>
      <TableCell className="py-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {formatDate(chatLink.modified)}
          </span>
        </div>
      </TableCell>
      <TableCell className="py-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            {chatLink.link_url ? (
              <a
                href={chatLink.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors break-all"
              >
                <span className="truncate">{chatLink.link_url}</span>
                <svg className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="italic">No URL set</span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(chatLink)}
            disabled={isTogglingDashboard || isTogglingLandingPage}
            className="flex items-center gap-2 shrink-0 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="hidden sm:inline">Edit</span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function ChatLinksTable({
  chatLinks,
  onEdit,
  onToggleDashboard,
  onToggleLandingPage,
}: {
  chatLinks: ChatLink[];
  onEdit: (chatLink: ChatLink) => void;
  onToggleDashboard: (id: number, checked: boolean) => Promise<void>;
  onToggleLandingPage: (id: number, checked: boolean) => Promise<void>;
}) {
  // Ensure chatLinks is always an array
  const linksArray = Array.isArray(chatLinks) ? chatLinks : [];

  if (linksArray.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">No chat links found</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Chat links will appear here once configured</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <TableHead className="font-semibold text-gray-700 dark:text-gray-300 py-3">Platform</TableHead>
            <TableHead className="font-semibold text-gray-700 dark:text-gray-300 py-3">Toggle Status</TableHead>
            <TableHead className="font-semibold text-gray-700 dark:text-gray-300 py-3">Last Modified</TableHead>
            <TableHead className="font-semibold text-gray-700 dark:text-gray-300 py-3">Link URL</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linksArray.map((chatLink) => (
            <ChatLinkRow
              key={chatLink.id}
              chatLink={chatLink}
              onEdit={onEdit}
              onToggleDashboard={onToggleDashboard}
              onToggleLandingPage={onToggleLandingPage}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface EditChatLinkDrawerProps {
  chatLink: ChatLink | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, data: UpdateChatLinkRequest) => Promise<void>;
  isSaving: boolean;
}

function EditChatLinkDrawer({ chatLink, isOpen, onClose, onSave, isSaving }: EditChatLinkDrawerProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (chatLink) {
      setLinkUrl(chatLink.link_url || '');
      setError(null);
    }
  }, [chatLink]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!chatLink) return;

    setError(null);

    try {
      await onSave(chatLink.id, { link_url: linkUrl });
      addToast({
        type: 'success',
        title: 'Link updated successfully',
        description: `The ${chatLink.platform_display} link URL has been updated.`,
      });
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update link';
      setError(errorMessage);
      addToast({
        type: 'error',
        title: 'Failed to update link',
        description: errorMessage,
      });
    }
  };

  if (!chatLink) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit ${chatLink.platform_display} Link`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300 flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium">Error updating link</p>
              <p className="text-sm mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800/50 dark:bg-blue-950/30">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                Platform Information
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                This link can be displayed on the player dashboard and/or the landing page footer. Enable the toggles as needed and make sure the URL is correct and accessible.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
            Link URL <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <Input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com/chat"
              disabled={isSaving}
              className="w-full pl-10"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Enter the full URL for the {chatLink.platform_display} chat link
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSaving}
            disabled={isSaving}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

export default function SocialLinksPage() {
  const { chatLinks, isLoading, error, fetchChatLinks, updateChatLink } = useChatLinksStore();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedChatLink, setSelectedChatLink] = useState<ChatLink | null>(null);

  useEffect(() => {
    fetchChatLinks();
  }, [fetchChatLinks]);

  const handleEdit = (chatLink: ChatLink) => {
    setSelectedChatLink(chatLink);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedChatLink(null);
  };

  const handleSave = async (id: number, data: UpdateChatLinkRequest) => {
    setIsUpdating(true);
    try {
      await updateChatLink(id, data);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleDashboard = async (id: number, checked: boolean) => {
    try {
      await updateChatLink(id, { is_enabled_for_dashboard: checked });
    } catch (err) {
      console.error('Failed to toggle dashboard status:', err);
      throw err;
    }
  };

  const handleToggleLandingPage = async (id: number, checked: boolean) => {
    try {
      await updateChatLink(id, { is_enabled_for_landing_page: checked });
    } catch (err) {
      console.error('Failed to toggle landing page status:', err);
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <ChatLinksHeader />
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const linksArray = Array.isArray(chatLinks) ? chatLinks : [];

  if (error && linksArray.length === 0) {
    return (
      <div className="space-y-6">
        <ChatLinksHeader />
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-6">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <Button variant="primary" onClick={fetchChatLinks}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <ChatLinksHeader />
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Chat Platform Links
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Manage social media and messaging platform links for player support
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50">
                <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                  {linksArray.filter((link) => link.is_enabled_for_dashboard).length} of {linksArray.length} (Dashboard)
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50">
                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                  {linksArray.filter((link) => link.is_enabled_for_landing_page).length} of {linksArray.length} (Landing Page)
                </span>
              </div>
            </div>
          </div>
        </div>
        <ChatLinksTable
          chatLinks={linksArray}
          onEdit={handleEdit}
          onToggleDashboard={handleToggleDashboard}
          onToggleLandingPage={handleToggleLandingPage}
        />
      </div>
      <EditChatLinkDrawer
        chatLink={selectedChatLink}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onSave={handleSave}
        isSaving={isUpdating}
      />
    </div>
  );
}
