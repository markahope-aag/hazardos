import React from 'react'

// Placeholder Calendar component
export function Calendar({ onSelect, selected, ...props }: { 
  onSelect?: (date: Date | undefined) => void
  selected?: Date
  [key: string]: any 
}) {
  return (
    <div className="p-4 border rounded-md" {...props}>
      <p className="text-muted-foreground">Calendar component placeholder</p>
      {selected && <p className="text-sm mt-2">Selected: {selected.toDateString()}</p>}
    </div>
  )
}