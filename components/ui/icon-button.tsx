import * as React from 'react'
import { Button, ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  /** Accessible label for the button (required for screen readers) */
  label: string
  /** The icon to display */
  icon: React.ReactNode
  /** Show label visually alongside icon */
  showLabel?: boolean
}

/**
 * Accessible icon button component
 * Ensures all icon-only buttons have proper ARIA labels
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, icon, showLabel = false, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        aria-label={showLabel ? undefined : label}
        className={cn(showLabel ? '' : 'px-2', className)}
        {...props}
      >
        <span aria-hidden="true">{icon}</span>
        {showLabel ? (
          <span className="ml-2">{label}</span>
        ) : (
          <span className="sr-only">{label}</span>
        )}
      </Button>
    )
  }
)
IconButton.displayName = 'IconButton'
