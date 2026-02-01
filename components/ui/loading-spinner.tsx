import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
};

export function LoadingSpinner({ className, size = 'md', label = 'Loading' }: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        'animate-spin rounded-full border-primary border-t-transparent',
        sizeClasses[size],
        className
      )}
    >
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function LoadingPage({ message }: { message?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[400px] gap-4"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <LoadingSpinner size="lg" label={message || 'Loading page'} />
      {message && (
        <p className="text-muted-foreground text-sm" aria-hidden="true">{message}</p>
      )}
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="border rounded-lg p-6" role="status" aria-busy="true" aria-label="Loading content">
      <div className="animate-pulse space-y-4" aria-hidden="true">
        <div className="h-4 bg-muted rounded w-1/4" />
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded" />
          <div className="h-4 bg-muted rounded w-5/6" />
        </div>
      </div>
      <span className="sr-only">Loading content</span>
    </div>
  );
}

export function LoadingTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="border rounded-lg overflow-hidden" role="status" aria-busy="true" aria-label="Loading table data">
      <div className="bg-muted/50 p-4 border-b" aria-hidden="true">
        <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="p-4 border-b last:border-0" aria-hidden="true">
          <div className="flex items-center gap-4 animate-pulse">
            <div className="h-10 w-10 bg-muted rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
            <div className="h-8 bg-muted rounded w-20" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading table data</span>
    </div>
  );
}
