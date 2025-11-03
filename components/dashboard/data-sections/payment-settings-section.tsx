'use client';

import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { LoadingState, ErrorState } from '@/components/features';
import { usePaymentMethodsStore } from '@/stores';
import { useToast } from '@/components/ui/toast';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui';

const PAYMENT_ICON: JSX.Element = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

// Get payment method initials
const getPaymentMethodInitials = (paymentMethodDisplay: string): string => {
  const words = paymentMethodDisplay.trim().split(/\s+/);
  
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  } else if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  
  return 'PM';
};

// Payment method logos (DEPRECATED - keeping for reference)
const getPaymentMethodLogo = (methodType: string, paymentMethod: string): string | null => {
  const lowerType = methodType?.toLowerCase() || '';
  const lowerMethod = paymentMethod?.toLowerCase() || '';

  // ========== CRYPTOCURRENCIES ==========
  // Bitcoin & Bitcoin Variants
  if (lowerMethod.includes('bitcoin') || lowerMethod.includes('btc')) {
    return 'https://cryptoicons.org/api/icon/btc/200';
  }
  if (lowerMethod.includes('bitcoin cash') || lowerMethod.includes('bch')) {
    return 'https://cryptoicons.org/api/icon/bch/200';
  }
  if (lowerMethod.includes('bitcoin sv') || lowerMethod.includes('bsv')) {
    return 'https://cryptoicons.org/api/icon/bsv/200';
  }
  if (lowerMethod.includes('bitcoin gold') || lowerMethod.includes('btg')) {
    return 'https://cryptoicons.org/api/icon/btg/200';
  }
  if (lowerMethod.includes('lightning') || lowerMethod.includes('btc-ln')) {
    return 'https://cryptoicons.org/api/icon/btc/200';
  }
  
  // Ethereum & ERC-20 Tokens
  if (lowerMethod.includes('ethereum') || lowerMethod.includes('eth')) {
    return 'https://cryptoicons.org/api/icon/eth/200';
  }
  if (lowerMethod.includes('ethereum classic') || lowerMethod.includes('etc')) {
    return 'https://cryptoicons.org/api/icon/etc/200';
  }
  
  // Stablecoins
  if (lowerMethod.includes('usdt') || lowerMethod.includes('tether')) {
    return 'https://cryptoicons.org/api/icon/usdt/200';
  }
  if (lowerMethod.includes('usdc') || lowerMethod.includes('usd coin')) {
    return 'https://cryptoicons.org/api/icon/usdc/200';
  }
  if (lowerMethod.includes('dai')) {
    return 'https://cryptoicons.org/api/icon/dai/200';
  }
  if (lowerMethod.includes('busd') || lowerMethod.includes('binance usd')) {
    return 'https://cryptoicons.org/api/icon/busd/200';
  }
  if (lowerMethod.includes('tusd') || lowerMethod.includes('trueusd')) {
    return 'https://cryptoicons.org/api/icon/tusd/200';
  }
  if (lowerMethod.includes('pax') || lowerMethod.includes('paxos')) {
    return 'https://cryptoicons.org/api/icon/pax/200';
  }
  if (lowerMethod.includes('gusd') || lowerMethod.includes('gemini dollar')) {
    return 'https://cryptoicons.org/api/icon/gusd/200';
  }
  
  // Major Altcoins
  if (lowerMethod.includes('litecoin') || lowerMethod.includes('ltc')) {
    return 'https://cryptoicons.org/api/icon/ltc/200';
  }
  if (lowerMethod.includes('ripple') || lowerMethod.includes('xrp')) {
    return 'https://cryptoicons.org/api/icon/xrp/200';
  }
  if (lowerMethod.includes('cardano') || lowerMethod.includes('ada')) {
    return 'https://cryptoicons.org/api/icon/ada/200';
  }
  if (lowerMethod.includes('polkadot') || lowerMethod.includes('dot')) {
    return 'https://cryptoicons.org/api/icon/dot/200';
  }
  if (lowerMethod.includes('solana') || lowerMethod.includes('sol')) {
    return 'https://cryptoicons.org/api/icon/sol/200';
  }
  if (lowerMethod.includes('avalanche') || lowerMethod.includes('avax')) {
    return 'https://cryptoicons.org/api/icon/avax/200';
  }
  if (lowerMethod.includes('polygon') || lowerMethod.includes('matic')) {
    return 'https://cryptoicons.org/api/icon/matic/200';
  }
  if (lowerMethod.includes('chainlink') || lowerMethod.includes('link')) {
    return 'https://cryptoicons.org/api/icon/link/200';
  }
  if (lowerMethod.includes('uniswap') || lowerMethod.includes('uni')) {
    return 'https://cryptoicons.org/api/icon/uni/200';
  }
  if (lowerMethod.includes('cosmos') || lowerMethod.includes('atom')) {
    return 'https://cryptoicons.org/api/icon/atom/200';
  }
  if (lowerMethod.includes('algorand') || lowerMethod.includes('algo')) {
    return 'https://cryptoicons.org/api/icon/algo/200';
  }
  if (lowerMethod.includes('stellar') || lowerMethod.includes('xlm')) {
    return 'https://cryptoicons.org/api/icon/xlm/200';
  }
  if (lowerMethod.includes('vechain') || lowerMethod.includes('vet')) {
    return 'https://cryptoicons.org/api/icon/vet/200';
  }
  if (lowerMethod.includes('filecoin') || lowerMethod.includes('fil')) {
    return 'https://cryptoicons.org/api/icon/fil/200';
  }
  if (lowerMethod.includes('hedera') || lowerMethod.includes('hbar')) {
    return 'https://cryptoicons.org/api/icon/hbar/200';
  }
  if (lowerMethod.includes('internet computer') || lowerMethod.includes('icp')) {
    return 'https://cryptoicons.org/api/icon/icp/200';
  }
  if (lowerMethod.includes('elrond') || lowerMethod.includes('egld')) {
    return 'https://cryptoicons.org/api/icon/egld/200';
  }
  if (lowerMethod.includes('theta')) {
    return 'https://cryptoicons.org/api/icon/theta/200';
  }
  if (lowerMethod.includes('tezos') || lowerMethod.includes('xtz')) {
    return 'https://cryptoicons.org/api/icon/xtz/200';
  }
  if (lowerMethod.includes('eos')) {
    return 'https://cryptoicons.org/api/icon/eos/200';
  }
  if (lowerMethod.includes('aave')) {
    return 'https://cryptoicons.org/api/icon/aave/200';
  }
  if (lowerMethod.includes('monero') || lowerMethod.includes('xmr')) {
    return 'https://cryptoicons.org/api/icon/xmr/200';
  }
  if (lowerMethod.includes('zcash') || lowerMethod.includes('zec')) {
    return 'https://cryptoicons.org/api/icon/zec/200';
  }
  if (lowerMethod.includes('dash')) {
    return 'https://cryptoicons.org/api/icon/dash/200';
  }
  if (lowerMethod.includes('neo')) {
    return 'https://cryptoicons.org/api/icon/neo/200';
  }
  if (lowerMethod.includes('iota') || lowerMethod.includes('miota')) {
    return 'https://cryptoicons.org/api/icon/iota/200';
  }
  if (lowerMethod.includes('maker') || lowerMethod.includes('mkr')) {
    return 'https://cryptoicons.org/api/icon/mkr/200';
  }
  if (lowerMethod.includes('compound') || lowerMethod.includes('comp')) {
    return 'https://cryptoicons.org/api/icon/comp/200';
  }
  
  // Exchange Tokens
  if (lowerMethod.includes('binance') || lowerMethod.includes('bnb')) {
    return 'https://cryptoicons.org/api/icon/bnb/200';
  }
  if (lowerMethod.includes('ftx') || lowerMethod.includes('ftt')) {
    return 'https://cryptoicons.org/api/icon/ftt/200';
  }
  if (lowerMethod.includes('crypto.com') || lowerMethod.includes('cro')) {
    return 'https://cryptoicons.org/api/icon/cro/200';
  }
  if (lowerMethod.includes('okb')) {
    return 'https://cryptoicons.org/api/icon/okb/200';
  }
  if (lowerMethod.includes('huobi') || lowerMethod.includes('ht')) {
    return 'https://cryptoicons.org/api/icon/ht/200';
  }
  if (lowerMethod.includes('kucoin') || lowerMethod.includes('kcs')) {
    return 'https://cryptoicons.org/api/icon/kcs/200';
  }
  
  // Layer 2 & Scaling Solutions
  if (lowerMethod.includes('arbitrum') || lowerMethod.includes('arb')) {
    return 'https://cryptoicons.org/api/icon/arb/200';
  }
  if (lowerMethod.includes('optimism') || lowerMethod.includes('op')) {
    return 'https://cryptoicons.org/api/icon/op/200';
  }
  
  // Tron Ecosystem
  if (lowerMethod.includes('tron') || lowerMethod.includes('trx')) {
    return 'https://cryptoicons.org/api/icon/trx/200';
  }
  
  // Meme Coins
  if (lowerMethod.includes('dogecoin') || lowerMethod.includes('doge')) {
    return 'https://cryptoicons.org/api/icon/doge/200';
  }
  if (lowerMethod.includes('shiba') || lowerMethod.includes('shib')) {
    return 'https://cryptoicons.org/api/icon/shib/200';
  }
  if (lowerMethod.includes('floki')) {
    return 'https://cryptoicons.org/api/icon/floki/200';
  }
  if (lowerMethod.includes('pepe')) {
    return 'https://cryptoicons.org/api/icon/pepe/200';
  }
  
  // DeFi Tokens
  if (lowerMethod.includes('pancakeswap') || lowerMethod.includes('cake')) {
    return 'https://cryptoicons.org/api/icon/cake/200';
  }
  if (lowerMethod.includes('sushiswap') || lowerMethod.includes('sushi')) {
    return 'https://cryptoicons.org/api/icon/sushi/200';
  }
  if (lowerMethod.includes('curve') || lowerMethod.includes('crv')) {
    return 'https://cryptoicons.org/api/icon/crv/200';
  }
  if (lowerMethod.includes('yearn') || lowerMethod.includes('yfi')) {
    return 'https://cryptoicons.org/api/icon/yfi/200';
  }
  if (lowerMethod.includes('synthetix') || lowerMethod.includes('snx')) {
    return 'https://cryptoicons.org/api/icon/snx/200';
  }
  
  // Gaming & Metaverse
  if (lowerMethod.includes('sandbox') || lowerMethod.includes('sand')) {
    return 'https://cryptoicons.org/api/icon/sand/200';
  }
  if (lowerMethod.includes('decentraland') || lowerMethod.includes('mana')) {
    return 'https://cryptoicons.org/api/icon/mana/200';
  }
  if (lowerMethod.includes('axie') || lowerMethod.includes('axs')) {
    return 'https://cryptoicons.org/api/icon/axs/200';
  }
  if (lowerMethod.includes('gala')) {
    return 'https://cryptoicons.org/api/icon/gala/200';
  }
  if (lowerMethod.includes('enjin') || lowerMethod.includes('enj')) {
    return 'https://cryptoicons.org/api/icon/enj/200';
  }
  if (lowerMethod.includes('immutable') || lowerMethod.includes('imx')) {
    return 'https://cryptoicons.org/api/icon/imx/200';
  }
  
  // Other Popular Cryptos
  if (lowerMethod.includes('apecoin') || lowerMethod.includes('ape')) {
    return 'https://cryptoicons.org/api/icon/ape/200';
  }
  if (lowerMethod.includes('quant') || lowerMethod.includes('qnt')) {
    return 'https://cryptoicons.org/api/icon/qnt/200';
  }
  if (lowerMethod.includes('fantom') || lowerMethod.includes('ftm')) {
    return 'https://cryptoicons.org/api/icon/ftm/200';
  }
  if (lowerMethod.includes('near')) {
    return 'https://cryptoicons.org/api/icon/near/200';
  }
  if (lowerMethod.includes('flow')) {
    return 'https://cryptoicons.org/api/icon/flow/200';
  }
  if (lowerMethod.includes('aptos') || lowerMethod.includes('apt')) {
    return 'https://cryptoicons.org/api/icon/apt/200';
  }
  if (lowerMethod.includes('sui')) {
    return 'https://cryptoicons.org/api/icon/sui/200';
  }
  if (lowerMethod.includes('injective') || lowerMethod.includes('inj')) {
    return 'https://cryptoicons.org/api/icon/inj/200';
  }
  if (lowerMethod.includes('sei')) {
    return 'https://cryptoicons.org/api/icon/sei/200';
  }
  if (lowerMethod.includes('celestia') || lowerMethod.includes('tia')) {
    return 'https://cryptoicons.org/api/icon/tia/200';
  }
  
  // Generic Crypto Fallback
  if (lowerType.includes('crypto')) {
    return 'https://cryptoicons.org/api/icon/btc/200';
  }

  // ========== E-WALLETS ==========
  if (lowerMethod.includes('paypal')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/paypal.svg';
  }
  if (lowerMethod.includes('skrill')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/skrill.svg';
  }
  if (lowerMethod.includes('neteller')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/neteller.svg';
  }
  if (lowerMethod.includes('paysafecard') || lowerMethod.includes('paysafe')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/paysafecard.svg';
  }
  if (lowerMethod.includes('venmo')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/venmo.svg';
  }
  if (lowerMethod.includes('cashapp') || lowerMethod.includes('cash app')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/cashapp.svg';
  }
  if (lowerMethod.includes('applepay') || lowerMethod.includes('apple pay')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/applepay.svg';
  }
  if (lowerMethod.includes('googlepay') || lowerMethod.includes('google pay') || lowerMethod.includes('gpay')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googlepay.svg';
  }
  if (lowerMethod.includes('alipay')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/alipay.svg';
  }
  if (lowerMethod.includes('wechat') || lowerMethod.includes('wepay')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/wechat.svg';
  }

  // ========== MOBILE MONEY ==========
  if (lowerMethod.includes('mpesa') || lowerMethod.includes('m-pesa')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg';
  }
  if (lowerMethod.includes('airtel')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Airtel_Money_Logo.svg';
  }

  // ========== CREDIT/DEBIT CARDS ==========
  if (lowerMethod.includes('visa')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/visa.svg';
  }
  if (lowerMethod.includes('mastercard') || lowerMethod.includes('master')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/mastercard.svg';
  }
  if (lowerMethod.includes('amex') || lowerMethod.includes('americanexpress') || lowerMethod.includes('american express')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/americanexpress.svg';
  }
  if (lowerMethod.includes('discover')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/discover.svg';
  }
  if (lowerMethod.includes('maestro')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/maestro.svg';
  }
  if (lowerMethod.includes('diners') || lowerMethod.includes('dinersclub')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/dinersclub.svg';
  }
  if (lowerMethod.includes('jcb')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/jcb.svg';
  }
  if (lowerMethod.includes('unionpay')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/unionpay.svg';
  }

  // ========== BANK TRANSFERS ==========
  if (lowerMethod.includes('stripe')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/stripe.svg';
  }
  if (lowerMethod.includes('wise') || lowerMethod.includes('transferwise')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/wise.svg';
  }
  if (lowerMethod.includes('revolut')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/revolut.svg';
  }
  if (lowerMethod.includes('payoneer')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/payoneer.svg';
  }
  if (lowerMethod.includes('western union') || lowerMethod.includes('westernunion')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/westernunion.svg';
  }
  if (lowerMethod.includes('moneygram')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/moneygram.svg';
  }

  // ========== OTHER PAYMENT METHODS ==========
  if (lowerMethod.includes('klarna')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/klarna.svg';
  }
  if (lowerMethod.includes('afterpay')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/afterpay.svg';
  }
  if (lowerMethod.includes('affirm')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/affirm.svg';
  }
  if (lowerMethod.includes('square')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/square.svg';
  }
  if (lowerMethod.includes('zelle')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/zelle.svg';
  }
  if (lowerMethod.includes('paytm')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/paytm.svg';
  }
  if (lowerMethod.includes('phonepe')) {
    return 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/phonepe.svg';
  }

  return null;
};

