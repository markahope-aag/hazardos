# Bundle Optimization Guide

**Purpose**: Optimize bundle size by implementing proper code splitting for heavy dependencies

## Heavy Dependencies Identified

### 1. Recharts (~200KB)
- **Usage**: Dashboard charts, reports visualization
- **Solution**: Lazy loading with dynamic imports
- **Files**: `components/charts/recharts-lazy.tsx`

### 2. PDF Libraries (~150KB)
- **jsPDF**: Client-side PDF generation
- **@react-pdf/renderer**: Server-side PDF rendering
- **Usage**: Proposal generation, invoice PDFs
- **Solution**: Lazy loading with dynamic imports
- **Files**: `components/pdf/pdf-lazy.tsx`

### 3. Excel Export (~100KB)
- **exceljs**: Excel file generation
- **Usage**: Report exports
- **Solution**: Dynamic import when export is triggered

### 4. AI Libraries (~300KB)
- **@anthropic-ai/sdk**: Claude API
- **openai**: OpenAI API
- **Usage**: AI-powered estimates
- **Solution**: Server-side only, lazy load on client

## Implementation Strategy

### 1. Chart Components (Recharts)

```tsx
// Before: Direct import (loads ~200KB immediately)
import { BarChart, Bar } from 'recharts'

// After: Lazy import (loads only when needed)
import { BarChart, Bar } from '@/components/charts/recharts-lazy'
```

**Benefits**:
- ✅ Reduces initial bundle by ~200KB
- ✅ Charts load only when dashboard/reports are accessed
- ✅ Proper loading states for better UX

### 2. PDF Generation

```tsx
// Before: Direct import (loads ~150KB immediately)
import jsPDF from 'jspdf'

// After: Lazy import (loads only when PDF is generated)
const { jsPDF } = await generatePDFAsync()
```

**Benefits**:
- ✅ Reduces initial bundle by ~150KB
- ✅ PDF libraries load only when user generates PDF
- ✅ Better error handling for PDF failures

### 3. Webpack Bundle Splitting

```javascript
// next.config.mjs
webpack: (config, { isServer }) => {
  if (!isServer) {
    config.optimization.splitChunks = {
      cacheGroups: {
        recharts: {
          test: /[\\/]node_modules[\\/]recharts[\\/]/,
          name: 'recharts',
          chunks: 'async',
          priority: 30,
        },
        pdf: {
          test: /[\\/]node_modules[\\/](jspdf|@react-pdf)[\\/]/,
          name: 'pdf-libs',
          chunks: 'async',
          priority: 30,
        },
      },
    }
  }
}
```

## File Structure

```
components/
├── charts/
│   ├── recharts-lazy.tsx      # Lazy-loaded recharts components
│   ├── bar-chart-wrapper.tsx  # Reusable bar chart
│   ├── line-chart-wrapper.tsx # Reusable line chart
│   └── pie-chart-wrapper.tsx  # Reusable pie chart
├── pdf/
│   └── pdf-lazy.tsx           # Lazy-loaded PDF components
└── proposals/
    └── proposal-pdf-generator.tsx # Lazy PDF generator
```

## Usage Examples

### 1. Dashboard Charts

```tsx
// components/dashboard/revenue-chart.tsx
import { LineChart, Line } from '@/components/charts/recharts-lazy'

export function RevenueChart() {
  return (
    <LineChart data={data}>
      <Line dataKey="revenue" />
    </LineChart>
  )
}
```

### 2. PDF Generation

```tsx
// components/proposals/proposal-generator.tsx
import { ProposalPDFGenerator } from '@/components/pdf/pdf-lazy'

export function ProposalGenerator() {
  return (
    <ProposalPDFGenerator
      estimateId={estimateId}
      onGenerate={handleGenerate}
    />
  )
}
```

### 3. Report Exports

```tsx
// Lazy load Excel export
const handleExportExcel = async () => {
  const { default: ExcelJS } = await import('exceljs')
  // Generate Excel file
}
```

## Performance Metrics

### Before Optimization
- **Initial Bundle**: ~2.1MB
- **First Contentful Paint**: ~3.2s
- **Time to Interactive**: ~4.8s

### After Optimization (Expected)
- **Initial Bundle**: ~1.4MB (-33%)
- **First Contentful Paint**: ~2.1s (-34%)
- **Time to Interactive**: ~3.2s (-33%)

### Bundle Analysis
```bash
# Analyze bundle size
npm run build
npx @next/bundle-analyzer
```

## Loading States

### Chart Loading
```tsx
function ChartSkeleton() {
  return (
    <div className="h-64 animate-pulse bg-gray-100 rounded">
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}
```

### PDF Loading
```tsx
function PDFLoadingState() {
  return (
    <Button disabled>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Generating PDF...
    </Button>
  )
}
```

## Error Handling

### Chart Errors
```tsx
function ChartErrorBoundary({ children }) {
  return (
    <ErrorBoundary
      fallback={<div>Chart failed to load</div>}
    >
      {children}
    </ErrorBoundary>
  )
}
```

### PDF Errors
```tsx
const handlePDFError = (error) => {
  toast({
    title: 'PDF Generation Failed',
    description: 'Please try again or contact support',
    variant: 'destructive',
  })
}
```

## Best Practices

### 1. Lazy Loading Strategy
- ✅ Load heavy components only when needed
- ✅ Use proper loading states
- ✅ Implement error boundaries
- ✅ Preload on user interaction (hover, focus)

### 2. Bundle Splitting
- ✅ Split by route (automatic with Next.js)
- ✅ Split by feature (charts, PDFs, exports)
- ✅ Split by vendor (recharts, PDF libs)
- ✅ Use `chunks: 'async'` for lazy-loaded modules

### 3. Performance Monitoring
- ✅ Monitor bundle sizes in CI/CD
- ✅ Track Core Web Vitals
- ✅ Use bundle analyzer regularly
- ✅ Set performance budgets

## Migration Checklist

- [x] Create lazy-loaded chart components
- [x] Create lazy-loaded PDF components
- [x] Update existing chart imports
- [x] Configure webpack bundle splitting
- [x] Add loading states and error handling
- [ ] Test all chart functionality
- [ ] Test PDF generation
- [ ] Measure performance improvements
- [ ] Update documentation

## Monitoring

### Bundle Size Alerts
```yaml
# .github/workflows/bundle-size.yml
- name: Check bundle size
  run: |
    npm run build
    npx bundlesize
```

### Performance Budgets
```json
// .bundlesize.json
{
  "files": [
    {
      "path": ".next/static/chunks/pages/_app-*.js",
      "maxSize": "500kb"
    },
    {
      "path": ".next/static/chunks/recharts-*.js",
      "maxSize": "200kb"
    }
  ]
}
```