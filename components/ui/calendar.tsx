import React from 'react'

interface CalendarProps extends React.HTMLAttributes<HTMLDivElement> {
  onSelect?: (date: Date | undefined) => void
  selected?: Date
}

// Placeholder Calendar component
export function Calendar({ onSelect, selected, ...props }: CalendarProps) {
  return (
    <div className="p-4 border rounded-md" {...props}>
      <p className="text-muted-foreground">Calendar component placeholder</p>
      {selected && <p className="text-sm mt-2">Selected: {selected.toDateString()}</p>}
    </div>
  )
}