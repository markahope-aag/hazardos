import React from 'react'

// Placeholder Sheet component
export function Sheet({ children, defaultOpen, onOpenChange, ...props }: { children: React.ReactNode; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; [key: string]: any }) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen || false)
  
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    onOpenChange?.(open)
  }
  
  return (
    <div {...props}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          if (child.type === SheetTrigger) {
            return React.cloneElement(child, {
              onClick: () => handleOpenChange(true),
              ...child.props
            })
          }
          if (child.type === SheetContent && isOpen) {
            return React.cloneElement(child, {
              onClose: () => handleOpenChange(false),
              ...child.props
            })
          }
          if (child.type === SheetContent && !isOpen) {
            return null
          }
        }
        return child
      })}
    </div>
  )
}

export function SheetContent({ children, onClose, className, ...props }: { children: React.ReactNode; onClose?: () => void; className?: string; [key: string]: any }) {
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
        if (React.isValidElement(child)) {
          if (child.type === SheetClose) {
            return React.cloneElement(child, {
              onClick: onClose,
              ...child.props
            })
          }
          if (child.type === SheetTitle) {
            return React.cloneElement(child, {
              id: titleId,
              ...child.props
            })
          }
          if (child.type === SheetDescription) {
            return React.cloneElement(child, {
              id: descriptionId,
              ...child.props
            })
          }
          // Handle nested SheetHeader containing SheetTitle/SheetDescription
          if (child.type === SheetHeader) {
            return React.cloneElement(child, {
              children: React.Children.map(child.props.children, headerChild => {
                if (React.isValidElement(headerChild)) {
                  if (headerChild.type === SheetTitle) {
                    return React.cloneElement(headerChild, {
                      id: titleId,
                      ...headerChild.props
                    })
                  }
                  if (headerChild.type === SheetDescription) {
                    return React.cloneElement(headerChild, {
                      id: descriptionId,
                      ...headerChild.props
                    })
                  }
                }
                return headerChild
              })
            })
          }
          // Handle nested SheetFooter containing SheetClose
          if (child.type === SheetFooter) {
            return React.cloneElement(child, {
              children: React.Children.map(child.props.children, footerChild => {
                if (React.isValidElement(footerChild) && footerChild.type === SheetClose) {
                  return React.cloneElement(footerChild, {
                    onClick: onClose,
                    ...footerChild.props
                  })
                }
                return footerChild
              })
            })
          }
        }
        return child
      })}
    </div>
  )
}

export function SheetHeader({ children, ...props }: { children: React.ReactNode; [key: string]: any }) {
  return <div {...props}>{children}</div>
}

export function SheetTitle({ children, ...props }: { children: React.ReactNode; [key: string]: any }) {
  return <h2 {...props}>{children}</h2>
}

export function SheetDescription({ children, ...props }: { children: React.ReactNode; [key: string]: any }) {
  return <p {...props}>{children}</p>
}

export function SheetTrigger({ children, asChild, ...props }: { children: React.ReactNode; asChild?: boolean; [key: string]: any }) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { ...props, ...children.props })
  }
  return <button {...props}>{children}</button>
}

export function SheetFooter({ children, ...props }: { children: React.ReactNode; [key: string]: any }) {
  return <div {...props}>{children}</div>
}

export function SheetClose({ children, asChild, ...props }: { children: React.ReactNode; asChild?: boolean; [key: string]: any }) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { ...props, ...children.props })
  }
  return <button {...props}>{children}</button>
}