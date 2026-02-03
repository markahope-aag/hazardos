import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/ui/card'

describe('Card', () => {
  it('should render card with content', () => {
    render(
      <Card data-testid="test-card">
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>Card Content</CardContent>
        <CardFooter>Card Footer</CardFooter>
      </Card>
    )

    expect(screen.getByTestId('test-card')).toBeInTheDocument()
    expect(screen.getByText('Card Title')).toBeInTheDocument()
    expect(screen.getByText('Card Description')).toBeInTheDocument()
    expect(screen.getByText('Card Content')).toBeInTheDocument()
    expect(screen.getByText('Card Footer')).toBeInTheDocument()
  })

  it('should render Card with correct styling', () => {
    render(<Card data-testid="styled-card">Card Content</Card>)
    
    const card = screen.getByTestId('styled-card')
    expect(card).toHaveClass(
      'rounded-lg',
      'border',
      'border-gray-200',
      'bg-white',
      'text-gray-900',
      'shadow-sm'
    )
  })

  it('should render CardHeader with correct styling', () => {
    render(<CardHeader data-testid="card-header">Header Content</CardHeader>)
    
    const header = screen.getByTestId('card-header')
    expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6')
  })

  it('should render CardTitle with correct styling', () => {
    render(<CardTitle data-testid="card-title">Title Text</CardTitle>)
    
    const title = screen.getByTestId('card-title')
    expect(title).toHaveClass(
      'text-2xl',
      'font-semibold',
      'leading-none',
      'tracking-tight'
    )
    expect(title.tagName).toBe('H3')
  })

  it('should render CardDescription with correct styling', () => {
    render(<CardDescription data-testid="card-description">Description Text</CardDescription>)
    
    const description = screen.getByTestId('card-description')
    expect(description).toHaveClass('text-sm', 'text-gray-600')
    expect(description.tagName).toBe('P')
  })

  it('should render CardContent with correct styling', () => {
    render(<CardContent data-testid="card-content">Content Text</CardContent>)
    
    const content = screen.getByTestId('card-content')
    expect(content).toHaveClass('p-6', 'pt-0')
  })

  it('should render CardFooter with correct styling', () => {
    render(<CardFooter data-testid="card-footer">Footer Content</CardFooter>)
    
    const footer = screen.getByTestId('card-footer')
    expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0')
  })

  it('should apply custom className to all components', () => {
    render(
      <Card className="custom-card-class" data-testid="custom-card">
        <CardHeader className="custom-header-class" data-testid="custom-header">
          <CardTitle className="custom-title-class" data-testid="custom-title">Title</CardTitle>
          <CardDescription className="custom-description-class" data-testid="custom-description">Description</CardDescription>
        </CardHeader>
        <CardContent className="custom-content-class" data-testid="custom-content">Content</CardContent>
        <CardFooter className="custom-footer-class" data-testid="custom-footer">Footer</CardFooter>
      </Card>
    )

    expect(screen.getByTestId('custom-card')).toHaveClass('custom-card-class')
    expect(screen.getByTestId('custom-header')).toHaveClass('custom-header-class')
    expect(screen.getByTestId('custom-title')).toHaveClass('custom-title-class')
    expect(screen.getByTestId('custom-description')).toHaveClass('custom-description-class')
    expect(screen.getByTestId('custom-content')).toHaveClass('custom-content-class')
    expect(screen.getByTestId('custom-footer')).toHaveClass('custom-footer-class')
  })

  it('should forward refs correctly', () => {
    const cardRef = vi.fn()
    const headerRef = vi.fn()
    const titleRef = vi.fn()
    const descriptionRef = vi.fn()
    const contentRef = vi.fn()
    const footerRef = vi.fn()

    render(
      <Card ref={cardRef}>
        <CardHeader ref={headerRef}>
          <CardTitle ref={titleRef}>Title</CardTitle>
          <CardDescription ref={descriptionRef}>Description</CardDescription>
        </CardHeader>
        <CardContent ref={contentRef}>Content</CardContent>
        <CardFooter ref={footerRef}>Footer</CardFooter>
      </Card>
    )

    expect(cardRef).toHaveBeenCalled()
    expect(headerRef).toHaveBeenCalled()
    expect(titleRef).toHaveBeenCalled()
    expect(descriptionRef).toHaveBeenCalled()
    expect(contentRef).toHaveBeenCalled()
    expect(footerRef).toHaveBeenCalled()
  })

  it('should have correct display names', () => {
    expect(Card.displayName).toBe('Card')
    expect(CardHeader.displayName).toBe('CardHeader')
    expect(CardTitle.displayName).toBe('CardTitle')
    expect(CardDescription.displayName).toBe('CardDescription')
    expect(CardContent.displayName).toBe('CardContent')
    expect(CardFooter.displayName).toBe('CardFooter')
  })

  it('should forward additional props', () => {
    render(
      <Card data-testid="props-card" id="card-id" role="article">
        <CardHeader data-testid="props-header" id="header-id">
          <CardTitle data-testid="props-title" id="title-id">Title</CardTitle>
          <CardDescription data-testid="props-description" id="description-id">Description</CardDescription>
        </CardHeader>
        <CardContent data-testid="props-content" id="content-id">Content</CardContent>
        <CardFooter data-testid="props-footer" id="footer-id">Footer</CardFooter>
      </Card>
    )

    expect(screen.getByTestId('props-card')).toHaveAttribute('id', 'card-id')
    expect(screen.getByTestId('props-card')).toHaveAttribute('role', 'article')
    expect(screen.getByTestId('props-header')).toHaveAttribute('id', 'header-id')
    expect(screen.getByTestId('props-title')).toHaveAttribute('id', 'title-id')
    expect(screen.getByTestId('props-description')).toHaveAttribute('id', 'description-id')
    expect(screen.getByTestId('props-content')).toHaveAttribute('id', 'content-id')
    expect(screen.getByTestId('props-footer')).toHaveAttribute('id', 'footer-id')
  })

  it('should render minimal card', () => {
    render(<Card data-testid="minimal-card">Simple card content</Card>)
    
    const card = screen.getByTestId('minimal-card')
    expect(card).toBeInTheDocument()
    expect(screen.getByText('Simple card content')).toBeInTheDocument()
  })

  it('should render card without header', () => {
    render(
      <Card data-testid="no-header-card">
        <CardContent>Content without header</CardContent>
        <CardFooter>Footer without header</CardFooter>
      </Card>
    )

    expect(screen.getByText('Content without header')).toBeInTheDocument()
    expect(screen.getByText('Footer without header')).toBeInTheDocument()
  })

  it('should render card without footer', () => {
    render(
      <Card data-testid="no-footer-card">
        <CardHeader>
          <CardTitle>Title without footer</CardTitle>
        </CardHeader>
        <CardContent>Content without footer</CardContent>
      </Card>
    )

    expect(screen.getByText('Title without footer')).toBeInTheDocument()
    expect(screen.getByText('Content without footer')).toBeInTheDocument()
  })

  it('should combine custom classes with default classes', () => {
    render(
      <Card className="custom-bg" data-testid="combined-card">
        <CardHeader className="custom-padding" data-testid="combined-header">
          <CardTitle className="custom-color" data-testid="combined-title">Title</CardTitle>
        </CardHeader>
      </Card>
    )

    const card = screen.getByTestId('combined-card')
    const header = screen.getByTestId('combined-header')
    const title = screen.getByTestId('combined-title')

    expect(card).toHaveClass('custom-bg', 'rounded-lg', 'border') // custom + default
    expect(header).toHaveClass('custom-padding', 'flex', 'flex-col') // custom + default
    expect(title).toHaveClass('custom-color', 'text-2xl', 'font-semibold') // custom + default
  })

  it('should work with complex nested content', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Product Card</CardTitle>
          <CardDescription>A sample product description</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <p>Price: $99.99</p>
            <p>In stock: 15 items</p>
          </div>
        </CardContent>
        <CardFooter>
          <button>Add to Cart</button>
          <button>View Details</button>
        </CardFooter>
      </Card>
    )

    expect(screen.getByText('Product Card')).toBeInTheDocument()
    expect(screen.getByText('A sample product description')).toBeInTheDocument()
    expect(screen.getByText('Price: $99.99')).toBeInTheDocument()
    expect(screen.getByText('In stock: 15 items')).toBeInTheDocument()
    expect(screen.getByText('Add to Cart')).toBeInTheDocument()
    expect(screen.getByText('View Details')).toBeInTheDocument()
  })

  it('should handle click events', () => {
    const handleClick = vi.fn()
    render(<Card onClick={handleClick} data-testid="clickable-card">Clickable Card</Card>)
    
    const card = screen.getByTestId('clickable-card')
    card.click()
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})