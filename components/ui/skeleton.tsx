import { cn } from '@/lib/utils/formatters';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circular' | 'text' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

export function Skeleton({
  className,
  variant = 'default',
  width,
  height,
  animate = true,
  ...props
}: SkeletonProps) {
  const baseClasses = 'bg-muted';
  const animationClasses = animate ? 'animate-pulse' : '';
  
  const variantClasses = {
    default: 'rounded-md',
    circular: 'rounded-full',
    text: 'rounded h-4',
    rectangular: 'rounded-none',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn(
        baseClasses,
        animationClasses,
        variantClasses[variant],
        className
      )}
      style={style}
      {...props}
    />
  );
}

// Composite skeleton components for common patterns
export function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-3 p-4', className)} {...props}>
      <Skeleton className="h-12 w-12" variant="circular" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

export function SkeletonAvatar({ size = 'default', className }: { size?: 'sm' | 'default' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    default: 'h-10 w-10',
    lg: 'h-16 w-16',
  };

  return (
    <Skeleton
      variant="circular"
      className={cn(sizeClasses[size], className)}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
}

