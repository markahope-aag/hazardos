import { cn } from '@/lib/utils'

interface LogoProps {
  variant?: 'horizontal' | 'vertical' | 'icon'
  color?: 'color' | 'bw' | 'white'
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
}

const sizeClasses = {
  sm: {
    horizontal: 'h-6',
    vertical: 'h-8',
    icon: 'h-6 w-6'
  },
  md: {
    horizontal: 'h-8',
    vertical: 'h-12',
    icon: 'h-8 w-8'
  },
  lg: {
    horizontal: 'h-10',
    vertical: 'h-16',
    icon: 'h-10 w-10'
  },
  xl: {
    horizontal: 'h-12',
    vertical: 'h-20',
    icon: 'h-12 w-12'
  },
  '2xl': {
    horizontal: 'h-16',
    vertical: 'h-32',
    icon: 'h-16 w-16'
  }
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

  const sizeClass = sizeClasses[size][variant]

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