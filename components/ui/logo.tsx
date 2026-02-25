interface LogoProps {
  variant?: 'horizontal' | 'vertical' | 'icon'
  color?: 'color' | 'bw' | 'white'
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
}

export function Logo({
  variant = 'horizontal',
  color = 'color',
  size = 'md',
  className
}: LogoProps) {
  const getImageSrc = () => {
    if (variant === 'icon') {
      return `/logos/icon-512-${color}.png`
    }
    return `/logos/logo-${variant}-${color}.png`
  }

  const heights: Record<string, number> = {
    sm: variant === 'vertical' ? 32 : 24,
    md: variant === 'vertical' ? 48 : 32,
    lg: variant === 'vertical' ? 64 : 40,
    xl: variant === 'vertical' ? 80 : 48,
    '2xl': variant === 'vertical' ? 128 : 64,
  }

  /* eslint-disable @next/next/no-img-element */
  return (
    <img
      src={getImageSrc()}
      alt="HazardOS"
      style={{ height: heights[size], width: 'auto', maxWidth: 'none' }}
      className={className}
    />
  )
}

// Convenience components for common use cases
export function LogoHorizontal(props: Omit<LogoProps, 'variant'>) {
  return <Logo {...props} variant="horizontal" />
}

export function LogoVertical(props: Omit<LogoProps, 'variant'>) {
  return <Logo {...props} variant="vertical" />
}

export function LogoIcon(props: Omit<LogoProps, 'variant'>) {
  return <Logo {...props} variant="icon" />
}