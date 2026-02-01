import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LucideIcon, Plus, Search, FileText, Users, Calendar, DollarSign } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = FileText,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
      role="status"
      aria-label={title}
    >
      <div className="p-4 bg-muted rounded-full mb-4" aria-hidden="true">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-6">{description}</p>
      {action && (
        action.href ? (
          <Button asChild>
            <Link href={action.href}>
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              {action.label}
            </Link>
          </Button>
        ) : (
          <Button onClick={action.onClick}>
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            {action.label}
          </Button>
        )
      )}
    </div>
  );
}

// Pre-configured empty states for common use cases
export function NoCustomersState() {
  return (
    <EmptyState
      icon={Users}
      title="No customers yet"
      description="Get started by adding your first customer to the system."
      action={{ label: 'Add Customer', href: '/customers/new' }}
    />
  );
}

export function NoJobsState() {
  return (
    <EmptyState
      icon={Calendar}
      title="No jobs scheduled"
      description="Create your first job to start tracking work."
      action={{ label: 'Create Job', href: '/jobs/new' }}
    />
  );
}

export function NoInvoicesState() {
  return (
    <EmptyState
      icon={DollarSign}
      title="No invoices yet"
      description="Create an invoice after completing a job."
      action={{ label: 'Create Invoice', href: '/invoices/new' }}
    />
  );
}

export function NoSearchResultsState({ query }: { query: string }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try a different search term.`}
    />
  );
}
