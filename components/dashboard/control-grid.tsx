'use client';

interface ControlItem {
  icon: string;
  label: string;
  active?: boolean;
}

const controlItems: ControlItem[] = [
  { icon: '🏢', label: 'Companies' },
  { icon: '👥', label: 'Users' },
  { icon: '🎮', label: 'Games' },
  { icon: '💰', label: 'Transactions' },
  { icon: '🎁', label: 'Bonuses' },
  { icon: '🖼️', label: 'Banners' },
  { icon: '📊', label: 'Analytics' },
  { icon: '🔗', label: 'Affiliates' },
  { icon: '⚙️', label: 'Settings' },
  { icon: '📈', label: 'Reports' },
  { icon: '🔔', label: 'Notifications' },
  { icon: '🛠️', label: 'Tools' },
];

export function ControlGrid() {
  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Quick Controls</h3>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2 lg:gap-3">
        {controlItems.map((item, index) => (
          <button
            key={index}
            className="flex flex-col items-center justify-center p-2 lg:p-3 rounded-lg bg-accent hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <span className="text-sm lg:text-lg mb-1">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
