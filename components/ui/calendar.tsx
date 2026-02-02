import React from 'react'

interface CalendarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  mode?: 'single' | 'multiple' | 'range'
  onSelect?: (date: Date | undefined) => void
  selected?: Date
  initialFocus?: boolean
}

// Placeholder Calendar component
export function Calendar({ mode, onSelect, selected, initialFocus, ...props }: CalendarProps) {
  return (
    <div className="p-4 border rounded-md" {...props}>
      <p className="text-muted-foreground">Calendar component placeholder</p>
      {selected && <p className="text-sm mt-2">Selected: {selected.toDateString()}</p>}
    </div>
  )
}