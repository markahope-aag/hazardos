import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** ID of the element that describes this input (for errors, hints) */
  'aria-describedby'?: string
  /** Whether the input is in an invalid state */
  'aria-invalid'?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, 'aria-invalid': ariaInvalid, ...props }, ref) => {
    return (
      <input
        type={type}
        aria-invalid={ariaInvalid}
        className={cn(
          "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          ariaInvalid && "border-red-500 focus-visible:ring-red-500",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }