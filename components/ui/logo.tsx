import { cn } from '@/lib/utils'
import Image from 'next/image'

interface LogoProps {
  variant?: 'horizontal' | 'vertical' | 'icon'
  color?: 'color' | 'bw' | 'white'
  size?: 'sm' | 'md' | 'lg' | 'xl'
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

  return (
    <Image
      src={getImageSrc()}
      alt="HazardOS"
      className={cn(
        sizeClass,
        variant !== 'icon' && 'w-auto',
        className
      )}
      width={variant === 'icon' ? 32 : 120}
      height={variant === 'icon' ? 32 : 40}
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