'use client';

import { useState, useEffect, FormEvent, ReactNode } from 'react';
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

const STEPS = [
  { id: 'setup', label: 'Setup', description: 'Required company details' },
  { id: 'integrations', label: 'Integrations', description: 'Optional payment & game APIs' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

const Section = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) => (
  <section className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-900/40">
    <div className="mb-3 flex items-start gap-2.5">
      <div className="mt-0.5 h-5 w-1 shrink-0 rounded-full bg-gradient-to-b from-purple-500 to-indigo-500" />
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
    </div>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>
  </section>
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
  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950/40">
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
    >
      <span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
        {title}
        {configured ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Configured
          </span>
        ) : (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            Optional
          </span>
        )}
      </span>
      <svg
        className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    {isOpen && (
      <div className="grid grid-cols-1 gap-3 border-t border-gray-200 p-3 md:grid-cols-2 dark:border-gray-800">
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

const StepIndicator = ({ currentStep }: { currentStep: StepId }) => (
  <div className="flex items-center gap-2">
    {STEPS.map((step, index) => {
      const isActive = step.id === currentStep;
      const isComplete = STEPS.findIndex((s) => s.id === currentStep) > index;

      return (
        <div key={step.id} className="flex flex-1 items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-purple-600 text-white shadow-sm'
                  : isComplete
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              {isComplete ? (
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}
            </span>
            <div className="min-w-0">
              <p
                className={`truncate text-sm font-medium ${
                  isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {step.label}
              </p>
              <p className="hidden truncate text-xs text-gray-400 sm:block">{step.description}</p>
            </div>
          </div>
          {index < STEPS.length - 1 && (
            <div
              className={`h-px w-6 shrink-0 sm:w-10 ${
                isComplete ? 'bg-emerald-300 dark:bg-emerald-800' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          )}
        </div>
      );
    })}
  </div>
);

const InfoBanner = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800/50 dark:bg-blue-950/30">
    <div className="flex items-start gap-3">
      <svg
        className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <p className="text-sm font-medium text-blue-900 dark:text-blue-200">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-blue-700 dark:text-blue-300">{children}</p>
      </div>
    </div>
  </div>
);

const hasValue = (...values: Array<string | undefined | null>) =>
  values.some((value) => Boolean(value?.trim()));

const buildFormData = (company?: Company): CreateCompanyRequest => ({
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
  binpay_kyc_webhook_secret: company?.binpay_kyc_webhook_secret ?? '',
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

const buildOpenProviders = (formData: CreateCompanyRequest) => ({
  gameApi: hasValue(formData.game_api_url, formData.game_api_key),
  btcpay: hasValue(formData.btcpay_api_key, formData.btcpay_store_id, formData.btcpay_webhook_secret),
  binpay: hasValue(
    formData.binpay_api_key,
    formData.binpay_secret_key,
    formData.binpay_deposit_secret_key,
    formData.binpay_withdrawal_secret_key,
    formData.binpay_kyc_webhook_secret,
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

export const CompanyForm = ({ company, onSubmit, onCancel, isLoading }: CompanyFormProps) => {
  const isEditMode = !!company;

  const [formData, setFormData] = useState<CreateCompanyRequest>(() => buildFormData(company));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<StepId>('setup');
  const [openProviders, setOpenProviders] = useState<Record<string, boolean>>(() =>
    buildOpenProviders(buildFormData(company)),
  );

  useEffect(() => {
    if (!company) return;

    const nextFormData = buildFormData(company);
    setFormData(nextFormData);
    setOpenProviders(buildOpenProviders(nextFormData));
    setErrors({});
    setStep('setup');
  }, [company]);

  const toggleProvider = (id: string) => {
    setOpenProviders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const validateSetup = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.project_name.trim()) newErrors.project_name = 'Required';
    if (!formData.project_domain.trim()) {
      newErrors.project_domain = 'Required';
    } else if (!/^https?:\/\/.+/.test(formData.project_domain)) {
      newErrors.project_domain = 'Must start with http:// or https://';
    }
    if (!formData.admin_project_domain.trim()) {
      newErrors.admin_project_domain = 'Required';
    } else if (!/^https?:\/\/.+/.test(formData.admin_project_domain)) {
      newErrors.admin_project_domain = 'Must start with http:// or https://';
    }
    if (!formData.username.trim()) {
      newErrors.username = 'Required';
    } else if (formData.username.length < 4) {
      newErrors.username = 'Min 4 characters';
    } else if (!/^[a-zA-Z0-9]+$/.test(formData.username)) {
      newErrors.username = 'Letters and numbers only';
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

  const handleContinue = () => {
    if (validateSetup()) setStep('integrations');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateSetup()) {
      if (!isEditMode) setStep('setup');
      return;
    }

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
          binpay_kyc_webhook_secret: formData.binpay_kyc_webhook_secret,
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

  const setupFields = (
    <>
      <Section title="Brand & domains" description="How players and admins will reach this company.">
        <Input
          {...field}
          label={req('Project name')}
          value={formData.project_name}
          onChange={(e) => handleChange('project_name', e.target.value)}
          error={errors.project_name}
          placeholder="My Gaming Platform"
          disabled={isLoading}
        />
        <Input
          {...field}
          label={req('Player site URL')}
          type="url"
          value={formData.project_domain}
          onChange={(e) => handleChange('project_domain', e.target.value)}
          error={errors.project_domain}
          placeholder="https://mygaming.com"
          disabled={isLoading}
        />
        <Input
          {...field}
          label={req('Admin panel URL')}
          type="url"
          value={formData.admin_project_domain}
          onChange={(e) => handleChange('admin_project_domain', e.target.value)}
          error={errors.admin_project_domain}
          placeholder="https://admin.mygaming.com"
          disabled={isLoading}
          className="md:col-span-2"
        />
      </Section>

      <Section title="Admin account" description="Credentials for the company owner to sign in.">
        <Input
          {...field}
          label={req('Username')}
          value={formData.username}
          onChange={(e) => handleChange('username', e.target.value)}
          error={errors.username}
          placeholder="companyadmin"
          disabled={isLoading}
        />
        <Input
          {...field}
          label={req('Admin email')}
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={errors.email}
          placeholder="admin@mygaming.com"
          disabled={isLoading}
        />
        {!isEditMode && (
          <PasswordInput
            compact
            label={req('Password')}
            value={formData.password}
            onChange={(value) => handleChange('password', value)}
            error={errors.password}
            placeholder="Create a secure password"
            disabled={isLoading}
            className="md:col-span-2"
          />
        )}
      </Section>

      <Section title="Player support" description="Shown to players when they need help.">
        <Input
          {...field}
          label={isEditMode ? 'Support email' : req('Support email')}
          type="email"
          value={formData.service_email}
          onChange={(e) => handleChange('service_email', e.target.value)}
          error={errors.service_email}
          placeholder="support@mygaming.com"
          disabled={isLoading}
        />
        <Input
          {...field}
          label={isEditMode ? 'Support name' : req('Support name')}
          value={formData.service_name}
          onChange={(e) => handleChange('service_name', e.target.value)}
          error={errors.service_name}
          placeholder="My Gaming Support"
          disabled={isLoading}
        />
      </Section>
    </>
  );

  const integrationFields = (
    <div className="space-y-2">
      <Provider
        title="Game API"
        isOpen={openProviders.gameApi}
        onToggle={() => toggleProvider('gameApi')}
        configured={hasValue(formData.game_api_url, formData.game_api_key)}
      >
        <Input
          {...field}
          label="API URL"
          type="url"
          value={formData.game_api_url}
          onChange={(e) => handleChange('game_api_url', e.target.value)}
          placeholder="https://api.games.com"
          disabled={isLoading}
        />
        <SecretInput
          label="API key"
          value={formData.game_api_key}
          onChange={(v) => handleChange('game_api_key', v)}
          placeholder="game_sk_..."
          disabled={isLoading}
        />
      </Provider>

      <Provider
        title="BTC Pay"
        isOpen={openProviders.btcpay}
        onToggle={() => toggleProvider('btcpay')}
        configured={hasValue(formData.btcpay_api_key, formData.btcpay_store_id, formData.btcpay_webhook_secret)}
      >
        <SecretInput label="API key" value={formData.btcpay_api_key} onChange={(v) => handleChange('btcpay_api_key', v)} placeholder="btcpay_..." disabled={isLoading} />
        <Input {...field} label="Store ID" value={formData.btcpay_store_id} onChange={(e) => handleChange('btcpay_store_id', e.target.value)} placeholder="store_abc123" disabled={isLoading} />
        <SecretInput label="Webhook secret" value={formData.btcpay_webhook_secret} onChange={(v) => handleChange('btcpay_webhook_secret', v)} placeholder="whsec_..." disabled={isLoading} className="md:col-span-2" />
      </Provider>

      <Provider
        title="Binpay"
        isOpen={openProviders.binpay}
        onToggle={() => toggleProvider('binpay')}
        configured={hasValue(formData.binpay_api_key, formData.binpay_secret_key, formData.binpay_deposit_secret_key, formData.binpay_withdrawal_secret_key, formData.binpay_kyc_webhook_secret)}
      >
        <SecretInput label="API key" value={formData.binpay_api_key} onChange={(v) => handleChange('binpay_api_key', v)} placeholder="bp_key_..." disabled={isLoading} />
        <SecretInput label="Secret key" value={formData.binpay_secret_key} onChange={(v) => handleChange('binpay_secret_key', v)} placeholder="bp_secret_..." disabled={isLoading} />
        <SecretInput label="Deposit secret" value={formData.binpay_deposit_secret_key} onChange={(v) => handleChange('binpay_deposit_secret_key', v)} placeholder="bp_dep_..." disabled={isLoading} />
        <SecretInput label="Withdrawal secret" value={formData.binpay_withdrawal_secret_key} onChange={(v) => handleChange('binpay_withdrawal_secret_key', v)} placeholder="bp_wd_..." disabled={isLoading} />
        <SecretInput label="KYC webhook secret" value={formData.binpay_kyc_webhook_secret} onChange={(v) => handleChange('binpay_kyc_webhook_secret', v)} placeholder="bp_kyc_wh_..." disabled={isLoading} className="md:col-span-2" />
      </Provider>

      <Provider
        title="Tierlock"
        isOpen={openProviders.tierlock}
        onToggle={() => toggleProvider('tierlock')}
        configured={hasValue(
          formData.tierlock_merchant_id,
          formData.tierlock_merchant_secret,
          formData.tierlock_deposit_secret,
          formData.tierlock_withdrawal_secret,
          formData.tierlock_payout_shared_secret,
          formData.tierlock_payout_client_secret,
        )}
      >
        <Input {...field} label="Merchant ID" value={formData.tierlock_merchant_id} onChange={(e) => handleChange('tierlock_merchant_id', e.target.value)} placeholder="tl_merch_..." disabled={isLoading} />
        <SecretInput label="Merchant secret" value={formData.tierlock_merchant_secret} onChange={(v) => handleChange('tierlock_merchant_secret', v)} placeholder="tl_msec_..." disabled={isLoading} />
        <SecretInput label="Deposit secret" value={formData.tierlock_deposit_secret} onChange={(v) => handleChange('tierlock_deposit_secret', v)} placeholder="tl_dep_..." disabled={isLoading} />
        <SecretInput label="Withdrawal secret" value={formData.tierlock_withdrawal_secret} onChange={(v) => handleChange('tierlock_withdrawal_secret', v)} placeholder="tl_wd_..." disabled={isLoading} />
        <SecretInput label="Payout shared secret" value={formData.tierlock_payout_shared_secret} onChange={(v) => handleChange('tierlock_payout_shared_secret', v)} placeholder="tl_psh_..." disabled={isLoading} />
        <SecretInput label="Payout client secret" value={formData.tierlock_payout_client_secret} onChange={(v) => handleChange('tierlock_payout_client_secret', v)} placeholder="tl_pcl_..." disabled={isLoading} />
      </Provider>

      <Provider
        title="Brenzi"
        isOpen={openProviders.brenzi}
        onToggle={() => toggleProvider('brenzi')}
        configured={hasValue(formData.brenzi_api_key, formData.brenzi_webhook_secret)}
      >
        <SecretInput label="API key" value={formData.brenzi_api_key} onChange={(v) => handleChange('brenzi_api_key', v)} placeholder="brz_key_..." disabled={isLoading} />
        <SecretInput label="Webhook secret" value={formData.brenzi_webhook_secret} onChange={(v) => handleChange('brenzi_webhook_secret', v)} placeholder="brz_wh_..." disabled={isLoading} />
      </Provider>

      <Provider
        title="Taparcaida"
        isOpen={openProviders.taparcaida}
        onToggle={() => toggleProvider('taparcaida')}
        configured={hasValue(
          formData.taparcaida_vendor_id,
          formData.taparcaida_payout_api_key,
          formData.taparcaida_payout_api_secret,
        )}
      >
        <Input {...field} label="Vendor ID" value={formData.taparcaida_vendor_id} onChange={(e) => handleChange('taparcaida_vendor_id', e.target.value)} placeholder="tap_vendor_..." disabled={isLoading} />
        <SecretInput label="Payout API key" value={formData.taparcaida_payout_api_key} onChange={(v) => handleChange('taparcaida_payout_api_key', v)} placeholder="tap_payout_..." disabled={isLoading} />
        <SecretInput label="Payout API secret" value={formData.taparcaida_payout_api_secret} onChange={(v) => handleChange('taparcaida_payout_api_secret', v)} placeholder="tap_secret_..." disabled={isLoading} />
      </Provider>
    </div>
  );

  const showSetup = isEditMode || step === 'setup';
  const showIntegrations = isEditMode || step === 'integrations';

  return (
    <form onSubmit={handleSubmit} className="flex min-h-full flex-col">
      <div className="flex-1 space-y-4">
        {!isEditMode && <StepIndicator currentStep={step} />}

        {showSetup && (
          <div className="space-y-4">
            {!isEditMode && (
              <InfoBanner title="Start with the essentials">
                Only the fields below are required. You can add payment and game integrations on the next step — or skip them and configure later.
              </InfoBanner>
            )}
            {setupFields}
          </div>
        )}

        {showIntegrations && (
          <div className="space-y-4">
            {!isEditMode && (
              <InfoBanner title="Integrations are optional">
                Expand a provider to add credentials now. Leave them blank to finish setup and configure payments later from company settings.
              </InfoBanner>
            )}
            {isEditMode && (
              <section className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-5 w-1 rounded-full bg-gradient-to-b from-purple-500 to-indigo-500" />
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Integrations</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Payment providers and game API credentials. All optional.
                    </p>
                  </div>
                </div>
              </section>
            )}
            {integrationFields}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 -mx-6 mt-6 border-t border-gray-200 bg-white/95 px-6 py-4 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {!isEditMode && step === 'setup' && 'Step 1 of 2'}
            {!isEditMode && step === 'integrations' && 'Step 2 of 2 · All fields optional'}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>

            {!isEditMode && step === 'integrations' && (
              <Button type="button" variant="secondary" size="sm" onClick={() => setStep('setup')} disabled={isLoading}>
                Back
              </Button>
            )}

            {!isEditMode && step === 'setup' ? (
              <Button type="button" size="sm" onClick={handleContinue} disabled={isLoading}>
                Continue
              </Button>
            ) : (
              <Button type="submit" size="sm" isLoading={isLoading} disabled={isLoading}>
                {isEditMode ? 'Save changes' : 'Create company'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
};
