import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Logo, LogoHorizontal, LogoVertical, LogoIcon } from '@/components/ui/logo'

describe('Logo Component', () => {
  it('should render with default props (SVG)', () => {
    render(<Logo />)

    const image = screen.getByAltText('HazardOS')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', '/logos/logo-horizontal-color.svg')
    expect(image).toHaveStyle({ height: '32px', width: 'auto' })
  })

  it('should render horizontal variant', () => {
    render(<Logo variant="horizontal" />)

    const image = screen.getByAltText('HazardOS')
    expect(image).toHaveAttribute('src', '/logos/logo-horizontal-color.svg')
    expect(image).toHaveStyle({ height: '32px' })
  })

  it('should render vertical variant', () => {
    render(<Logo variant="vertical" />)

    const image = screen.getByAltText('HazardOS')
    expect(image).toHaveAttribute('src', '/logos/logo-vertical-color.svg')
    expect(image).toHaveStyle({ height: '48px' })
  })

  it('should render icon variant as 512 SVG', () => {
    render(<Logo variant="icon" />)

    const image = screen.getByAltText('HazardOS')
    expect(image).toHaveAttribute('src', '/logos/icon-512-color.svg')
    expect(image).toHaveStyle({ height: '32px' })
  })

  it('should render with different colors (SVG)', () => {
    const colors = ['color', 'bw', 'white'] as const

    colors.forEach((color) => {
      const { unmount } = render(<Logo color={color} />)
      const image = screen.getByAltText('HazardOS')
      expect(image).toHaveAttribute('src', `/logos/logo-horizontal-${color}.svg`)
      unmount()
    })
  })

  it('should honor format="png" when asked (email/PDF consumers)', () => {
    render(<Logo format="png" />)

    const image = screen.getByAltText('HazardOS')
    expect(image).toHaveAttribute('src', '/logos/logo-horizontal-color.png')
  })

  it('should render with different sizes', () => {
    const sizes = [
      { size: 'sm' as const, expectedHeight: 24 },
      { size: 'md' as const, expectedHeight: 32 },
      { size: 'lg' as const, expectedHeight: 40 },
      { size: 'xl' as const, expectedHeight: 48 },
    ]

    sizes.forEach(({ size, expectedHeight }) => {
      const { unmount } = render(<Logo size={size} />)
      const image = screen.getByAltText('HazardOS')
      expect(image).toHaveStyle({ height: `${expectedHeight}px` })
      unmount()
    })
  })

  it('should render icon with correct size heights', () => {
    const iconSizes = [
      { size: 'sm' as const, expectedHeight: 24 },
      { size: 'md' as const, expectedHeight: 32 },
      { size: 'lg' as const, expectedHeight: 40 },
      { size: 'xl' as const, expectedHeight: 48 },
    ]

    iconSizes.forEach(({ size, expectedHeight }) => {
      const { unmount } = render(<Logo variant="icon" size={size} />)
      const image = screen.getByAltText('HazardOS')
      expect(image).toHaveStyle({ height: `${expectedHeight}px` })
      unmount()
    })
  })

  it('should apply custom className', () => {
    render(<Logo className="custom-logo-class" />)

    const image = screen.getByAltText('HazardOS')
    expect(image).toHaveClass('custom-logo-class')
  })

  it('should have auto width for all variants', () => {
    const variants = ['horizontal', 'vertical', 'icon'] as const

    variants.forEach((variant) => {
      const { unmount } = render(<Logo variant={variant} />)
      const image = screen.getByAltText('HazardOS')
      expect(image).toHaveStyle({ width: 'auto' })
      unmount()
    })
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

    const image = screen.getByAltText('HazardOS')
    expect(image).toHaveAttribute('src', '/logos/logo-vertical-bw.svg')
    expect(image).toHaveStyle({ height: '64px', width: 'auto' })
    expect(image).toHaveClass('custom-class')
  })
})

describe('Logo Convenience Components', () => {
  it('should render LogoHorizontal correctly (SVG)', () => {
    render(<LogoHorizontal color="white" size="lg" />)

    const image = screen.getByAltText('HazardOS')
    expect(image).toHaveAttribute('src', '/logos/logo-horizontal-white.svg')
    expect(image).toHaveStyle({ height: '40px' })
  })

  it('should render LogoVertical correctly (SVG)', () => {
    render(<LogoVertical color="bw" size="sm" />)

    const image = screen.getByAltText('HazardOS')
    expect(image).toHaveAttribute('src', '/logos/logo-vertical-bw.svg')
    expect(image).toHaveStyle({ height: '32px' })
  })

  it('should render LogoIcon correctly (SVG)', () => {
    render(<LogoIcon color="color" size="xl" />)

    const image = screen.getByAltText('HazardOS')
    expect(image).toHaveAttribute('src', '/logos/icon-512-color.svg')
    expect(image).toHaveStyle({ height: '48px' })
  })

  it('should pass through additional props to convenience components', () => {
    render(<LogoHorizontal className="convenience-class" />)

    const image = screen.getByAltText('HazardOS')
    expect(image).toHaveClass('convenience-class')
  })

  it('should not allow variant override in convenience components', () => {
    render(<LogoIcon />)

    const image = screen.getByAltText('HazardOS')
    expect(image).toHaveAttribute('src', '/logos/icon-512-color.svg')
  })
})

describe('Logo Edge Cases', () => {
  it('should handle all size and variant combinations', () => {
    const variants = ['horizontal', 'vertical', 'icon'] as const
    const sizes = ['sm', 'md', 'lg', 'xl'] as const

    variants.forEach((variant) => {
      sizes.forEach((size) => {
        const { unmount } = render(<Logo variant={variant} size={size} />)
        const image = screen.getByAltText('HazardOS')
        expect(image).toBeInTheDocument()
        expect(image).toHaveAttribute('alt', 'HazardOS')
        unmount()
      })
    })
  })

  it('should handle all color and variant combinations (SVG)', () => {
    const variants = ['horizontal', 'vertical', 'icon'] as const
    const colors = ['color', 'bw', 'white'] as const

    variants.forEach((variant) => {
      colors.forEach((color) => {
        const { unmount } = render(<Logo variant={variant} color={color} />)
        const image = screen.getByAltText('HazardOS')

        const expectedSrc = variant === 'icon'
          ? `/logos/icon-512-${color}.svg`
          : `/logos/logo-${variant}-${color}.svg`

        expect(image).toHaveAttribute('src', expectedSrc)
        unmount()
      })
    })
  })

  it('should maintain consistent dimensions via inline styles', () => {
    const { unmount: unmount1 } = render(<Logo variant="icon" />)
    const iconImage = screen.getByAltText('HazardOS')
    expect(iconImage).toHaveStyle({ height: '32px', width: 'auto' })
    unmount1()

    const { unmount: unmount2 } = render(<Logo variant="horizontal" />)
    const horizontalImage = screen.getByAltText('HazardOS')
    expect(horizontalImage).toHaveStyle({ height: '32px', width: 'auto' })
    unmount2()

    const { unmount: unmount3 } = render(<Logo variant="vertical" />)
    const verticalImage = screen.getByAltText('HazardOS')
    expect(verticalImage).toHaveStyle({ height: '48px', width: 'auto' })
    unmount3()
  })
})
