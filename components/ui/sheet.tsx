import React from 'react'

type SheetProps = {
  children: React.ReactNode
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  [key: string]: unknown
}

type SheetContentProps = {
  children: React.ReactNode
  onClose?: () => void
  className?: string
  [key: string]: unknown
}

type SheetChildProps = {
  children: React.ReactNode
  [key: string]: unknown
}

type SheetTriggerProps = {
  children: React.ReactNode
  asChild?: boolean
  [key: string]: unknown
}

type SheetCloseProps = {
  children: React.ReactNode
  asChild?: boolean
  [key: string]: unknown
}

export function Sheet({ children, defaultOpen, onOpenChange, ...props }: SheetProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen || false)

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    onOpenChange?.(open)
  }

  return (
    <div {...props}>
      {React.Children.map(children, child => {
        if (!React.isValidElement(child)) return child

        const childProps = child.props as Record<string, unknown>

        if (child.type === SheetTrigger) {
          return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
            onClick: () => handleOpenChange(true),
            ...childProps
          })
        }
        if (child.type === SheetContent && isOpen) {
          return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
            onClose: () => handleOpenChange(false),
            ...childProps
          })
        }
        if (child.type === SheetContent && !isOpen) {
          return null
        }
        return child
      })}
    </div>
  )
}

export function SheetContent({ children, onClose, className, ...props }: SheetContentProps) {
  const titleId = React.useId()
  const descriptionId = React.useId()

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={className}
      {...props}
    >
      {React.Children.map(children, child => {
        if (!React.isValidElement(child)) return child

        const childProps = child.props as Record<string, unknown>

        if (child.type === SheetClose) {
          return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
            onClick: onClose,
            ...childProps
          })
        }
        if (child.type === SheetTitle) {
          return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
            id: titleId,
            ...childProps
          })
        }
        if (child.type === SheetDescription) {
          return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
            id: descriptionId,
            ...childProps
          })
        }
        if (child.type === SheetHeader) {
          const headerChildren = childProps.children as React.ReactNode
          return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
            children: React.Children.map(headerChildren, headerChild => {
              if (!React.isValidElement(headerChild)) return headerChild

              const headerChildProps = headerChild.props as Record<string, unknown>

              if (headerChild.type === SheetTitle) {
                return React.cloneElement(headerChild as React.ReactElement<Record<string, unknown>>, {
                  id: titleId,
                  ...headerChildProps
                })
              }
              if (headerChild.type === SheetDescription) {
                return React.cloneElement(headerChild as React.ReactElement<Record<string, unknown>>, {
                  id: descriptionId,
                  ...headerChildProps
                })
              }
              return headerChild
            })
          })
        }
        if (child.type === SheetFooter) {
          const footerChildren = childProps.children as React.ReactNode
          return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
            children: React.Children.map(footerChildren, footerChild => {
              if (!React.isValidElement(footerChild)) return footerChild

              if (footerChild.type === SheetClose) {
                const footerChildProps = footerChild.props as Record<string, unknown>
                return React.cloneElement(footerChild as React.ReactElement<Record<string, unknown>>, {
                  onClick: onClose,
                  ...footerChildProps
                })
              }
              return footerChild
            })
          })
        }
        return child
      })}
    </div>
  )
}

export function SheetHeader({ children, ...props }: SheetChildProps) {
  return <div {...props}>{children}</div>
}

export function SheetTitle({ children, ...props }: SheetChildProps) {
  return <h2 {...props}>{children}</h2>
}

export function SheetDescription({ children, ...props }: SheetChildProps) {
  return <p {...props}>{children}</p>
}

export function SheetTrigger({ children, asChild, ...props }: SheetTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, { ...props, ...childProps })
  }
  return <button {...props}>{children}</button>
}

export function SheetFooter({ children, ...props }: SheetChildProps) {
  return <div {...props}>{children}</div>
}

export function SheetClose({ children, asChild, ...props }: SheetCloseProps) {
  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, { ...props, ...childProps })
  }
  return <button {...props}>{children}</button>
}
