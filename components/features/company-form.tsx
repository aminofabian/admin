'use client';

import { useState, FormEvent, ReactNode } from 'react';
import { Input, Button, PasswordInput } from '@/components/ui';
import { validatePassword } from '@/lib/utils/password-validation';
import type { Company, CreateCompanyRequest, UpdateCompanyRequest } from '@/types';

interface CompanyFormProps {
  company?: Company;
  onSubmit: (data: CreateCompanyRequest | UpdateCompanyRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const field = { compact: true } as const;

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="space-y-2">
    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{title}</h3>
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">{children}</div>
  </div>
);

const Provider = ({
  title,
  isOpen,
  onToggle,
  configured,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  configured?: boolean;
  children: ReactNode;
}) => (
  <div className="rounded-md border border-gray-200 dark:border-gray-800">
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50"
    >
      <span className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-gray-100">
        {title}
        {configured && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Configured" />}
      </span>
      <svg
        className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    {isOpen && (
      <div className="grid grid-cols-1 gap-2 border-t border-gray-200 p-2.5 md:grid-cols-2 dark:border-gray-800">
        {children}
      </div>
    )}
  </div>
);

const SecretInput = ({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) => (
  <Input
    {...field}
    label={label}
    type="password"
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder ?? '••••••••'}
    disabled={disabled}
    className={className}
    autoComplete="off"
  />
);

const hasValue = (...values: Array<string | undefined | null>) =>
  values.some((value) => Boolean(value?.trim()));

export const CompanyForm = ({ company, onSubmit, onCancel, isLoading }: CompanyFormProps) => {
  const isEditMode = !!company;

  const [formData, setFormData] = useState<CreateCompanyRequest>({
    project_name: company?.project_name || '',
    project_domain: company?.project_domain || '',
    admin_project_domain: company?.admin_project_domain || '',
    username: company?.username || '',
    password: '',
    email: company?.email || '',
    service_email: company?.service_email || '',
    service_name: company?.service_name || '',
    game_api_url: company?.game_api_url || '',
    game_api_key: company?.game_api_key || '',
    btcpay_api_key: company?.btcpay_api_key ?? '',
    btcpay_store_id: company?.btcpay_store_id ?? '',
    btcpay_webhook_secret: company?.btcpay_webhook_secret ?? '',
    binpay_api_key: company?.binpay_api_key ?? '',
    binpay_secret_key: company?.binpay_secret_key ?? '',
    binpay_deposit_secret_key: company?.binpay_deposit_secret_key ?? '',
    binpay_withdrawal_secret_key: company?.binpay_withdrawal_secret_key ?? '',
    brenzi_api_key: company?.brenzi_api_key ?? '',
    brenzi_webhook_secret: company?.brenzi_webhook_secret ?? '',
    taparcaida_vendor_id: company?.taparcaida_vendor_id ?? '',
    taparcaida_payout_api_key: company?.taparcaida_payout_api_key ?? '',
    taparcaida_payout_api_secret: company?.taparcaida_payout_api_secret ?? '',
    tierlock_merchant_id: company?.tierlock_merchant_id ?? '',
    tierlock_merchant_secret: company?.tierlock_merchant_secret ?? '',
    tierlock_deposit_secret: company?.tierlock_deposit_secret ?? '',
    tierlock_withdrawal_secret: company?.tierlock_withdrawal_secret ?? '',
    tierlock_payout_shared_secret: company?.tierlock_payout_shared_secret ?? '',
    tierlock_payout_client_secret: company?.tierlock_payout_client_secret ?? '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [openProviders, setOpenProviders] = useState<Record<string, boolean>>({
    btcpay: hasValue(formData.btcpay_api_key, formData.btcpay_store_id, formData.btcpay_webhook_secret),
    binpay: hasValue(
      formData.binpay_api_key,
      formData.binpay_secret_key,
      formData.binpay_deposit_secret_key,
      formData.binpay_withdrawal_secret_key,
    ),
    tierlock: hasValue(
      formData.tierlock_merchant_id,
      formData.tierlock_merchant_secret,
      formData.tierlock_deposit_secret,
      formData.tierlock_withdrawal_secret,
      formData.tierlock_payout_shared_secret,
      formData.tierlock_payout_client_secret,
    ),
    brenzi: hasValue(formData.brenzi_api_key, formData.brenzi_webhook_secret),
    taparcaida: hasValue(
      formData.taparcaida_vendor_id,
      formData.taparcaida_payout_api_key,
      formData.taparcaida_payout_api_secret,
    ),
  });

  const toggleProvider = (id: string) => {
    setOpenProviders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.project_name.trim()) newErrors.project_name = 'Required';
    if (!formData.project_domain.trim()) {
      newErrors.project_domain = 'Required';
    } else if (!/^https?:\/\/.+/.test(formData.project_domain)) {
      newErrors.project_domain = 'Invalid URL';
    }
    if (!formData.admin_project_domain.trim()) {
      newErrors.admin_project_domain = 'Required';
    } else if (!/^https?:\/\/.+/.test(formData.admin_project_domain)) {
      newErrors.admin_project_domain = 'Invalid URL';
    }
    if (!formData.username.trim()) {
      newErrors.username = 'Required';
    } else if (formData.username.length < 4) {
      newErrors.username = 'Min 4 chars';
    } else if (!/^[a-zA-Z0-9]+$/.test(formData.username)) {
      newErrors.username = 'Alphanumeric only';
    }
    if (!isEditMode) {
      if (!formData.password.trim()) {
        newErrors.password = 'Required';
      } else {
        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.isValid) newErrors.password = passwordValidation.errors[0];
      }
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email';
    }
    if (!isEditMode) {
      if (!formData.service_email.trim()) {
        newErrors.service_email = 'Required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.service_email)) {
        newErrors.service_email = 'Invalid email';
      }
      if (!formData.service_name.trim()) newErrors.service_name = 'Required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (isEditMode) {
        const updateData: UpdateCompanyRequest = {
          project_name: formData.project_name,
          project_domain: formData.project_domain,
          admin_project_domain: formData.admin_project_domain,
          username: formData.username,
          email: formData.email,
          service_email: formData.service_email,
          service_name: formData.service_name,
          game_api_url: formData.game_api_url,
          game_api_key: formData.game_api_key,
          btcpay_api_key: formData.btcpay_api_key,
          btcpay_store_id: formData.btcpay_store_id,
          btcpay_webhook_secret: formData.btcpay_webhook_secret,
          binpay_api_key: formData.binpay_api_key,
          binpay_secret_key: formData.binpay_secret_key,
          binpay_deposit_secret_key: formData.binpay_deposit_secret_key,
          binpay_withdrawal_secret_key: formData.binpay_withdrawal_secret_key,
          brenzi_api_key: formData.brenzi_api_key,
          brenzi_webhook_secret: formData.brenzi_webhook_secret,
          taparcaida_vendor_id: formData.taparcaida_vendor_id,
          taparcaida_payout_api_key: formData.taparcaida_payout_api_key,
          taparcaida_payout_api_secret: formData.taparcaida_payout_api_secret,
          tierlock_merchant_id: formData.tierlock_merchant_id,
          tierlock_merchant_secret: formData.tierlock_merchant_secret,
          tierlock_deposit_secret: formData.tierlock_deposit_secret,
          tierlock_withdrawal_secret: formData.tierlock_withdrawal_secret,
          tierlock_payout_shared_secret: formData.tierlock_payout_shared_secret,
          tierlock_payout_client_secret: formData.tierlock_payout_client_secret,
        };
        await onSubmit(updateData as CreateCompanyRequest | UpdateCompanyRequest);
      } else {
        await onSubmit(formData as CreateCompanyRequest | UpdateCompanyRequest);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleChange = (fieldName: keyof CreateCompanyRequest, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    if (errors[fieldName]) setErrors((prev) => ({ ...prev, [fieldName]: '' }));
  };

  const req = (label: string) => `${label} *`;

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <Section title="Company">
        <Input {...field} label={req('Project')} value={formData.project_name} onChange={(e) => handleChange('project_name', e.target.value)} error={errors.project_name} placeholder="Gaming Pro" disabled={isLoading} />
        <Input {...field} label={req('Username')} value={formData.username} onChange={(e) => handleChange('username', e.target.value)} error={errors.username} placeholder="gamingpro" disabled={isLoading} />
        <Input {...field} label={req('Site URL')} type="url" value={formData.project_domain} onChange={(e) => handleChange('project_domain', e.target.value)} error={errors.project_domain} placeholder="https://gamingpro.com" disabled={isLoading} />
        <Input {...field} label={req('Admin URL')} type="url" value={formData.admin_project_domain} onChange={(e) => handleChange('admin_project_domain', e.target.value)} error={errors.admin_project_domain} placeholder="https://admin.gamingpro.com" disabled={isLoading} />
      </Section>

      <Section title="Account">
        <Input {...field} label={req('Admin Email')} type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} error={errors.email} placeholder="admin@gamingpro.com" disabled={isLoading} />
        {!isEditMode && (
          <PasswordInput compact label={req('Password')} value={formData.password} onChange={(value) => handleChange('password', value)} error={errors.password} placeholder="Create a secure password" disabled={isLoading} />
        )}
        <Input {...field} label={isEditMode ? 'Support Email' : req('Support Email')} type="email" value={formData.service_email} onChange={(e) => handleChange('service_email', e.target.value)} error={errors.service_email} placeholder="support@gamingpro.com" disabled={isLoading} />
        <Input {...field} label={isEditMode ? 'Support Name' : req('Support Name')} value={formData.service_name} onChange={(e) => handleChange('service_name', e.target.value)} error={errors.service_name} placeholder="Gaming Pro Support" disabled={isLoading} />
      </Section>

      <Section title="Game API">
        <Input {...field} label="API URL" type="url" value={formData.game_api_url} onChange={(e) => handleChange('game_api_url', e.target.value)} placeholder="https://api.provider.com" disabled={isLoading} />
        <SecretInput label="API Key" value={formData.game_api_key} onChange={(v) => handleChange('game_api_key', v)} placeholder="game_sk_..." disabled={isLoading} />
      </Section>

      <div className="space-y-1.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Payments</h3>
        <div className="space-y-1">
          <Provider title="BTC Pay" isOpen={openProviders.btcpay} onToggle={() => toggleProvider('btcpay')} configured={hasValue(formData.btcpay_api_key, formData.btcpay_store_id, formData.btcpay_webhook_secret)}>
            <SecretInput label="API Key" value={formData.btcpay_api_key} onChange={(v) => handleChange('btcpay_api_key', v)} placeholder="btcpay_..." disabled={isLoading} />
            <Input {...field} label="Store ID" value={formData.btcpay_store_id} onChange={(e) => handleChange('btcpay_store_id', e.target.value)} placeholder="store_abc123" disabled={isLoading} />
            <SecretInput label="Webhook Secret" value={formData.btcpay_webhook_secret} onChange={(v) => handleChange('btcpay_webhook_secret', v)} placeholder="whsec_..." disabled={isLoading} className="md:col-span-2" />
          </Provider>

          <Provider title="Binpay" isOpen={openProviders.binpay} onToggle={() => toggleProvider('binpay')} configured={hasValue(formData.binpay_api_key, formData.binpay_secret_key, formData.binpay_deposit_secret_key, formData.binpay_withdrawal_secret_key)}>
            <SecretInput label="API Key" value={formData.binpay_api_key} onChange={(v) => handleChange('binpay_api_key', v)} placeholder="bp_key_..." disabled={isLoading} />
            <SecretInput label="Secret Key" value={formData.binpay_secret_key} onChange={(v) => handleChange('binpay_secret_key', v)} placeholder="bp_secret_..." disabled={isLoading} />
            <SecretInput label="Deposit Secret" value={formData.binpay_deposit_secret_key} onChange={(v) => handleChange('binpay_deposit_secret_key', v)} placeholder="bp_dep_..." disabled={isLoading} />
            <SecretInput label="Withdrawal Secret" value={formData.binpay_withdrawal_secret_key} onChange={(v) => handleChange('binpay_withdrawal_secret_key', v)} placeholder="bp_wd_..." disabled={isLoading} />
          </Provider>

          <Provider title="Tierlock" isOpen={openProviders.tierlock} onToggle={() => toggleProvider('tierlock')} configured={hasValue(formData.tierlock_merchant_id, formData.tierlock_merchant_secret, formData.tierlock_deposit_secret, formData.tierlock_withdrawal_secret, formData.tierlock_payout_shared_secret, formData.tierlock_payout_client_secret)}>
            <Input {...field} label="Merchant ID" value={formData.tierlock_merchant_id} onChange={(e) => handleChange('tierlock_merchant_id', e.target.value)} placeholder="tl_merch_..." disabled={isLoading} />
            <SecretInput label="Merchant Secret" value={formData.tierlock_merchant_secret} onChange={(v) => handleChange('tierlock_merchant_secret', v)} placeholder="tl_msec_..." disabled={isLoading} />
            <SecretInput label="Deposit Secret" value={formData.tierlock_deposit_secret} onChange={(v) => handleChange('tierlock_deposit_secret', v)} placeholder="tl_dep_..." disabled={isLoading} />
            <SecretInput label="Withdrawal Secret" value={formData.tierlock_withdrawal_secret} onChange={(v) => handleChange('tierlock_withdrawal_secret', v)} placeholder="tl_wd_..." disabled={isLoading} />
            <SecretInput label="Payout Shared" value={formData.tierlock_payout_shared_secret} onChange={(v) => handleChange('tierlock_payout_shared_secret', v)} placeholder="tl_psh_..." disabled={isLoading} />
            <SecretInput label="Payout Client" value={formData.tierlock_payout_client_secret} onChange={(v) => handleChange('tierlock_payout_client_secret', v)} placeholder="tl_pcl_..." disabled={isLoading} />
          </Provider>

          <Provider title="Brenzi" isOpen={openProviders.brenzi} onToggle={() => toggleProvider('brenzi')} configured={hasValue(formData.brenzi_api_key, formData.brenzi_webhook_secret)}>
            <SecretInput label="API Key" value={formData.brenzi_api_key} onChange={(v) => handleChange('brenzi_api_key', v)} placeholder="brz_key_..." disabled={isLoading} />
            <SecretInput label="Webhook Secret" value={formData.brenzi_webhook_secret} onChange={(v) => handleChange('brenzi_webhook_secret', v)} placeholder="brz_wh_..." disabled={isLoading} />
          </Provider>

          <Provider title="Taparcaida" isOpen={openProviders.taparcaida} onToggle={() => toggleProvider('taparcaida')} configured={hasValue(formData.taparcaida_vendor_id, formData.taparcaida_payout_api_key, formData.taparcaida_payout_api_secret)}>
            <Input {...field} label="Vendor ID" value={formData.taparcaida_vendor_id} onChange={(e) => handleChange('taparcaida_vendor_id', e.target.value)} placeholder="tap_vendor_..." disabled={isLoading} />
            <SecretInput label="Payout API Key" value={formData.taparcaida_payout_api_key} onChange={(v) => handleChange('taparcaida_payout_api_key', v)} placeholder="tap_payout_..." disabled={isLoading} />
            <SecretInput label="Payout API Secret" value={formData.taparcaida_payout_api_secret} onChange={(v) => handleChange('taparcaida_payout_api_secret', v)} placeholder="tap_secret_..." disabled={isLoading} />
          </Provider>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-gray-200 pt-2.5 dark:border-gray-800">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" size="sm" isLoading={isLoading} disabled={isLoading}>
          {isEditMode ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
};
