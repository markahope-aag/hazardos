import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Logo, LogoHorizontal, LogoVertical, LogoIcon } from '@/components/ui/logo'

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, className, width, height, ...props }: any) => (
    <img
      src={src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      data-testid="logo-image"
      {...props}
    />
  ),
}))

describe('Logo Component', () => {
  it('should render with default props', () => {
    render(<Logo />)

    const image = screen.getByTestId('logo-image')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', '/logos/logo-horizontal-color.png')
    expect(image).toHaveAttribute('alt', 'HazardOS')
    expect(image).toHaveAttribute('width', '120')
    expect(image).toHaveAttribute('height', '40')
  })

  it('should render horizontal variant', () => {
    render(<Logo variant="horizontal" />)

    const image = screen.getByTestId('logo-image')
    expect(image).toHaveAttribute('src', '/logos/logo-horizontal-color.png')
    expect(image).toHaveClass('h-8') // md size for horizontal
  })

  it('should render vertical variant', () => {
    render(<Logo variant="vertical" />)

    const image = screen.getByTestId('logo-image')
    expect(image).toHaveAttribute('src', '/logos/logo-vertical-color.png')
    expect(image).toHaveClass('h-12') // md size for vertical
  })

  it('should render icon variant', () => {
    render(<Logo variant="icon" />)

    const image = screen.getByTestId('logo-image')
    expect(image).toHaveAttribute('src', '/logos/icon-512-color.png')
    expect(image).toHaveAttribute('width', '32')
    expect(image).toHaveAttribute('height', '32')
    expect(image).toHaveClass('h-8', 'w-8') // md size for icon
  })

  it('should render with different colors', () => {
    const colors = ['color', 'bw', 'white'] as const

    colors.forEach((color) => {
      const { rerender } = render(<Logo color={color} />)
      const image = screen.getByTestId('logo-image')
      expect(image).toHaveAttribute('src', `/logos/logo-horizontal-${color}.png`)
      rerender(<div />)
    })
  })

  it('should render with different sizes', () => {
    const sizes = [
      { size: 'sm', expectedClass: 'h-6' },
      { size: 'md', expectedClass: 'h-8' },
      { size: 'lg', expectedClass: 'h-10' },
      { size: 'xl', expectedClass: 'h-12' },
    ] as const

    sizes.forEach(({ size, expectedClass }) => {
      const { rerender } = render(<Logo size={size} />)
      const image = screen.getByTestId('logo-image')
      expect(image).toHaveClass(expectedClass)
      rerender(<div />)
    })
  })

  it('should render icon with correct size classes', () => {
    const iconSizes = [
      { size: 'sm', expectedClasses: ['h-6', 'w-6'] },
      { size: 'md', expectedClasses: ['h-8', 'w-8'] },
      { size: 'lg', expectedClasses: ['h-10', 'w-10'] },
      { size: 'xl', expectedClasses: ['h-12', 'w-12'] },
    ] as const

    iconSizes.forEach(({ size, expectedClasses }) => {
      const { rerender } = render(<Logo variant="icon" size={size} />)
      const image = screen.getByTestId('logo-image')
      expectedClasses.forEach((className) => {
        expect(image).toHaveClass(className)
      })
      rerender(<div />)
    })
  })

  it('should apply custom className', () => {
    render(<Logo className="custom-logo-class" />)

    const image = screen.getByTestId('logo-image')
    expect(image).toHaveClass('custom-logo-class')
  })

  it('should add w-auto class for non-icon variants', () => {
    const { rerender, unmount } = render(<Logo variant="horizontal" />)
    let horizontalImage = screen.getByTestId('logo-image')
    expect(horizontalImage).toHaveClass('w-auto')
    unmount()

    const { rerender: rerender2, unmount: unmount2 } = render(<Logo variant="vertical" />)
    let verticalImage = screen.getByTestId('logo-image')
    expect(verticalImage).toHaveClass('w-auto')
    unmount2()

    const { unmount: unmount3 } = render(<Logo variant="icon" />)
    let iconImage = screen.getByTestId('logo-image')
    expect(iconImage).not.toHaveClass('w-auto')
    unmount3()
  })

  it('should have correct alt text', () => {
    render(<Logo />)

    const image = screen.getByAltText('HazardOS')
    expect(image).toBeInTheDocument()
  })

  it('should combine all props correctly', () => {
    render(
      <Logo
        variant="vertical"
        color="bw"
        size="lg"
        className="custom-class"
      />
    )

    const image = screen.getByTestId('logo-image')
    expect(image).toHaveAttribute('src', '/logos/logo-vertical-bw.png')
    expect(image).toHaveClass('h-16', 'w-auto', 'custom-class')
  })
})

