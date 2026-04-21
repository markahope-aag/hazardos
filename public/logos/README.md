# HazardOS Brand Assets

**Complete Brand Identity Package** | Version 1.1 | April 2026

---

## 📦 What's Included

All brand assets live in this single folder (`public/logos/`). Every file is
served as a static asset at `/logos/<filename>`.

### File inventory (29 files)

**Favicons** (3 sizes, SVG + PNG each):

| File | Purpose |
|------|---------|
| `favicon-16.svg`, `favicon-16.png` | Browser-tab icon, small |
| `favicon-32.svg`, `favicon-32.png` | Browser-tab icon, standard |
| `favicon-64.svg`, `favicon-64.png` | Browser-tab icon, high-DPI |

**App icons** (SVG + PNG):

| File | Purpose |
|------|---------|
| `icon-192-color.png` | PWA 192×192 (`manifest.json`, Android home-screen, iOS apple-touch). PNG-only — Android/iOS masks render PNG more reliably than SVG. |
| `icon-512-color.svg`, `icon-512-color.png` | High-res 512×512, primary color fill |
| `icon-512-bw.svg`, `icon-512-bw.png` | Black & white (print, monochrome PWA purpose) |
| `icon-512-white.svg`, `icon-512-white.png` | White on transparent (dark backgrounds) |

**Logos — horizontal lockup** (icon + wordmark side-by-side):

| File | Purpose |
|------|---------|
| `logo-horizontal-color.svg`, `-color.png` | Primary — web headers, footers |
| `logo-horizontal-bw.svg`, `-bw.png` | Single-color print, stamps |
| `logo-horizontal-white.svg`, `-white.png` | Reverse lockup — dark backgrounds |

**Logos — vertical lockup** (icon above wordmark):

| File | Purpose |
|------|---------|
| `logo-vertical-color.svg`, `-color.png` | Primary — auth screens, splash, cards |
| `logo-vertical-bw.svg`, `-bw.png` | Single-color print |
| `logo-vertical-white.svg`, `-white.png` | Reverse lockup — dark backgrounds |

---

## 🎨 Quick Start

### In-app (preferred)

Use the `<Logo />` component — it handles variant, color, size, and
format selection:

```tsx
import { Logo, LogoHorizontal, LogoVertical, LogoIcon } from '@/components/ui/logo'

<LogoHorizontal size="lg" />                  {/* default: color, SVG */}
<LogoVertical color="white" size="xl" />      {/* dark backgrounds */}
<LogoIcon color="bw" size="md" />             {/* mono icon */}
<Logo format="png" />                         {/* for email/PDF embeds */}
```

### Raw HTML (head tags)

```html
<!-- Modern browsers prefer the SVG; older ones fall back to PNG -->
<link rel="icon" type="image/svg+xml" href="/logos/favicon-32.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/logos/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/logos/favicon-16.png">
<link rel="apple-touch-icon" sizes="192x192" href="/logos/icon-192-color.png">
```

### PWA (`public/manifest.json`)

Already wired up — the manifest lists SVG + PNG favicons and the 192/512
icons for Android install prompts.

### Email templates

Use PNG versions — many email clients don't render SVG:

```html
<img src="https://app.hazardos.com/logos/logo-horizontal-color.png"
     alt="HazardOS" width="180">
```

---

## 🎨 Brand colors

**HazardOS Orange**  `#FF6B35` · RGB 255, 107, 53 · CMYK 0, 58, 79, 0
**Navy Blue**        `#1F2937` · RGB 31, 41, 55  · CMYK 77, 62, 47, 50
**Gray (secondary)** `#6B7280` · RGB 107, 112, 128
**White**            `#FFFFFF`

---

## 🔤 Typography

- **Primary**: Geist Mono (logos, technical UI, code)
- **Secondary**: Inter (body text, headings, marketing)

---

## ⚠️ Usage guidelines

DO:
✅ Prefer SVG (crisper, smaller for most sizes)
✅ Use the white-reverse lockup on dark backgrounds
✅ Use the B&W version for single-color print
✅ Maintain clear space around the logo

DON'T:
❌ Rotate, distort, or recolor
❌ Separate the icon from the wordmark
❌ Place the color version on busy or dark backgrounds

---

## 📏 Minimum sizes

- Icon only: 16px / 0.25" (6mm)
- Horizontal logo: 120px / 1.5" (38mm) wide
- Vertical logo: 80px / 1" (25mm) wide

Below the minimum, use the icon-only version without the wordmark.

---

## 📚 Full documentation

See `HazardOS-Brand-Guide.pdf` for the visual brand reference.

---

## Version history

**v1.1** (April 2026)
- Added SVG masters for every asset (except `icon-192-color`, which
  ships as PNG only to maximize compatibility with OS icon renderers)
- New reverse (white) lockups: `logo-horizontal-white.{svg,png}` and
  `logo-vertical-white.{svg,png}`
- New `icon-512-white.{svg,png}` for white-on-transparent use
- Dropped the `.jpg` variants — SVG + PNG cover every consumer
- Dropped the `icons/` subfolder — everything lives in `logos/`

**v1.0** (January 2026)
- Initial brand assets release

---

© 2026 HazardOS / Asymmetric Marketing LLC. All rights reserved.
