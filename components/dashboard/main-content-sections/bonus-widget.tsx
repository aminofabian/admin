'use client';

import { useState } from 'react';

interface BonusConfig {
  balanceTopup: Array<{ method: string; type: string; value: number }>;
  gameRecharge: Array<{ name: string; type: string; value: number }>;
  balanceTransfer: { type: string; value: number };
  signup: {
    signupAmount: number;
    firstDepositBonus: number;
    minDeposit: number;
  };
}

type EditSection = 'topup' | 'recharge' | 'transfer' | 'signup' | null;

const BONUS_CONFIG: BonusConfig = {
  balanceTopup: [
    { method: 'Litecoin', type: 'percentage', value: 20 },
    { method: 'Bitcoin', type: 'percentage', value: 20 },
  ],
  gameRecharge: [
    { name: 'Juwa', type: 'flat', value: 50 },
    { name: 'Game Vault', type: 'flat', value: 50 },
    { name: 'E-Game', type: 'flat', value: 50 },
    { name: 'Cash Frenzy', type: 'flat', value: 50 },
  ],
  balanceTransfer: { type: 'flat', value: 1 },
  signup: {
    signupAmount: 5.0,
    firstDepositBonus: 5,
    minDeposit: 5,
  },
};

const BONUS_CATEGORIES = [
  {
    id: 'topup',
    label: 'Top-up Bonus',
    shortLabel: 'Top-up',
    value: '20%',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    gradient: 'from-primary/15 to-primary/5',
    iconColor: 'text-primary',
    badgeColor: 'bg-primary/10 text-primary',
  },
  {
    id: 'recharge',
    label: 'Game Recharge',
    shortLabel: 'Recharge',
    value: 'Up to 50%',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    gradient: 'from-primary/10 to-primary/5',
    iconColor: 'text-primary/80',
    badgeColor: 'bg-primary/8 text-primary',
  },
  {
    id: 'transfer',
    label: 'Balance Transfer',
    shortLabel: 'Transfer',
    value: '1%',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    gradient: 'from-primary/8 to-muted/10',
    iconColor: 'text-primary/70',
    badgeColor: 'bg-muted/50 text-foreground',
  },
  {
    id: 'signup',
    label: 'Welcome Bonus',
    shortLabel: 'Signup',
    value: 'KES 5',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    ),
    gradient: 'from-primary/12 to-primary/5',
    iconColor: 'text-primary',
    badgeColor: 'bg-primary/10 text-primary',
  },
];

