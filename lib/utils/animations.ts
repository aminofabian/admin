// Animation variants for Framer Motion or CSS classes

export const messageAnimations = {
  // Slide in from bottom (for new messages)
  slideInBottom: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  
  // Slide in from top (for history loading)
  slideInTop: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  
  // Fade in
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
  },
  
  // Scale in (for reactions/quick actions)
  scaleIn: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { duration: 0.2, ease: 'easeOut' }
  }
};

// CSS animation classes (if not using Framer Motion)
export const cssAnimations = {
  // Add to Tailwind config or use inline
  slideInBottom: 'animate-in slide-in-from-bottom-4 fade-in duration-300',
  slideInTop: 'animate-in slide-in-from-top-4 fade-in duration-300',
  fadeIn: 'animate-in fade-in duration-200',
  scaleIn: 'animate-in zoom-in-95 fade-in duration-200',
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  bounce: 'animate-bounce',
};

// Scroll animation helper
export const smoothScrollTo = (
  element: HTMLElement,
  options: {
    top?: number;
    behavior?: ScrollBehavior;
    onComplete?: () => void;
  }
) => {
  const { top, behavior = 'smooth', onComplete } = options;
  
  element.scrollTo({
    top: top ?? element.scrollHeight,
    behavior,
  });
  
  // Call onComplete after animation
  if (onComplete && behavior === 'smooth') {
    setTimeout(onComplete, 500); // Smooth scroll duration
  } else if (onComplete) {
    onComplete();
  }
};
