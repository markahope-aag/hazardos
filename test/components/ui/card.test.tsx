import { render, screen } from '@testing-library/react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'

describe('Card Components', () => {
  describe('Card', () => {
    it('should render with default styles', () => {
      render(<Card>Card content</Card>)

      const card = screen.getByText('Card content')
      expect(card).toBeInTheDocument()
      expect(card).toHaveClass('rounded-lg', 'border', 'bg-white', 'shadow-sm')
    })

    it('should accept custom className', () => {
      render(<Card className="custom-class">Card content</Card>)

      const card = screen.getByText('Card content')
      expect(card).toHaveClass('custom-class')
    })

    it('should forward ref', () => {
      const ref = vi.fn()
      render(<Card ref={ref}>Card content</Card>)

      expect(ref).toHaveBeenCalled()
    })

    it('should pass through additional props', () => {
      render(<Card data-testid="test-card" aria-label="Test card">Card content</Card>)

      const card = screen.getByTestId('test-card')
      expect(card).toHaveAttribute('aria-label', 'Test card')
    })
  })

  describe('CardHeader', () => {
    it('should render with default styles', () => {
      render(<CardHeader>Header content</CardHeader>)

      const header = screen.getByText('Header content')
      expect(header).toBeInTheDocument()
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6')
    })

    it('should accept custom className', () => {
      render(<CardHeader className="custom-header">Header content</CardHeader>)

      const header = screen.getByText('Header content')
      expect(header).toHaveClass('custom-header')
    })

    it('should forward ref', () => {
      const ref = vi.fn()
      render(<CardHeader ref={ref}>Header content</CardHeader>)

      expect(ref).toHaveBeenCalled()
    })
  })

  describe('CardTitle', () => {
    it('should render as h3 with default styles', () => {
      render(<CardTitle>Title content</CardTitle>)

      const title = screen.getByText('Title content')
      expect(title).toBeInTheDocument()
      expect(title.tagName).toBe('H3')
      expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight')
    })

    it('should accept custom className', () => {
      render(<CardTitle className="custom-title">Title content</CardTitle>)

      const title = screen.getByText('Title content')
      expect(title).toHaveClass('custom-title')
    })

    it('should forward ref', () => {
      const ref = vi.fn()
      render(<CardTitle ref={ref}>Title content</CardTitle>)

      expect(ref).toHaveBeenCalled()
    })
  })

  describe('CardDescription', () => {
    it('should render as p with default styles', () => {
      render(<CardDescription>Description content</CardDescription>)

      const description = screen.getByText('Description content')
      expect(description).toBeInTheDocument()
      expect(description.tagName).toBe('P')
      expect(description).toHaveClass('text-sm', 'text-gray-600')
    })

    it('should accept custom className', () => {
      render(<CardDescription className="custom-description">Description content</CardDescription>)

      const description = screen.getByText('Description content')
      expect(description).toHaveClass('custom-description')
    })

    it('should forward ref', () => {
      const ref = vi.fn()
      render(<CardDescription ref={ref}>Description content</CardDescription>)

      expect(ref).toHaveBeenCalled()
    })
  })

  describe('CardContent', () => {
    it('should render with default styles', () => {
      render(<CardContent>Content here</CardContent>)

      const content = screen.getByText('Content here')
      expect(content).toBeInTheDocument()
      expect(content).toHaveClass('p-6', 'pt-0')
    })

    it('should accept custom className', () => {
      render(<CardContent className="custom-content">Content here</CardContent>)

      const content = screen.getByText('Content here')
      expect(content).toHaveClass('custom-content')
    })

    it('should forward ref', () => {
      const ref = vi.fn()
      render(<CardContent ref={ref}>Content here</CardContent>)

      expect(ref).toHaveBeenCalled()
    })
  })

  describe('CardFooter', () => {
    it('should render with default styles', () => {
      render(<CardFooter>Footer content</CardFooter>)

      const footer = screen.getByText('Footer content')
      expect(footer).toBeInTheDocument()
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0')
    })

    it('should accept custom className', () => {
      render(<CardFooter className="custom-footer">Footer content</CardFooter>)

      const footer = screen.getByText('Footer content')
      expect(footer).toHaveClass('custom-footer')
    })

    it('should forward ref', () => {
      const ref = vi.fn()
      render(<CardFooter ref={ref}>Footer content</CardFooter>)

      expect(ref).toHaveBeenCalled()
    })
  })

  describe('Full Card composition', () => {
    it('should render a complete card with all subcomponents', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Card</CardTitle>
            <CardDescription>This is a test card</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Main content goes here</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      )

      expect(screen.getByText('Test Card')).toBeInTheDocument()
      expect(screen.getByText('This is a test card')).toBeInTheDocument()
      expect(screen.getByText('Main content goes here')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
    })

    it('should render card with only header and content', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Simple Card</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Content only</p>
          </CardContent>
        </Card>
      )

      expect(screen.getByText('Simple Card')).toBeInTheDocument()
      expect(screen.getByText('Content only')).toBeInTheDocument()
    })

    it('should render card with custom styling on all parts', () => {
      const { container } = render(
        <Card className="card-wrapper" data-testid="card">
          <CardHeader className="header-custom">
            <CardTitle className="title-custom">Styled Card</CardTitle>
            <CardDescription className="desc-custom">With custom styles</CardDescription>
          </CardHeader>
          <CardContent className="content-custom">
            <p>Styled content</p>
          </CardContent>
          <CardFooter className="footer-custom">
            <span>Styled footer</span>
          </CardFooter>
        </Card>
      )

      expect(container.querySelector('.card-wrapper')).toBeInTheDocument()
      expect(container.querySelector('.header-custom')).toBeInTheDocument()
      expect(container.querySelector('.title-custom')).toBeInTheDocument()
      expect(container.querySelector('.desc-custom')).toBeInTheDocument()
      expect(container.querySelector('.content-custom')).toBeInTheDocument()
      expect(container.querySelector('.footer-custom')).toBeInTheDocument()
    })
  })

  describe('displayName', () => {
    it('should have correct displayName for Card', () => {
      expect(Card.displayName).toBe('Card')
    })

    it('should have correct displayName for CardHeader', () => {
      expect(CardHeader.displayName).toBe('CardHeader')
    })

    it('should have correct displayName for CardTitle', () => {
      expect(CardTitle.displayName).toBe('CardTitle')
    })

    it('should have correct displayName for CardDescription', () => {
      expect(CardDescription.displayName).toBe('CardDescription')
    })

    it('should have correct displayName for CardContent', () => {
      expect(CardContent.displayName).toBe('CardContent')
    })

    it('should have correct displayName for CardFooter', () => {
      expect(CardFooter.displayName).toBe('CardFooter')
    })
  })
})
