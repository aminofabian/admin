'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { canManageEmailBroadcasts } from '@/lib/constants/roles';
import { resolveEmailScopeUuid } from '@/lib/utils/project-uuid';
import { LoadingState } from '@/components/features';
import { EmailCampaignComposer } from '@/components/features/email-campaign-composer';

export default function EmailCampaignComposePage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const canEdit = canManageEmailBroadcasts(user?.role);

  useEffect(() => {
    if (user && !canManageEmailBroadcasts(user.role)) {
      router.push('/dashboard/settings');
    }
  }, [user, router]);

  const scopeUuid = resolveEmailScopeUuid({ role: user?.role }) || '';
  const scopeKey = `${user?.id || 'anon'}:${scopeUuid || 'brand'}`;

  if (isAuthLoading) return <LoadingState />;
  if (!canEdit) return null;

  return <EmailCampaignComposer scopeKey={scopeKey} />;
}
