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
  Badge,
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
  onToggleEnabled: (id: number, checked: boolean) => Promise<void>;
}

function ChatLinkRow({ chatLink, onEdit, onToggleEnabled }: ChatLinkRowProps) {
  const [localIsEnabled, setLocalIsEnabled] = useState(chatLink.is_enabled);
  const [isToggling, setIsToggling] = useState(false);
  const { addToast } = useToast();

  // Sync local state with prop changes
  useEffect(() => {
    setLocalIsEnabled(chatLink.is_enabled);
  }, [chatLink.is_enabled]);

  const handleToggleEnabled = async (checked: boolean) => {
    // Optimistic update - update UI immediately
    setLocalIsEnabled(checked);
    setIsToggling(true);
    
    try {
      await onToggleEnabled(chatLink.id, checked);
      addToast({
        type: 'success',
        title: `${chatLink.platform_display} ${checked ? 'enabled' : 'disabled'}`,
        description: `The ${chatLink.platform_display} link has been ${checked ? 'enabled' : 'disabled'} successfully.`,
      });
    } catch (err) {
      // Revert on error
      setLocalIsEnabled(chatLink.is_enabled);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update status';
      addToast({
        type: 'error',
        title: 'Failed to update status',
        description: errorMessage,
      });
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <TableRow className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <TableCell>
        <div className="font-medium text-gray-900 dark:text-gray-100">
          {chatLink.platform_display}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {chatLink.platform}
        </div>
      </TableCell>
      <TableCell>
        <Switch
          checked={localIsEnabled}
          onChange={handleToggleEnabled}
          disabled={isToggling}
        />
      </TableCell>
      <TableCell>
        <Badge variant={localIsEnabled ? 'success' : 'default'}>
          {localIsEnabled ? 'Enabled' : 'Disabled'}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {formatDate(chatLink.modified)}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            {chatLink.link_url ? (
              <a
                href={chatLink.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
              >
                {chatLink.link_url}
              </a>
            ) : (
              <span className="text-sm italic text-gray-400 dark:text-gray-500">No URL set</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(chatLink)}
            disabled={isToggling}
            className="flex items-center gap-2 shrink-0"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function ChatLinksTable({
  chatLinks,
  onEdit,
  onToggleEnabled,
}: {
  chatLinks: ChatLink[];
  onEdit: (chatLink: ChatLink) => void;
  onToggleEnabled: (id: number, checked: boolean) => Promise<void>;
}) {
  // Ensure chatLinks is always an array
  const linksArray = Array.isArray(chatLinks) ? chatLinks : [];

  if (linksArray.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">No chat links found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Platform</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Enabled</TableHead>
            <TableHead>Last Modified</TableHead>
            <TableHead>Link URL</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linksArray.map((chatLink) => (
            <ChatLinkRow
              key={chatLink.id}
              chatLink={chatLink}
              onEdit={onEdit}
              onToggleEnabled={onToggleEnabled}
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
                This link will be displayed to players on their dashboard if enabled. Make sure the URL is correct and accessible.
              </p>
            </div>
          </div>
        </div>

        <div>
          <Input
            label="Link URL"
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com/chat"
            disabled={isSaving}
            className="w-full"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
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

  const handleToggleEnabled = async (id: number, checked: boolean) => {
    try {
      await updateChatLink(id, { is_enabled: checked });
    } catch (err) {
      console.error('Failed to toggle enabled status:', err);
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
    <div className="space-y-6">
      <ChatLinksHeader />
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <ChatLinksTable
          chatLinks={linksArray}
          onEdit={handleEdit}
          onToggleEnabled={handleToggleEnabled}
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
