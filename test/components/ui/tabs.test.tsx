import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

describe('Tabs', () => {
  it('should render tabs with triggers and content', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )

    expect(screen.getByText('Tab 1')).toBeInTheDocument()
    expect(screen.getByText('Tab 2')).toBeInTheDocument()
    expect(screen.getByText('Content 1')).toBeInTheDocument()
  })

  it('should render TabsList with correct styling', () => {
    render(
      <TabsList data-testid="tabs-list">
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
      </TabsList>
    )

    const tabsList = screen.getByTestId('tabs-list')
    expect(tabsList).toHaveClass(
      'inline-flex',
      'h-9',
      'items-center',
      'justify-center',
      'rounded-lg',
      'bg-muted',
      'p-1',
      'text-muted-foreground'
    )
  })

  it('should render TabsTrigger with correct styling', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1" data-testid="tab-trigger">Tab 1</TabsTrigger>
        </TabsList>
      </Tabs>
    )

    const trigger = screen.getByTestId('tab-trigger')
    expect(trigger).toHaveClass(
      'inline-flex',
      'items-center',
      'justify-center',
      'whitespace-nowrap',
      'rounded-md',
      'px-3',
      'py-1',
      'text-sm',
      'font-medium',
      'ring-offset-background',
      'transition-all'
    )
  })

  it('should render TabsContent with correct styling', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsContent value="tab1" data-testid="tab-content">Content 1</TabsContent>
      </Tabs>
    )

    const content = screen.getByTestId('tab-content')
    expect(content).toHaveClass(
      'mt-2',
      'ring-offset-background',
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
      'focus-visible:ring-offset-2'
    )
  })

  it('should handle tab switching', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )

    // Initially, tab1 content should be visible
    expect(screen.getByText('Content 1')).toBeInTheDocument()

    // Click on tab2
    fireEvent.click(screen.getByText('Tab 2'))

    // Now tab2 content should be visible
    expect(screen.getByText('Content 2')).toBeInTheDocument()
  })

  it('should apply custom className to TabsList', () => {
    render(
      <TabsList className="custom-tabs-list" data-testid="custom-tabs-list">
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
      </TabsList>
    )

    const tabsList = screen.getByTestId('custom-tabs-list')
    expect(tabsList).toHaveClass('custom-tabs-list')
  })

  it('should apply custom className to TabsTrigger', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1" className="custom-trigger" data-testid="custom-trigger">
            Tab 1
          </TabsTrigger>
        </TabsList>
      </Tabs>
    )

    const trigger = screen.getByTestId('custom-trigger')
    expect(trigger).toHaveClass('custom-trigger')
  })

  it('should apply custom className to TabsContent', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsContent value="tab1" className="custom-content" data-testid="custom-content">
          Content 1
        </TabsContent>
      </Tabs>
    )

    const content = screen.getByTestId('custom-content')
    expect(content).toHaveClass('custom-content')
  })

  it('should have correct display names', () => {
    expect(TabsList.displayName).toBe('TabsPrimitive.List')
    expect(TabsTrigger.displayName).toBe('TabsPrimitive.Trigger')
    expect(TabsContent.displayName).toBe('TabsPrimitive.Content')
  })

  it('should forward refs correctly', () => {
    const listRef = vi.fn()
    const triggerRef = vi.fn()
    const contentRef = vi.fn()

    render(
      <Tabs defaultValue="tab1">
        <TabsList ref={listRef}>
          <TabsTrigger value="tab1" ref={triggerRef}>Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1" ref={contentRef}>Content 1</TabsContent>
      </Tabs>
    )

    expect(listRef).toHaveBeenCalled()
    expect(triggerRef).toHaveBeenCalled()
    expect(contentRef).toHaveBeenCalled()
  })

  it('should forward additional props', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList data-testid="props-list" id="tabs-list-id">
          <TabsTrigger 
            value="tab1" 
            data-testid="props-trigger" 
            id="tab-trigger-id"
          >
            Tab 1
          </TabsTrigger>
        </TabsList>
        <TabsContent 
          value="tab1" 
          data-testid="props-content" 
          id="tab-content-id"
        >
          Content 1
        </TabsContent>
      </Tabs>
    )

    expect(screen.getByTestId('props-list')).toHaveAttribute('id', 'tabs-list-id')
    expect(screen.getByTestId('props-trigger')).toHaveAttribute('id', 'tab-trigger-id')
    expect(screen.getByTestId('props-content')).toHaveAttribute('id', 'tab-content-id')
  })

  it('should handle disabled state', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2" disabled data-testid="disabled-trigger">
            Tab 2
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )

    const disabledTrigger = screen.getByTestId('disabled-trigger')
    expect(disabledTrigger).toBeDisabled()
    expect(disabledTrigger).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50')
  })

  it('should show active state styling', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1" data-testid="active-trigger">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )

    const activeTrigger = screen.getByTestId('active-trigger')
    expect(activeTrigger).toHaveClass(
      'data-[state=active]:bg-background',
      'data-[state=active]:text-foreground',
      'data-[state=active]:shadow'
    )
  })

  it('should handle controlled tabs', () => {
    const { rerender } = render(
      <Tabs value="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )

    expect(screen.getByText('Content 1')).toBeInTheDocument()

    rerender(
      <Tabs value="tab2">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )

    expect(screen.getByText('Content 2')).toBeInTheDocument()
  })

  it('should handle onValueChange callback', () => {
    const handleValueChange = vi.fn()

    render(
      <Tabs defaultValue="tab1" onValueChange={handleValueChange}>
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )

    fireEvent.click(screen.getByText('Tab 2'))
    expect(handleValueChange).toHaveBeenCalledWith('tab2')
  })

  it('should work with complex content', () => {
    render(
      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="account">
          <div>
            <h3>Account Settings</h3>
            <p>Manage your account settings here.</p>
          </div>
        </TabsContent>
        <TabsContent value="settings">
          <div>
            <h3>Application Settings</h3>
            <p>Configure your application preferences.</p>
          </div>
        </TabsContent>
      </Tabs>
    )

    expect(screen.getByText('Application Settings')).toBeInTheDocument()
    expect(screen.getByText('Configure your application preferences.')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Account'))

    expect(screen.getByText('Account Settings')).toBeInTheDocument()
    expect(screen.getByText('Manage your account settings here.')).toBeInTheDocument()
  })

  it('should support accessibility attributes', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList aria-label="Main navigation">
          <TabsTrigger value="tab1" aria-describedby="tab1-desc">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1" id="tab1-desc">
          Content for tab 1
        </TabsContent>
        <TabsContent value="tab2">Content for tab 2</TabsContent>
      </Tabs>
    )

    const tabsList = screen.getByRole('tablist')
    expect(tabsList).toHaveAttribute('aria-label', 'Main navigation')

    const tab1 = screen.getByRole('tab', { name: 'Tab 1' })
    expect(tab1).toHaveAttribute('aria-describedby', 'tab1-desc')
  })

  it('should combine custom classes with default classes', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList className="custom-list-class" data-testid="combined-list">
          <TabsTrigger 
            value="tab1" 
            className="custom-trigger-class" 
            data-testid="combined-trigger"
          >
            Tab 1
          </TabsTrigger>
        </TabsList>
        <TabsContent 
          value="tab1" 
          className="custom-content-class" 
          data-testid="combined-content"
        >
          Content 1
        </TabsContent>
      </Tabs>
    )

    const list = screen.getByTestId('combined-list')
    const trigger = screen.getByTestId('combined-trigger')
    const content = screen.getByTestId('combined-content')

    expect(list).toHaveClass('custom-list-class', 'inline-flex', 'h-9')
    expect(trigger).toHaveClass('custom-trigger-class', 'inline-flex', 'items-center')
    expect(content).toHaveClass('custom-content-class', 'mt-2', 'ring-offset-background')
  })
})