export function BonusWidget() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<EditSection>(null);
  const [bonusConfig, setBonusConfig] = useState(BONUS_CONFIG);
  
  const totalBonuses = 4;
  const activeBonuses = 
    bonusConfig.balanceTopup.length + 
    bonusConfig.gameRecharge.filter(g => g.value > 0).length;

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const openEditDrawer = (section: EditSection) => {
    setEditingSection(section);
    setEditDrawerOpen(true);
  };

  const closeEditDrawer = () => {
    setEditDrawerOpen(false);
    setTimeout(() => setEditingSection(null), 300);
  };

  const handleSaveChanges = () => {
    closeEditDrawer();
  };

  return (
    <>
      <div className="bg-card p-5 border border-border shadow-md">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 flex items-center justify-center rounded">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Bonus Programs</h3>
              <p className="text-xs text-muted-foreground">{totalBonuses} active offers</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-border/50 rounded">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            <span className="text-xs text-primary font-semibold">Live</span>
          </div>
        </div>

      <div className="text-center mb-5 pb-5 border-b border-border/50">
        <div className="relative w-24 h-24 mx-auto mb-3">
          <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full" />
          <svg className="relative w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              className="text-muted/50"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="url(#gradient)"
              strokeWidth="6"
              fill="none"
              strokeDasharray={`${(activeBonuses / (activeBonuses + 4)) * 251.2} 251.2`}
              strokeLinecap="square"
              className="transition-all duration-500"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-foreground">{totalBonuses}</span>
            <span className="text-xs text-muted-foreground font-medium">Programs</span>
          </div>
        </div>
      </div>

      {/* Bonus Categories Grid */}
      <div className="space-y-2.5">
        {BONUS_CATEGORIES.map((category) => (
          <div 
            key={category.id}
            className="group border border-border/50 overflow-hidden transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
          >
            <div
              className="w-full p-3.5 bg-gradient-to-br from-secondary/50 to-accent/30 hover:from-secondary hover:to-accent transition-all duration-200 flex items-center justify-between cursor-pointer"
            >
              <div 
                className="flex items-center gap-3 flex-1"
                onClick={() => toggleSection(category.id)}
              >
                <div className={`w-10 h-10 bg-gradient-to-br ${category.gradient} flex items-center justify-center shadow-sm`}>
                  <div className={category.iconColor}>
                    {category.icon}
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">{category.shortLabel}</p>
                  <p className="text-xs text-muted-foreground">{category.label}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 text-xs font-bold ${category.badgeColor}`}>
                  {category.value}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditDrawer(category.id as EditSection);
                  }}
                  className="p-1.5 hover:bg-primary/10 transition-colors group/edit"
                  title="Edit bonus"
                >
                  <svg className="w-4 h-4 text-muted-foreground group-hover/edit:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <div 
                  className="cursor-pointer"
                  onClick={() => toggleSection(category.id)}
                >
                  <svg 
                    className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${expandedSection === category.id ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Expanded Content */}
            {expandedSection === category.id && (
              <div className="px-4 py-3 bg-card/50 backdrop-blur-sm border-t border-border/50">
                {category.id === 'topup' && (
                  <div className="space-y-2.5">
                    <p className="text-xs text-muted-foreground mb-3">Bonus when topping up via crypto:</p>
                    {bonusConfig.balanceTopup.map((bonus, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-secondary/50">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-500/10 flex items-center justify-center">
                            <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="text-sm text-foreground font-medium">{bonus.method}</span>
                        </div>
                        <span className="font-bold text-blue-500 text-sm">+{bonus.value}%</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {category.id === 'recharge' && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    <p className="text-xs text-muted-foreground mb-3">Bonus when recharging game wallets:</p>
                    {bonusConfig.gameRecharge.map((game, idx) => (
                      <div 
                        key={idx} 
                        className={`flex justify-between items-center p-2 ${game.value > 0 ? 'bg-purple-500/5' : 'bg-secondary/30'}`}
                      >
                        <span className="text-xs text-foreground">{game.name}</span>
                        <span className={`text-xs font-bold ${game.value > 0 ? 'text-purple-500' : 'text-muted-foreground'}`}>
                          {game.value > 0 ? `+${game.value}%` : 'No bonus'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {category.id === 'transfer' && (
                  <div className="p-3 bg-orange-500/5 border border-orange-500/10">
                    <p className="text-sm text-foreground mb-2">
                      <span className="font-bold text-orange-500">{bonusConfig.balanceTransfer.value}% bonus</span> on winnings transfer
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Earn extra rewards when moving funds from winning balance to main balance
                    </p>
                  </div>
                )}
                
                {category.id === 'signup' && (
                  <div className="space-y-2.5">
                    <div className="p-3 bg-green-500/5 border border-green-500/10">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-muted-foreground">Welcome Bonus</span>
                        <span className="font-bold text-green-500 text-sm">KES {bonusConfig.signup.signupAmount}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Instant credit on registration</p>
                    </div>
                    <div className="p-3 bg-green-500/5 border border-green-500/10">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-muted-foreground">First Deposit Bonus</span>
                        <span className="font-bold text-green-500 text-sm">+{bonusConfig.signup.firstDepositBonus}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Min. deposit: KES {bonusConfig.signup.minDeposit}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-primary animate-pulse" />
            <p className="text-xs text-muted-foreground">Updated 2 min ago</p>
          </div>
          <button className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
            View Details →
          </button>
        </div>
      </div>

      {/* Edit Drawer */}
      {editDrawerOpen && (
        <>          
          {/* Drawer */}
          <div className={`fixed top-16 right-0 h-[calc(100vh-4rem)] w-full sm:w-[600px] lg:w-[550px] xl:w-[650px] bg-background border-l border-border shadow-xl z-50 transform transition-transform duration-300 ${editDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Drawer Header */}
            <div className="p-6 border-b border-border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 bg-gradient-to-br ${BONUS_CATEGORIES.find(c => c.id === editingSection)?.gradient} flex items-center justify-center shadow-sm`}>
                    <div className={BONUS_CATEGORIES.find(c => c.id === editingSection)?.iconColor}>
                      {BONUS_CATEGORIES.find(c => c.id === editingSection)?.icon}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground uppercase tracking-wide">Edit Bonus</h3>
                    <p className="text-sm text-muted-foreground">{BONUS_CATEGORIES.find(c => c.id === editingSection)?.label}</p>
                  </div>
                </div>
                <button
                  onClick={closeEditDrawer}
                  className="p-2 hover:bg-secondary transition-colors group"
                  aria-label="Close drawer"
                >
                  <svg className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="p-6 overflow-y-auto h-[calc(100vh-14rem)]">
              {editingSection === 'topup' && (
                <div className="space-y-5">
                  <div className="p-5 bg-card border border-border shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-blue-500/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">Payment Methods</h4>
                    </div>
                    <div className="space-y-4">
                      {bonusConfig.balanceTopup.map((bonus, idx) => (
                        <div key={idx} className="p-4 bg-secondary/50 border border-border">
                          <label className="block text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">
                            {bonus.method} Bonus
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={bonus.value}
                              onChange={(e) => {
                                const newConfig = { ...bonusConfig };
                                newConfig.balanceTopup[idx].value = Number(e.target.value);
                                setBonusConfig(newConfig);
                              }}
                              className="w-full px-4 py-3 bg-background border border-border text-foreground font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                              placeholder="0"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 bg-blue-500/5 border border-blue-500/20">
                    <p className="text-xs text-muted-foreground">
                      💡 These bonuses are applied when users top up their balance using cryptocurrency payment methods.
                    </p>
                  </div>
                </div>
              )}

              {editingSection === 'recharge' && (
                <div className="space-y-5">
                  <div className="p-5 bg-card border border-border shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-purple-500/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">Game Bonuses</h4>
                    </div>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                      {bonusConfig.gameRecharge.map((game, idx) => (
                        <div key={idx} className="p-4 bg-secondary/50 border border-border hover:border-primary/30 transition-colors">
                          <label className="block text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">
                            {game.name}
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={game.value}
                              onChange={(e) => {
                                const newConfig = { ...bonusConfig };
                                newConfig.gameRecharge[idx].value = Number(e.target.value);
                                setBonusConfig(newConfig);
                              }}
                              className="w-full px-4 py-3 bg-background border border-border text-foreground font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                              placeholder="0"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 bg-purple-500/5 border border-purple-500/20">
                    <p className="text-xs text-muted-foreground">
                      💡 These bonuses are applied when users recharge funds into specific game wallets.
                    </p>
                  </div>
                </div>
              )}

              {editingSection === 'transfer' && (
                <div className="space-y-5">
                  <div className="p-5 bg-card border border-border shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-orange-500/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">Transfer Bonus</h4>
                    </div>
                    <div className="p-4 bg-secondary/50 border border-border">
                      <label className="block text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">
                        Bonus Percentage
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={bonusConfig.balanceTransfer.value}
                          onChange={(e) => {
                            setBonusConfig({
                              ...bonusConfig,
                              balanceTransfer: {
                                ...bonusConfig.balanceTransfer,
                                value: Number(e.target.value),
                              },
                            });
                          }}
                          className="w-full px-4 py-3 bg-background border border-border text-foreground font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                          placeholder="0"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">%</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-orange-500/5 border border-orange-500/20">
                    <p className="text-xs text-muted-foreground">
                      💡 This bonus is applied when users transfer funds from their winning balance to main balance.
                    </p>
                  </div>
                </div>
              )}

              {editingSection === 'signup' && (
                <div className="space-y-5">
                  <div className="p-5 bg-card border border-border shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-green-500/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">Signup Rewards</h4>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-secondary/50 border border-border">
                        <label className="block text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">
                          Welcome Bonus
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">KES</span>
                          <input
                            type="number"
                            value={bonusConfig.signup.signupAmount}
                            onChange={(e) => {
                              setBonusConfig({
                                ...bonusConfig,
                                signup: {
                                  ...bonusConfig.signup,
                                  signupAmount: Number(e.target.value),
                                },
                              });
                            }}
                            className="w-full pl-14 pr-4 py-3 bg-background border border-border text-foreground font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            placeholder="0"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">💰 Instant credit on registration</p>
                      </div>

                      <div className="p-4 bg-secondary/50 border border-border">
                        <label className="block text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">
                          First Deposit Bonus
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={bonusConfig.signup.firstDepositBonus}
                            onChange={(e) => {
                              setBonusConfig({
                                ...bonusConfig,
                                signup: {
                                  ...bonusConfig.signup,
                                  firstDepositBonus: Number(e.target.value),
                                },
                              });
                            }}
                            className="w-full px-4 py-3 bg-background border border-border text-foreground font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            placeholder="0"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">%</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">🎁 Applied on first deposit</p>
                      </div>

                      <div className="p-4 bg-secondary/50 border border-border">
                        <label className="block text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">
                          Minimum Deposit
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">KES</span>
                          <input
                            type="number"
                            value={bonusConfig.signup.minDeposit}
                            onChange={(e) => {
                              setBonusConfig({
                                ...bonusConfig,
                                signup: {
                                  ...bonusConfig.signup,
                                  minDeposit: Number(e.target.value),
                                },
                              });
                            }}
                            className="w-full pl-14 pr-4 py-3 bg-background border border-border text-foreground font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            placeholder="0"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">🎯 Required for first deposit bonus</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-green-500/5 border border-green-500/20">
                    <p className="text-xs text-muted-foreground">
                      💡 New users receive the welcome bonus instantly upon registration, plus a percentage bonus on their first qualifying deposit.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-border bg-card shadow-lg">
              <div className="flex gap-3">
                <button
                  onClick={closeEditDrawer}
                  className="flex-1 px-5 py-3 border-2 border-border text-foreground hover:bg-secondary hover:border-muted-foreground transition-all font-semibold text-sm uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveChanges}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:from-primary/90 hover:to-primary/80 transition-all font-bold text-sm shadow-lg shadow-primary/30 uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