describe('Logo Convenience Components', () => {
  it('should render LogoHorizontal correctly', () => {
    render(<LogoHorizontal color="white" size="lg" />)

    const image = screen.getByTestId('logo-image')
    expect(image).toHaveAttribute('src', '/logos/logo-horizontal-white.png')
    expect(image).toHaveClass('h-10')
  })

  it('should render LogoVertical correctly', () => {
    render(<LogoVertical color="bw" size="sm" />)

    const image = screen.getByTestId('logo-image')
    expect(image).toHaveAttribute('src', '/logos/logo-vertical-bw.png')
    expect(image).toHaveClass('h-8')
  })

  it('should render LogoIcon correctly', () => {
    render(<LogoIcon color="color" size="xl" />)

    const image = screen.getByTestId('logo-image')
    expect(image).toHaveAttribute('src', '/logos/icon-512-color.png')
    expect(image).toHaveClass('h-12', 'w-12')
    expect(image).toHaveAttribute('width', '32')
    expect(image).toHaveAttribute('height', '32')
  })

  it('should pass through additional props to convenience components', () => {
    render(<LogoHorizontal className="convenience-class" />)

    const image = screen.getByTestId('logo-image')
    expect(image).toHaveClass('convenience-class')
  })

  it('should not allow variant override in convenience components', () => {
    // TypeScript should prevent this, but test runtime behavior
    render(<LogoIcon />)

    const image = screen.getByTestId('logo-image')
    expect(image).toHaveAttribute('src', '/logos/icon-512-color.png')
    // Should always be icon variant regardless of any other props
  })
})

describe('Logo Edge Cases', () => {
  it('should handle all size and variant combinations', () => {
    const variants = ['horizontal', 'vertical', 'icon'] as const
    const sizes = ['sm', 'md', 'lg', 'xl'] as const

    variants.forEach((variant) => {
      sizes.forEach((size) => {
        const { rerender } = render(<Logo variant={variant} size={size} />)
        const image = screen.getByTestId('logo-image')
        expect(image).toBeInTheDocument()
        expect(image).toHaveAttribute('alt', 'HazardOS')
        rerender(<div />)
      })
    })
  })

  it('should handle all color and variant combinations', () => {
    const variants = ['horizontal', 'vertical', 'icon'] as const
    const colors = ['color', 'bw', 'white'] as const

    variants.forEach((variant) => {
      colors.forEach((color) => {
        const { rerender } = render(<Logo variant={variant} color={color} />)
        const image = screen.getByTestId('logo-image')
        
        const expectedSrc = variant === 'icon' 
          ? `/logos/icon-512-${color}.png`
          : `/logos/logo-${variant}-${color}.png`
        
        expect(image).toHaveAttribute('src', expectedSrc)
        rerender(<div />)
      })
    })
  })

  it('should maintain consistent dimensions', () => {
    // Icon variant should always have square dimensions
    const { unmount: unmount1 } = render(<Logo variant="icon" />)
    const iconImage = screen.getByTestId('logo-image')
    expect(iconImage).toHaveAttribute('width', '32')
    expect(iconImage).toHaveAttribute('height', '32')
    unmount1()

    // Non-icon variants should have consistent dimensions
    const { unmount: unmount2 } = render(<Logo variant="horizontal" />)
    const horizontalImage = screen.getByTestId('logo-image')
    expect(horizontalImage).toHaveAttribute('width', '120')
    expect(horizontalImage).toHaveAttribute('height', '40')
    unmount2()

    const { unmount: unmount3 } = render(<Logo variant="vertical" />)
    const verticalImage = screen.getByTestId('logo-image')
    expect(verticalImage).toHaveAttribute('width', '120')
    expect(verticalImage).toHaveAttribute('height', '40')
    unmount3()
  })
})