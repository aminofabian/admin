'use client';

import { useState, useEffect } from 'react';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import {
  ControlGrid,
  BonusWidget,
  AffiliateNetworkWidget,
  LivePlayersWidget,
  TransactionStatusWidget,
  RevenueWidget,
  CompaniesSection,
  PlayersSection,
  GamesSection,
  ManagersSection,
  AgentsSection,
  StaffsSection,
  TransactionsSection,
  BannersSection,
  AffiliatesSection,
} from '@/components/dashboard/main-content-sections';
import { BonusesSection } from '@/components/dashboard/data-sections/bonuses-section';
import { ProcessingSection } from '@/components/dashboard/data-sections/processing-section';
import { 
  CompanySettingsSection,
  GameSettingsSection,
  PaymentSettingsSection,
  SocialLinksSection,
  AffiliateSettingsSection,
  GameActivityModal,
} from '@/components/dashboard/data-sections';
import { useTransactionQueuesStore } from '@/stores/use-transaction-queues-store';
import type { ControlSection } from '@/components/dashboard/main-content-sections';

export default function DashboardPage() {
  const { stats, loading: statsLoading } = useDashboardStats();
  const [activeSection, setActiveSection] = useState<ControlSection | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGameActivityModalOpen, setIsGameActivityModalOpen] = useState(false);
  
  const { queues, isLoading: queuesLoading, fetchQueues, setFilter } = useTransactionQueuesStore();

  const handleSectionClick = (section: ControlSection | undefined) => {
    if (section) {
      if (section === 'game-activities') {
        // Set filter to processing (this will also fetch queues)
        setFilter('processing');
        setIsGameActivityModalOpen(true);
      } else {
        setActiveSection(section);
        setIsModalOpen(true);
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setActiveSection(null), 300); // Delay to allow modal close animation
  };

  const handleCloseGameActivityModal = () => {
    setIsGameActivityModalOpen(false);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'companies':
        return <CompaniesSection />;
      case 'players':
        return <PlayersSection />;
      case 'games':
        return <GamesSection />;
      case 'managers':
        return <ManagersSection />;
      case 'agents':
        return <AgentsSection />;
      case 'staffs':
        return <StaffsSection />;
      case 'transactions':
        return <TransactionsSection />;
      case 'processing':
        return <ProcessingSection type="game_activities" />;
      case 'banners':
        return <BannersSection />;
      case 'affiliates':
        return <AffiliatesSection />;
      case 'bonuses':
        return <BonusesSection />;
      case 'company-settings':
        return <CompanySettingsSection />;
      case 'game-settings':
        return <GameSettingsSection />;
      case 'payment-settings':
        return <PaymentSettingsSection />;
      case 'social-links':
        return <SocialLinksSection />;
      case 'affiliate-settings':
        return <AffiliateSettingsSection />;
      default:
        return null;
    }
  };

  const getSectionTitle = () => {
    if (!activeSection) return '';
    
    const titleMap: Record<string, string> = {
      'company-settings': 'Company Settings',
      'game-settings': 'Game Settings',
      'payment-settings': 'Payment Settings',
      'social-links': 'Social Links',
      'affiliate-settings': 'Affiliate Settings',
    };
    
    return titleMap[activeSection] || activeSection.charAt(0).toUpperCase() + activeSection.slice(1).replace(/-/g, ' ');
  };

  return (
    <>
      {/* Game Activity Modal */}
      <GameActivityModal
        isOpen={isGameActivityModalOpen}
        onClose={handleCloseGameActivityModal}
        activities={queues || []}
        title="Game Activities"
        description="View and manage game activities"
      />

      {/* Full Screen Modal for Data Sections */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={handleCloseModal}
          />
          
          {/* Modal Content */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative w-full h-full max-w-7xl bg-background shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              {/* Modal Header */}
              <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">{getSectionTitle()}</h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-muted transition-colors"
                  title="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Modal Body */}
              <div className="overflow-y-auto h-[calc(100%-5rem)] p-6">
                {renderSection()}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen">
        {/* 🎨 CREATIVE RESPONSIVE LAYOUT:
          Mobile (< 640px): Single column, stacked with native app feel
          Tablet (640px-1024px): 2 columns, key metrics prioritized
          Laptop (1024px-1280px): 12-col grid, sidebar + main
          Desktop (1280px+): Full 3-column layout
      */}

      {/* Mobile: Native App Layout */}
      <div className="lg:hidden pb-24">
        {/* Quick Controls - First Priority */}
        <div className="sm:hidden mb-6">
          <ControlGrid onSectionClick={handleSectionClick} activeSection={activeSection} />
        </div>

        {/* Bonus Programs - Second Priority */}
        <div className="sm:hidden mb-6">
          <BonusWidget />
        </div>

        {/* Key Metrics - Compact Row */}
        <div className="sm:hidden mb-6">
          <div className="grid grid-cols-2 gap-4">
            {/* System Status */}
            <div className="bg-card/95 backdrop-blur-sm p-4 border border-border/30 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">System Status</h3>
                <div className="w-2 h-2 bg-primary animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Agents</span>
                  <span className="text-lg font-bold text-primary">
                    {statsLoading ? '...' : (stats?.totalAffiliates ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Players</span>
                  <span className="text-lg font-bold text-foreground">
                    {statsLoading ? '...' : (stats?.activePlayers ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Overview */}
            <div className="bg-card/95 backdrop-blur-sm p-4 border border-border/30 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Revenue</h3>
                <div className="w-2 h-2 bg-primary animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Balance</span>
                  <span className="text-lg font-bold text-primary">
                    {statsLoading ? '...' : `$${(stats?.platformLiquidity ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Players</span>
                  <span className="text-lg font-bold text-foreground">
                    {statsLoading ? '...' : (stats?.totalPlayers ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Status & Revenue */}
        <div className="sm:hidden mb-6">
          <div className="grid grid-cols-2 gap-4">
            <TransactionStatusWidget />
            <RevenueWidget />
          </div>
        </div>

        {/* Tablet Layout - Keep existing for tablets */}
        <div className="hidden sm:block space-y-4">
          {/* Top Stats Row */}
          <div className="grid grid-cols-2 gap-4">
            <AffiliateNetworkWidget />
            <div className="bg-card p-4 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Live</h3>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-primary">
                  {statsLoading ? '...' : (stats?.activePlayers ?? 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Active Players</div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                  <div>
                    <div className="text-sm font-semibold">
                      {statsLoading ? '...' : (stats?.totalPlayers ?? 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Total</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">
                      {statsLoading ? '...' : (stats?.activeGames ?? 0)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Games</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Controls */}
          <div className="bg-card p-4 border border-border shadow-sm">
            <div className="relative">
              <svg
                className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-6 bg-transparent text-foreground placeholder-muted-foreground focus:outline-none text-sm font-medium"
              />
            </div>
          </div>

          <ControlGrid onSectionClick={handleSectionClick} activeSection={activeSection} />
          <div className="grid grid-cols-2 gap-4">
            <TransactionStatusWidget />
            <RevenueWidget />
          </div>
          <BonusWidget />
        </div>
      </div>

      {/* Desktop: Advanced 3-Column Grid Layout */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-4 xl:gap-6">
        {/* Left Sidebar - Quick Access & Controls */}
        <div className="lg:col-span-3 space-y-4 xl:space-y-5">
          {/* Global Search - Enhanced */}
          <div className="bg-card p-3 xl:p-4 border border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="relative">
              <svg
                className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search anything..."
                className="w-full pl-6 bg-transparent text-foreground placeholder-muted-foreground focus:outline-none text-sm font-medium"
              />
            </div>
          </div>

          <ControlGrid onSectionClick={handleSectionClick} activeSection={activeSection} />
          <BonusWidget />
        </div>

        {/* Main Content Area - Optimized for Laptop+ */}
        <div className="lg:col-span-9 space-y-4 xl:space-y-5">
          {/* System Health & Live Players - Desktop Version */}
          <div className="grid grid-cols-2 gap-4 xl:gap-5">
            <AffiliateNetworkWidget />
            
            {/* Live Players - Full Desktop Version */}
            <LivePlayersWidget stats={stats} statsLoading={statsLoading} />
          </div>

          <div className="grid grid-cols-2 gap-4 xl:gap-5">
            <TransactionStatusWidget />
            <RevenueWidget />
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

