import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FeatureGate, FeatureLockedCard, FeatureBadge, FeatureListItem } from '@/components/billing/feature-gate'

describe('FeatureGate Component', () => {
  it('should render children when enabled', () => {
    render(
      <FeatureGate feature="ai_proposals" enabled={true}>
        <div>Feature Content</div>
      </FeatureGate>
    )

    expect(screen.getByText('Feature Content')).toBeInTheDocument()
  })

  it('should not render children when disabled', () => {
    render(
      <FeatureGate feature="ai_proposals" enabled={false}>
        <div>Feature Content</div>
      </FeatureGate>
    )

    expect(screen.queryByText('Feature Content')).not.toBeInTheDocument()
  })

  it('should render fallback when disabled and fallback provided', () => {
    render(
      <FeatureGate
        feature="ai_proposals"
        enabled={false}
        fallback={<div>Fallback Content</div>}
      >
        <div>Feature Content</div>
      </FeatureGate>
    )

    expect(screen.queryByText('Feature Content')).not.toBeInTheDocument()
    expect(screen.getByText('Fallback Content')).toBeInTheDocument()
  })

  it('should show upgrade prompt when disabled and showUpgradePrompt is true', () => {
    render(
      <FeatureGate feature="ai_proposals" enabled={false} showUpgradePrompt={true}>
        <div>Feature Content</div>
      </FeatureGate>
    )

    expect(screen.getByText('Upgrade Plan')).toBeInTheDocument()
  })

  it('should return null when disabled, no fallback, and showUpgradePrompt is false', () => {
    const { container } = render(
      <FeatureGate feature="ai_proposals" enabled={false} showUpgradePrompt={false}>
        <div>Feature Content</div>
      </FeatureGate>
    )

    expect(container).toBeEmptyDOMElement()
  })
})

describe('FeatureLockedCard Component', () => {
  it('should render without crashing', () => {
    expect(() =>
      render(
        <FeatureLockedCard
          featureName="AI Proposals"
          requiredPlan="pro"
        />
      )
    ).not.toThrow()
  })

  it('should render feature name', () => {
    render(
      <FeatureLockedCard
        featureName="AI Proposals"
        requiredPlan="pro"
      />
    )

    expect(screen.getByText('AI Proposals')).toBeInTheDocument()
  })

  it('should render feature description when provided', () => {
    render(
      <FeatureLockedCard
        featureName="AI Proposals"
        featureDescription="Generate proposals with AI"
        requiredPlan="pro"
      />
    )

    expect(screen.getByText('Generate proposals with AI')).toBeInTheDocument()
  })

  it('should show correct plan label for starter', () => {
    render(
      <FeatureLockedCard
        featureName="Feature"
        requiredPlan="starter"
      />
    )

    expect(screen.getByText('Starter Plan Required')).toBeInTheDocument()
  })

  it('should show correct plan label for pro', () => {
    render(
      <FeatureLockedCard
        featureName="Feature"
        requiredPlan="pro"
      />
    )

    expect(screen.getByText('Professional Plan Required')).toBeInTheDocument()
  })

  it('should show correct plan label for enterprise', () => {
    render(
      <FeatureLockedCard
        featureName="Feature"
        requiredPlan="enterprise"
      />
    )

    expect(screen.getByText('Enterprise Plan Required')).toBeInTheDocument()
  })

  it('should render upgrade plan link', () => {
    render(
      <FeatureLockedCard
        featureName="Feature"
        requiredPlan="pro"
      />
    )

    const link = screen.getByRole('link', { name: /upgrade plan/i })
    expect(link).toHaveAttribute('href', '/settings/billing')
  })

  it('should render lock icon', () => {
    const { container } = render(
      <FeatureLockedCard
        featureName="Feature"
        requiredPlan="pro"
      />
    )

    // Lock icon is rendered
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})

describe('FeatureBadge Component', () => {
  it('should render without crashing', () => {
    expect(() =>
      render(<FeatureBadge feature="ai_proposals" enabled={true} />)
    ).not.toThrow()
  })

  it('should show Enabled badge when enabled', () => {
    render(<FeatureBadge feature="ai_proposals" enabled={true} />)
    expect(screen.getByText('Enabled')).toBeInTheDocument()
  })

  it('should show plan badge when disabled', () => {
    render(<FeatureBadge feature="ai_proposals" enabled={false} />)
    // Should show Pro, Starter, or Enterprise based on feature config
    expect(screen.getByText(/Pro|Starter|Enterprise/)).toBeInTheDocument()
  })

  it('should accept custom className', () => {
    render(<FeatureBadge feature="ai_proposals" enabled={true} className="custom-badge" />)
    expect(screen.getByText('Enabled')).toHaveClass('custom-badge')
  })

  it('should have green styling when enabled', () => {
    render(<FeatureBadge feature="ai_proposals" enabled={true} />)
    expect(screen.getByText('Enabled')).toHaveClass('bg-green-100')
    expect(screen.getByText('Enabled')).toHaveClass('text-green-800')
  })
})

describe('FeatureListItem Component', () => {
  it('should render without crashing', () => {
    expect(() =>
      render(<FeatureListItem feature="ai_proposals" enabled={true} />)
    ).not.toThrow()
  })

  it('should render feature name', () => {
    render(<FeatureListItem feature="ai_proposals" enabled={true} />)
    // Feature name from config should be displayed
    expect(screen.getByText(/AI|Proposals|ai_proposals/i)).toBeInTheDocument()
  })

  it('should render badge', () => {
    render(<FeatureListItem feature="ai_proposals" enabled={true} />)
    expect(screen.getByText('Enabled')).toBeInTheDocument()
  })

  it('should show lock icon when disabled', () => {
    const { container } = render(<FeatureListItem feature="ai_proposals" enabled={false} />)
    // Should have at least one lock icon
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
  })

  it('should be clickable when onClick provided', () => {
    const handleClick = () => {}
    const { container } = render(
      <FeatureListItem feature="ai_proposals" enabled={true} onClick={handleClick} />
    )

    const item = container.firstChild as HTMLElement
    expect(item).toHaveClass('cursor-pointer')
  })

  it('should not have cursor-pointer when no onClick', () => {
    const { container } = render(
      <FeatureListItem feature="ai_proposals" enabled={true} />
    )

    const item = container.firstChild as HTMLElement
    expect(item).not.toHaveClass('cursor-pointer')
  })
})
