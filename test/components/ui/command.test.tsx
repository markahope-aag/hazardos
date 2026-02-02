import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from '@/components/ui/command'

// Mock cmdk
vi.mock('cmdk', () => ({
  Command: ({ children, className, ...props }: any) => (
    <div data-testid="command" className={className} {...props}>
      {children}
    </div>
  ),
}))

// Add mock components for Command primitives
vi.mock('cmdk', () => {
  const MockCommand = ({ children, className, ...props }: any) => (
    <div data-testid="command" className={className} {...props}>
      {children}
    </div>
  )
  MockCommand.Input = ({ children: _children, className, ...props }: any) => (
    <input data-testid="command-input" className={className} {...props} />
  )
  MockCommand.List = ({ children, className, ...props }: any) => (
    <div data-testid="command-list" className={className} {...props}>
      {children}
    </div>
  )
  MockCommand.Empty = ({ children, className, ...props }: any) => (
    <div data-testid="command-empty" className={className} {...props}>
      {children}
    </div>
  )
  MockCommand.Group = ({ children, className, ...props }: any) => (
    <div data-testid="command-group" className={className} {...props}>
      {children}
    </div>
  )
  MockCommand.Item = ({ children, className, ...props }: any) => (
    <div data-testid="command-item" className={className} {...props}>
      {children}
    </div>
  )
  MockCommand.Separator = ({ className, ...props }: any) => (
    <div data-testid="command-separator" className={className} {...props} />
  )

  return {
    Command: MockCommand,
  }
})

describe('Command', () => {
  it('renders Command component', () => {
    render(<Command>Content</Command>)

    expect(screen.getByTestId('command')).toBeInTheDocument()
  })

  it('applies custom className to Command', () => {
    render(<Command className="custom-class">Content</Command>)

    expect(screen.getByTestId('command')).toHaveClass('custom-class')
  })
})

describe('CommandInput', () => {
  it('renders CommandInput with search icon', () => {
    render(<CommandInput placeholder="Search..." />)

    expect(screen.getByTestId('command-input')).toBeInTheDocument()
  })

  it('accepts placeholder prop', () => {
    render(<CommandInput placeholder="Type to search" />)

    expect(screen.getByTestId('command-input')).toHaveAttribute('placeholder', 'Type to search')
  })
})

describe('CommandList', () => {
  it('renders CommandList', () => {
    render(<CommandList>Items here</CommandList>)

    expect(screen.getByTestId('command-list')).toBeInTheDocument()
  })
})

describe('CommandEmpty', () => {
  it('renders CommandEmpty', () => {
    render(<CommandEmpty>No results found</CommandEmpty>)

    expect(screen.getByTestId('command-empty')).toBeInTheDocument()
    expect(screen.getByText('No results found')).toBeInTheDocument()
  })
})

describe('CommandGroup', () => {
  it('renders CommandGroup', () => {
    render(<CommandGroup>Group content</CommandGroup>)

    expect(screen.getByTestId('command-group')).toBeInTheDocument()
  })
})

describe('CommandItem', () => {
  it('renders CommandItem', () => {
    render(<CommandItem>Item content</CommandItem>)

    expect(screen.getByTestId('command-item')).toBeInTheDocument()
    expect(screen.getByText('Item content')).toBeInTheDocument()
  })
})

describe('CommandShortcut', () => {
  it('renders CommandShortcut', () => {
    render(<CommandShortcut>⌘K</CommandShortcut>)

    expect(screen.getByText('⌘K')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<CommandShortcut className="custom-shortcut">⌘K</CommandShortcut>)

    expect(screen.getByText('⌘K')).toHaveClass('custom-shortcut')
  })
})

describe('CommandSeparator', () => {
  it('renders CommandSeparator', () => {
    render(<CommandSeparator />)

    expect(screen.getByTestId('command-separator')).toBeInTheDocument()
  })
})
