import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SkipLink, MainContent } from '@/components/ui/skip-link'

describe('SkipLink Component', () => {
  it('should render with default props', () => {
    render(<SkipLink />)

    const link = screen.getByRole('link', { name: /skip to main content/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '#main-content')
  })

  it('should render with custom href', () => {
    render(<SkipLink href="#custom-content" />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '#custom-content')
  })

  it('should render with custom children', () => {
    render(<SkipLink>Skip to navigation</SkipLink>)

    const link = screen.getByRole('link', { name: /skip to navigation/i })
    expect(link).toBeInTheDocument()
  })

  it('should have sr-only class by default', () => {
    render(<SkipLink />)

    const link = screen.getByRole('link')
    expect(link).toHaveClass('sr-only')
  })

  it('should have focus styles', () => {
    render(<SkipLink />)

    const link = screen.getByRole('link')
    expect(link).toHaveClass(
      'focus:not-sr-only',
      'focus:absolute',
      'focus:top-4',
      'focus:left-4',
      'focus:z-50',
      'focus:px-4',
      'focus:py-2',
      'focus:bg-primary',
      'focus:text-primary-foreground',
      'focus:rounded-md',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-ring',
      'focus:ring-offset-2'
    )
  })

  it('should apply custom className', () => {
    render(<SkipLink className="custom-skip-link" />)

    const link = screen.getByRole('link')
    expect(link).toHaveClass('custom-skip-link')
  })

  it('should handle complex children', () => {
    render(
      <SkipLink>
        <span>Skip to</span> <strong>main content</strong>
      </SkipLink>
    )

    const link = screen.getByRole('link')
    expect(link).toBeInTheDocument()
    expect(screen.getByText('Skip to')).toBeInTheDocument()
    expect(screen.getByText('main content')).toBeInTheDocument()
  })

  it('should be keyboard accessible', () => {
    render(<SkipLink />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '#main-content')
    // The link should be focusable via keyboard navigation
    expect(link.tabIndex).not.toBe(-1)
  })
})

describe('MainContent Component', () => {
  it('should render with default props', () => {
    render(
      <MainContent>
        <h1>Main Content</h1>
      </MainContent>
    )

    const main = screen.getByRole('main')
    expect(main).toBeInTheDocument()
    expect(main).toHaveAttribute('id', 'main-content')
    expect(main).toHaveAttribute('tabIndex', '-1')
    expect(screen.getByText('Main Content')).toBeInTheDocument()
  })

  it('should render with custom id', () => {
    render(
      <MainContent id="custom-main">
        <h1>Custom Main Content</h1>
      </MainContent>
    )

    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'custom-main')
  })

  it('should apply custom className', () => {
    render(
      <MainContent className="custom-main-class">
        <h1>Main Content</h1>
      </MainContent>
    )

    const main = screen.getByRole('main')
    expect(main).toHaveClass('outline-none', 'custom-main-class')
  })

  it('should render children correctly', () => {
    render(
      <MainContent>
        <h1>Page Title</h1>
        <p>Page content goes here</p>
        <button>Action Button</button>
      </MainContent>
    )

    expect(screen.getByText('Page Title')).toBeInTheDocument()
    expect(screen.getByText('Page content goes here')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /action button/i })).toBeInTheDocument()
  })

  it('should have proper semantic structure', () => {
    render(
      <MainContent>
        <h1>Main Content</h1>
      </MainContent>
    )

    const main = screen.getByRole('main')
    expect(main.tagName).toBe('MAIN')
    expect(main).toHaveClass('outline-none')
  })

  it('should be focusable programmatically', () => {
    render(
      <MainContent>
        <h1>Main Content</h1>
      </MainContent>
    )

    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('tabIndex', '-1')
    // tabIndex -1 means it can be focused programmatically but not via tab navigation
  })
})

describe('SkipLink and MainContent Integration', () => {
  it('should work together for keyboard navigation', () => {
    render(
      <div>
        <SkipLink />
        <nav>
          <a href="/home">Home</a>
          <a href="/about">About</a>
        </nav>
        <MainContent>
          <h1>Welcome to the site</h1>
          <p>This is the main content area.</p>
        </MainContent>
      </div>
    )

    const skipLink = screen.getByRole('link', { name: /skip to main content/i })
    const mainContent = screen.getByRole('main')

    expect(skipLink).toHaveAttribute('href', '#main-content')
    expect(mainContent).toHaveAttribute('id', 'main-content')
  })

  it('should work with custom ids', () => {
    render(
      <div>
        <SkipLink href="#custom-main" />
        <MainContent id="custom-main">
          <h1>Custom Main Content</h1>
        </MainContent>
      </div>
    )

    const skipLink = screen.getByRole('link')
    const mainContent = screen.getByRole('main')

    expect(skipLink).toHaveAttribute('href', '#custom-main')
    expect(mainContent).toHaveAttribute('id', 'custom-main')
  })

  it('should maintain accessibility standards', () => {
    render(
      <div>
        <SkipLink>Jump to content</SkipLink>
        <MainContent>
          <h1>Accessible Main Content</h1>
        </MainContent>
      </div>
    )

    const skipLink = screen.getByRole('link', { name: /jump to content/i })
    const mainContent = screen.getByRole('main')

    // Skip link should be hidden by default but focusable
    expect(skipLink).toHaveClass('sr-only')
    
    // Main content should be programmatically focusable
    expect(mainContent).toHaveAttribute('tabIndex', '-1')
    expect(mainContent).toHaveClass('outline-none')
  })
})