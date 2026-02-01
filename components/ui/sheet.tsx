import React from 'react'

// Placeholder Sheet component
export function Sheet({ children, ...props }: { children: React.ReactNode; [key: string]: any }) {
  return <div {...props}>{children}</div>
}

export function SheetContent({ children, ...props }: { children: React.ReactNode; [key: string]: any }) {
  return <div {...props}>{children}</div>
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

export function SheetTrigger({ children, ...props }: { children: React.ReactNode; [key: string]: any }) {
  return <button {...props}>{children}</button>
}