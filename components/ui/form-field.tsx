'use client'

import * as React from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

interface FormFieldProps {
  label?: React.ReactNode
  /** Adds a red asterisk and `aria-required` semantics on the control. */
  required?: boolean
  /** Optional helper text shown below the field when no error is present. */
  hint?: React.ReactNode
  /** Validation error message. When non-empty, the field shows invalid state. */
  error?: string | null | undefined
  /** Optional explicit id; if omitted, one is generated. */
  htmlFor?: string
  /**
   * The control element. Receives `id`, `aria-invalid`, `aria-describedby`,
   * and (optionally) `aria-required` injected automatically — callers don't
   * need to wire those props themselves.
   */
  children: React.ReactElement
  className?: string
  /** Render the label inline (for checkboxes etc.). Default: above the control. */
  inline?: boolean
}

/**
 * Form-field wrapper that handles label, required-asterisk, helper text,
 * error display, and the ARIA plumbing that links them to the control.
 *
 * Usage:
 *   <FormField label="Email" required error={errors.email?.message}>
 *     <Input type="email" {...register('email')} />
 *   </FormField>
 *
 * The child's existing `id` is preserved if set; otherwise a stable id is
 * generated. `aria-invalid` flips to `true` when `error` is non-empty, which
 * turns on red border styling in Input, Textarea, and SelectTrigger.
 */
export function FormField({
  label,
  required,
  hint,
  error,
  htmlFor,
  children,
  className,
  inline = false,
}: FormFieldProps) {
  const generatedId = React.useId()
  const child = React.Children.only(children) as React.ReactElement<
    Record<string, unknown>
  >
  const childProps = (child.props ?? {}) as Record<string, unknown>
  const fieldId = (childProps.id as string) || htmlFor || generatedId
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`
  const hasError = !!error

  // Compose aria-describedby: caller's existing value + hint id (if hint
  // is present) + error id (if error is present).
  const describedByParts: string[] = []
  if (typeof childProps['aria-describedby'] === 'string') {
    describedByParts.push(childProps['aria-describedby'] as string)
  }
  if (hint && !hasError) describedByParts.push(hintId)
  if (hasError) describedByParts.push(errorId)
  const ariaDescribedBy =
    describedByParts.length > 0 ? describedByParts.join(' ') : undefined

  const enhanced = React.cloneElement(child, {
    id: fieldId,
    'aria-invalid': hasError ? true : undefined,
    'aria-describedby': ariaDescribedBy,
    'aria-required': required ? true : undefined,
  })

  const labelNode = label ? (
    <Label htmlFor={fieldId} className={cn(inline && 'mb-0')}>
      {label}
      {required && (
        <span className="text-red-500 ml-0.5" aria-hidden="true">
          *
        </span>
      )}
    </Label>
  ) : null

  if (inline) {
    return (
      <div className={cn('space-y-1', className)}>
        <div className="flex items-center gap-2">
          {enhanced}
          {labelNode}
        </div>
        {!hasError && hint && (
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )}
        {hasError && (
          <p
            id={errorId}
            role="alert"
            className="text-sm text-red-600 flex items-start gap-1"
          >
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {labelNode}
      {enhanced}
      {!hasError && hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {hasError && (
        <p
          id={errorId}
          role="alert"
          className="text-sm text-red-600 flex items-start gap-1"
        >
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
