interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showText = false, className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-16 h-16',
  };

  const textSizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
  };

  const iconSizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-9 h-9',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Icon - Clean geometric slot machine design */}
      <div 
        className={`${sizeClasses[size]} rounded-2xl bg-[#6366f1] flex items-center justify-center shadow-md relative`}
      >
        {/* Slot Machine Icon */}
        <svg 
          className={`${iconSizeClasses[size]} text-white`}
          viewBox="0 0 24 24" 
          fill="none"
          stroke="currentColor"
        >
          {/* Slot machine frame */}
          <rect 
            x="4" 
            y="5" 
            width="16" 
            height="14" 
            rx="2" 
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Three reels (vertical lines) */}
          <line x1="8.5" y1="8" x2="8.5" y2="16" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="8" x2="12" y2="16" strokeWidth="2" strokeLinecap="round" />
          <line x1="15.5" y1="8" x2="15.5" y2="16" strokeWidth="2" strokeLinecap="round" />
          
          {/* Handle */}
          <path 
            d="M20 11 L22 11" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
          
          {/* Winner indicator - small dot on top */}
          <circle cx="12" cy="3" r="1" fill="currentColor" />
        </svg>
      </div>

      {/* Logo Text */}
      {showText && (
        <div className="flex flex-col uppercase">
          <span className={`${textSizeClasses[size]} font-bold text-gray-900 dark:text-white leading-tight tracking-tight`}>
            SLOTTHING
          </span>
          <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium leading-none mt-0.5">
            Admin Panel
          </span>
        </div>
      )}
    </div>
  );
}
