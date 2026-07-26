'use client';

import { useEffect, useState } from 'react';
import { useChatLinksStore } from '@/stores';
import { Button, Input, Switch, Drawer } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { LoadingState, ErrorState } from '@/components/features';
import type { ChatLink, UpdateChatLinkRequest } from '@/types';

type ToggleHandlers = {
  onEdit: (chatLink: ChatLink) => void;
  onToggleDashboard: (id: number, checked: boolean) => Promise<void>;
  onToggleLandingPage: (id: number, checked: boolean) => Promise<void>;
};

function useLinkToggles(chatLink: ChatLink, handlers: ToggleHandlers) {
  const { addToast } = useToast();
  const [dashboardOn, setDashboardOn] = useState(chatLink.is_enabled_for_dashboard);
  const [landingOn, setLandingOn] = useState(chatLink.is_enabled_for_landing_page);
  const [busyDashboard, setBusyDashboard] = useState(false);
  const [busyLanding, setBusyLanding] = useState(false);

  useEffect(() => {
    setDashboardOn(chatLink.is_enabled_for_dashboard);
  }, [chatLink.is_enabled_for_dashboard]);

  useEffect(() => {
    setLandingOn(chatLink.is_enabled_for_landing_page);
  }, [chatLink.is_enabled_for_landing_page]);

  const handleToggleDashboard = async (checked: boolean) => {
    setDashboardOn(checked);
    setBusyDashboard(true);
    try {
      await handlers.onToggleDashboard(chatLink.id, checked);
      addToast({
        type: 'success',
        title: checked ? 'Dashboard on' : 'Dashboard off',
        description: chatLink.platform_display,
      });
    } catch (err) {
      setDashboardOn(chatLink.is_enabled_for_dashboard);
      addToast({
        type: 'error',
        title: 'Update failed',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusyDashboard(false);
    }
  };

  const handleToggleLanding = async (checked: boolean) => {
    setLandingOn(checked);
    setBusyLanding(true);
    try {
      await handlers.onToggleLandingPage(chatLink.id, checked);
      addToast({
        type: 'success',
        title: checked ? 'Landing on' : 'Landing off',
        description: chatLink.platform_display,
      });
    } catch (err) {
      setLandingOn(chatLink.is_enabled_for_landing_page);
      addToast({
        type: 'error',
        title: 'Update failed',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusyLanding(false);
    }
  };

  return {
    dashboardOn,
    landingOn,
    busyDashboard,
    busyLanding,
    busy: busyDashboard || busyLanding,
    handleToggleDashboard,
    handleToggleLanding,
  };
}

function MobileLinkCard({ chatLink, ...handlers }: { chatLink: ChatLink } & ToggleHandlers) {
  const {
    dashboardOn,
    landingOn,
    busyDashboard,
    busyLanding,
    busy,
    handleToggleDashboard,
    handleToggleLanding,
  } = useLinkToggles(chatLink, handlers);

  return (
    <li className="rounded-lg border border-gray-200 bg-gray-50/60 p-3.5 dark:border-gray-700 dark:bg-gray-900/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {chatLink.platform_display}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">{chatLink.platform}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => handlers.onEdit(chatLink)}
        >
          Edit
        </Button>
      </div>

      <div className="mt-3 space-y-3 border-t border-gray-200/80 pt-3 dark:border-gray-700">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">Dashboard</p>
          <Switch
            checked={dashboardOn}
            onChange={handleToggleDashboard}
            disabled={busyDashboard}
            tone="emerald"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">Landing page</p>
          <Switch
            checked={landingOn}
            onChange={handleToggleLanding}
            disabled={busyLanding}
            tone="emerald"
          />
        </div>
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-400">URL</p>
          {chatLink.link_url ? (
            <a
              href={chatLink.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-xs text-gray-600 underline-offset-2 hover:underline dark:text-gray-300"
            >
              {chatLink.link_url}
            </a>
          ) : (
            <p className="text-xs text-gray-400">Not set</p>
          )}
        </div>
      </div>
    </li>
  );
}

function DesktopLinkRow({ chatLink, ...handlers }: { chatLink: ChatLink } & ToggleHandlers) {
  const {
    dashboardOn,
    landingOn,
    busyDashboard,
    busyLanding,
    busy,
    handleToggleDashboard,
    handleToggleLanding,
  } = useLinkToggles(chatLink, handlers);

  return (
    <tr className="border-b border-gray-100 last:border-0 dark:border-gray-700/80">
      <td className="py-3.5 pr-4">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {chatLink.platform_display}
        </p>
        <p className="text-xs text-gray-400">{chatLink.platform}</p>
      </td>
      <td className="px-3 py-3.5">
        <Switch
          checked={dashboardOn}
          onChange={handleToggleDashboard}
          disabled={busyDashboard}
          tone="emerald"
        />
      </td>
      <td className="px-3 py-3.5">
        <Switch
          checked={landingOn}
          onChange={handleToggleLanding}
          disabled={busyLanding}
          tone="emerald"
        />
      </td>
                  <td className="px-3 py-3.5">
        {chatLink.link_url ? (
          <a
            href={chatLink.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-xs text-gray-600 underline-offset-2 hover:underline dark:text-gray-300"
            title={chatLink.link_url}
          >
            {chatLink.link_url}
          </a>
        ) : (
          <span className="text-xs text-gray-400">Not set</span>
        )}
      </td>
      <td className="py-3.5 pl-4 text-right">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => handlers.onEdit(chatLink)}
        >
          Edit
        </Button>
      </td>
    </tr>
  );
}

function EditLinkDrawer({
  chatLink,
  isOpen,
  onClose,
  onSave,
  isSaving,
}: {
  chatLink: ChatLink | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, data: UpdateChatLinkRequest) => Promise<void>;
  isSaving: boolean;
}) {
  const { addToast } = useToast();
  const [linkUrl, setLinkUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (chatLink) {
      setLinkUrl(chatLink.link_url || '');
      setError(null);
    }
  }, [chatLink]);

  if (!chatLink) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onSave(chatLink.id, { link_url: linkUrl });
      addToast({
        type: 'success',
        title: 'URL saved',
        description: chatLink.platform_display,
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update link';
      setError(message);
      addToast({ type: 'error', title: 'Save failed', description: message });
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit ${chatLink.platform_display}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}

        <div>
          <label
            htmlFor="link-url"
            className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-gray-100"
          >
            URL
          </label>
          <Input
            id="link-url"
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://…"
            disabled={isSaving}
          />
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            Shown on dashboard and/or landing when enabled.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSaving} disabled={isSaving}>
            Save
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
  const [selected, setSelected] = useState<ChatLink | null>(null);

  useEffect(() => {
    void fetchChatLinks();
  }, [fetchChatLinks]);

  const links = Array.isArray(chatLinks) ? chatLinks : [];
  const dashboardCount = links.filter((l) => l.is_enabled_for_dashboard).length;
  const landingCount = links.filter((l) => l.is_enabled_for_landing_page).length;

  const openEdit = (item: ChatLink) => {
    setSelected(item);
    setIsDrawerOpen(true);
  };

  const toggleHandlers = {
    onEdit: openEdit,
    onToggleDashboard: (id: number, checked: boolean) =>
      updateChatLink(id, { is_enabled_for_dashboard: checked }),
    onToggleLandingPage: (id: number, checked: boolean) =>
      updateChatLink(id, { is_enabled_for_landing_page: checked }),
  };

  const handleSave = async (id: number, data: UpdateChatLinkRequest) => {
    setIsUpdating(true);
    try {
      await updateChatLink(id, data);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) return <LoadingState />;
  if (error && links.length === 0) {
    return <ErrorState message={error} onRetry={fetchChatLinks} />;
  }

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Social links</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Chat platform URLs for the player dashboard and landing page.
        </p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Platforms</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {links.length
              ? `Dashboard ${dashboardCount}/${links.length} · Landing ${landingCount}/${links.length}`
              : 'No platforms yet'}
          </p>
        </div>

        {links.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400">
            No chat links configured.
          </p>
        ) : (
          <div className="px-5 py-4">
            <ul className="space-y-3 md:hidden">
              {links.map((link) => (
                <MobileLinkCard key={link.id} chatLink={link} {...toggleHandlers} />
              ))}
            </ul>

            <div className="hidden md:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2.5 pr-4 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                      Platform
                    </th>
                    <th className="w-24 px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                      Dashboard
                    </th>
                    <th className="w-24 px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                      Landing
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                      URL
                    </th>
                    <th className="py-2.5 pl-4 text-right text-[11px] font-medium uppercase tracking-wide text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {links.map((link) => (
                    <DesktopLinkRow key={link.id} chatLink={link} {...toggleHandlers} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <EditLinkDrawer
        chatLink={selected}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelected(null);
        }}
        onSave={handleSave}
        isSaving={isUpdating}
      />
    </div>
  );
}
