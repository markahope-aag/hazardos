interface LogoProps {
  variant?: 'horizontal' | 'vertical' | 'icon'
  color?: 'color' | 'bw' | 'white'
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  /**
   * Output format. Defaults to SVG — every in-app consumer supports it.
   * Use 'png' for embeds that don't render SVG (raster email clients,
   * some PDF generators, a few legacy Office apps).
   */
  format?: 'svg' | 'png'
  className?: string
}

// For some variant/color combinations we only have a PNG master on disk,
// so we silently fall back to PNG regardless of the requested format.
// Add an entry here if a future brand drop ships without an SVG.
const ICON_ONLY_PNG = new Set<string>([
  'icon-192-color',
])

export function Logo({
  variant = 'horizontal',
  color = 'color',
  size = 'md',
  format = 'svg',
  className,
}: LogoProps) {
  const getImageSrc = () => {
    const base =
      variant === 'icon'
        ? `icon-512-${color}`
        : `logo-${variant}-${color}`
    const ext = format === 'png' || ICON_ONLY_PNG.has(base) ? 'png' : 'svg'
    return `/logos/${base}.${ext}`
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
