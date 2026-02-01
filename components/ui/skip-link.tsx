'use client'

import { cn } from '@/lib/utils'

interface SkipLinkProps {
  href?: string
  className?: string
  children?: React.ReactNode
}

/**
 * Skip link for keyboard navigation
 * Allows users to skip directly to main content
 * Hidden until focused via keyboard
 */
export function SkipLink({
  href = '#main-content',
  className,
  children = 'Skip to main content',
}: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50',
        'focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground',
        'focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'transition-all',
        className
      )}
    >
      {children}
    </a>
  )
}

/**
 * Wrapper to mark the main content area
 * Use with SkipLink for proper navigation
 */
export function MainContent({
  id = 'main-content',
  className,
  children,
}: {
  id?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <main id={id} tabIndex={-1} className={cn('outline-none', className)}>
      {children}
    </main>
  )
}