// Payment method icons (fallback)
const getPaymentMethodIcon = (methodType: string, paymentMethod: string): JSX.Element => {
  const lowerType = methodType?.toLowerCase() || '';
  const lowerMethod = paymentMethod?.toLowerCase() || '';

  // Crypto
  if (lowerType.includes('crypto') || lowerMethod.includes('bitcoin')) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }

  // Credit Card
  if (lowerType.includes('card') || lowerMethod.includes('card') || lowerMethod.includes('credit') || lowerMethod.includes('debit')) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    );
  }

  // Bank/Wire Transfer
  if (lowerType.includes('bank') || lowerMethod.includes('bank') || lowerMethod.includes('wire') || lowerMethod.includes('transfer')) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    );
  }

  // E-wallet/Mobile Money
  if (lowerType.includes('wallet') || lowerMethod.includes('wallet') || lowerMethod.includes('mobile') || lowerMethod.includes('mpesa') || lowerMethod.includes('paypal') || lowerMethod.includes('skrill') || lowerMethod.includes('neteller') || lowerMethod.includes('paysafecard')) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    );
  }

  // Default payment icon
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
};

export function PaymentSettingsSection() {
  const paymentMethods = usePaymentMethodsStore((state) => state.paymentMethods);
  const isLoading = usePaymentMethodsStore((state) => state.isLoading);
  const error = usePaymentMethodsStore((state) => state.error);
  const fetchPaymentMethods = usePaymentMethodsStore((state) => state.fetchPaymentMethods);
  const { addToast } = useToast();
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());

  const results = paymentMethods ?? [];
  const totalCount = results.length;

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  if (isLoading && !paymentMethods) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchPaymentMethods} />;
  }

  const enabledCount = results.filter(m => m.is_enabled).length;
  const disabledCount = results.filter(m => !m.is_enabled).length;

  // Sort payment methods: cryptos first, then others
  const sortedResults = [...results].sort((a, b) => {
    const aIsCrypto = a.method_type?.toLowerCase().includes('crypto') || a.payment_method?.toLowerCase().includes('crypto');
    const bIsCrypto = b.method_type?.toLowerCase().includes('crypto') || b.payment_method?.toLowerCase().includes('crypto');
    
    if (aIsCrypto && !bIsCrypto) return -1;
    if (!aIsCrypto && bIsCrypto) return 1;
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Payment Methods</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage and configure available payment methods
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Payment Methods</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{totalCount}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
          <div className="text-2xl font-bold text-green-500 mt-1">
            {enabledCount}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Inactive</div>
          <div className="text-2xl font-bold text-gray-500 mt-1">{disabledCount}</div>
        </div>
      </div>

      {/* Payment Methods Table */}
      {results.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              {PAYMENT_ICON}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No Payment Methods</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Payment methods will appear here once configured
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedResults.map((method) => (
                    <TableRow key={method.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 font-semibold text-xs text-gray-600 dark:text-gray-300">
                          {getPaymentMethodInitials(method.payment_method_display)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {method.payment_method_display}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {method.payment_method}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-md border border-amber-200 dark:border-amber-800 text-xs font-medium capitalize">
                        {method.method_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${method.is_enabled ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${method.is_enabled ? 'bg-green-500' : 'bg-red-500'}`} />
                        {method.is_enabled ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">
                      {new Date(method.modified).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={async () => {
                          const isCurrentlyLoading = loadingIds.has(method.id);
                          if (isCurrentlyLoading) return;

                          setLoadingIds((prev) => new Set(prev).add(method.id));
                          
                          try {
                            const newStatus = !method.is_enabled;
                            await usePaymentMethodsStore.getState().updatePaymentMethod(method.id, {
                              is_enabled: newStatus,
                            });
                            
                            addToast({
                              type: 'success',
                              title: newStatus ? 'Payment method enabled' : 'Payment method disabled',
                              description: `${method.payment_method_display} has been ${newStatus ? 'enabled' : 'disabled'} successfully.`,
                            });
                          } catch (error) {
                            console.error('Failed to update payment method:', error);
                            addToast({
                              type: 'error',
                              title: 'Update failed',
                              description: `Failed to ${method.is_enabled ? 'disable' : 'enable'} ${method.payment_method_display}.`,
                            });
                          } finally {
                            setLoadingIds((prev) => {
                              const next = new Set(prev);
                              next.delete(method.id);
                              return next;
                            });
                          }
                        }}
                        disabled={loadingIds.has(method.id)}
                        className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                          method.is_enabled
                            ? loadingIds.has(method.id)
                              ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 cursor-not-allowed opacity-70'
                              : 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-950/40 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md hover:-translate-y-0.5 active:scale-95 active:translate-y-0'
                            : loadingIds.has(method.id)
                              ? 'bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-800 cursor-not-allowed opacity-70'
                              : 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/50 hover:border-green-300 dark:hover:border-green-700 hover:shadow-md hover:-translate-y-0.5 active:scale-95 active:translate-y-0'
                        }`}
                      >
                        {loadingIds.has(method.id) ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                            <span className="whitespace-nowrap">
                              {method.is_enabled ? 'Disabling...' : 'Enabling...'}
                            </span>
                          </>
                        ) : (
                          <span className="whitespace-nowrap">{method.is_enabled ? 'Disable' : 'Enable'}</span>
                        )}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-2">
            {sortedResults.map((method) => (
              <div
                key={method.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between gap-6">
                    {/* Left: Icon + Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 font-semibold text-xs text-gray-600 dark:text-gray-300">
                        {getPaymentMethodInitials(method.payment_method_display)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 leading-tight truncate">
                          {method.payment_method_display}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                          {method.payment_method}
                        </p>
                      </div>
                    </div>

                    {/* Right: Action Button */}
                    <button
                      onClick={async () => {
                        const isCurrentlyLoading = loadingIds.has(method.id);
                        if (isCurrentlyLoading) return;

                        setLoadingIds((prev) => new Set(prev).add(method.id));
                        
                        try {
                          const newStatus = !method.is_enabled;
                          await usePaymentMethodsStore.getState().updatePaymentMethod(method.id, {
                            is_enabled: newStatus,
                          });
                          
                          addToast({
                            type: 'success',
                            title: newStatus ? 'Payment method enabled' : 'Payment method disabled',
                            description: `${method.payment_method_display} has been ${newStatus ? 'enabled' : 'disabled'} successfully.`,
                          });
                        } catch (error) {
                          console.error('Failed to update payment method:', error);
                          addToast({
                            type: 'error',
                            title: 'Update failed',
                            description: `Failed to ${method.is_enabled ? 'disable' : 'enable'} ${method.payment_method_display}.`,
                          });
                        } finally {
                          setLoadingIds((prev) => {
                            const next = new Set(prev);
                            next.delete(method.id);
                            return next;
                          });
                        }
                      }}
                      disabled={loadingIds.has(method.id)}
                      className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                        method.is_enabled
                          ? loadingIds.has(method.id)
                            ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 cursor-not-allowed opacity-70'
                            : 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-950/40 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md hover:-translate-y-0.5 active:scale-95 active:translate-y-0'
                          : loadingIds.has(method.id)
                            ? 'bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-800 cursor-not-allowed opacity-70'
                            : 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/50 hover:border-green-300 dark:hover:border-green-700 hover:shadow-md hover:-translate-y-0.5 active:scale-95 active:translate-y-0'
                      }`}
                    >
                      {loadingIds.has(method.id) ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                          <span className="whitespace-nowrap">
                            {method.is_enabled ? 'Disabling...' : 'Enabling...'}
                          </span>
                        </>
                      ) : (
                        <span className="whitespace-nowrap">{method.is_enabled ? 'Disable' : 'Enable'}</span>
                      )}
                    </button>
                  </div>

                  {/* Mobile badges */}
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <span className="inline-flex items-center px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-md border border-amber-200 dark:border-amber-800 text-xs font-medium capitalize">
                      {method.method_type}
                    </span>
                    
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${method.is_enabled ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${method.is_enabled ? 'bg-green-500' : 'bg-red-500'}`} />
                      {method.is_enabled ? 'Active' : 'Inactive'}
                    </span>

                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {new Date(method.modified).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
