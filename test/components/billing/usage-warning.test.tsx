import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UsageWarningAlert, UsageWarningBanner, UsageMeter, UsageOverview } from '@/components/billing/usage-warning'
import type { UsageWarning } from '@/types/feature-flags'

const mockWarning: UsageWarning = {
  type: 'users',
  level: 'warning',
  message: 'You are approaching your user limit',
  percentage: 85,
  current: 17,
  limit: 20,
}

describe('UsageWarningAlert Component', () => {
  it('should render without crashing', () => {
    expect(() => render(<UsageWarningAlert warning={mockWarning} />)).not.toThrow()
  })

  it('should display warning message', () => {
    render(<UsageWarningAlert warning={mockWarning} />)
    expect(screen.getByText('You are approaching your user limit')).toBeInTheDocument()
  })

  it('should display percentage', () => {
    render(<UsageWarningAlert warning={mockWarning} />)
    expect(screen.getByText('85%')).toBeInTheDocument()
  })

  it('should display upgrade button by default', () => {
    render(<UsageWarningAlert warning={mockWarning} />)
    expect(screen.getByRole('link', { name: /upgrade plan/i })).toBeInTheDocument()
  })

  it('should hide upgrade button when showUpgradeButton is false', () => {
    render(<UsageWarningAlert warning={mockWarning} showUpgradeButton={false} />)
    expect(screen.queryByRole('link', { name: /upgrade plan/i })).not.toBeInTheDocument()
  })

  it('should show User Limit Warning title', () => {
    render(<UsageWarningAlert warning={mockWarning} />)
    expect(screen.getByText('User Limit Warning')).toBeInTheDocument()
  })

  it('should show Exceeded for exceeded level', () => {
    const exceededWarning: UsageWarning = { ...mockWarning, level: 'exceeded' }
    render(<UsageWarningAlert warning={exceededWarning} />)
    expect(screen.getByText('User Limit Exceeded')).toBeInTheDocument()
  })

  it('should accept custom className', () => {
    render(<UsageWarningAlert warning={mockWarning} className="custom-alert" />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('custom-alert')
  })

  it('should have yellow styling for warning level', () => {
    render(<UsageWarningAlert warning={mockWarning} />)
    expect(screen.getByRole('alert')).toHaveClass('bg-yellow-50')
  })

  it('should have red styling for exceeded level', () => {
    const exceededWarning: UsageWarning = { ...mockWarning, level: 'exceeded' }
    render(<UsageWarningAlert warning={exceededWarning} />)
    expect(screen.getByRole('alert')).toHaveClass('bg-red-50')
  })

  it('should have orange styling for critical level', () => {
    const criticalWarning: UsageWarning = { ...mockWarning, level: 'critical' }
    render(<UsageWarningAlert warning={criticalWarning} />)
    expect(screen.getByRole('alert')).toHaveClass('bg-orange-50')
  })
})

describe('UsageWarningBanner Component', () => {
  it('should render without crashing', () => {
    expect(() => render(<UsageWarningBanner warnings={[mockWarning]} />)).not.toThrow()
  })

  it('should return null when no warnings', () => {
    const { container } = render(<UsageWarningBanner warnings={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('should display warning message', () => {
    render(<UsageWarningBanner warnings={[mockWarning]} />)
    expect(screen.getByText('You are approaching your user limit')).toBeInTheDocument()
  })

  it('should show single warning type name', () => {
    render(<UsageWarningBanner warnings={[mockWarning]} />)
    expect(screen.getByText('User Limit')).toBeInTheDocument()
  })

  it('should show count for multiple warnings', () => {
    const warnings: UsageWarning[] = [
      mockWarning,
      { ...mockWarning, type: 'jobs', message: 'Job limit warning' },
    ]
    render(<UsageWarningBanner warnings={warnings} />)
    expect(screen.getByText('2 Usage Warnings')).toBeInTheDocument()
  })

  it('should show most severe warning first', () => {
    const warnings: UsageWarning[] = [
      { ...mockWarning, level: 'warning' },
      { ...mockWarning, type: 'jobs', level: 'exceeded', message: 'Job limit exceeded' },
    ]
    render(<UsageWarningBanner warnings={warnings} />)
    expect(screen.getByText('Job limit exceeded')).toBeInTheDocument()
  })

  it('should have upgrade link', () => {
    render(<UsageWarningBanner warnings={[mockWarning]} />)
    expect(screen.getByRole('link', { name: /upgrade/i })).toHaveAttribute('href', '/settings/billing')
  })

  it('should accept custom className', () => {
    const { container } = render(<UsageWarningBanner warnings={[mockWarning]} className="custom-banner" />)
    expect(container.firstChild).toHaveClass('custom-banner')
  })
})

describe('UsageMeter Component', () => {
  it('should render without crashing', () => {
    expect(() => render(<UsageMeter label="Users" current={5} limit={10} />)).not.toThrow()
  })

  it('should display label', () => {
    render(<UsageMeter label="Team Members" current={5} limit={10} />)
    expect(screen.getByText('Team Members')).toBeInTheDocument()
  })

  it('should display current and limit', () => {
    render(<UsageMeter label="Users" current={5} limit={10} />)
    expect(screen.getByText('5 / 10')).toBeInTheDocument()
  })

  it('should display unit when provided', () => {
    render(<UsageMeter label="Storage" current={5} limit={10} unit=" GB" />)
    expect(screen.getByText('5 GB / 10 GB')).toBeInTheDocument()
  })

  it('should display Unlimited when limit is null', () => {
    render(<UsageMeter label="Users" current={5} limit={null} />)
    expect(screen.getByText('5 / Unlimited')).toBeInTheDocument()
  })

  it('should accept custom className', () => {
    const { container } = render(<UsageMeter label="Users" current={5} limit={10} className="custom-meter" />)
    expect(container.firstChild).toHaveClass('custom-meter')
  })

  it('should have red color for exceeded usage', () => {
    render(<UsageMeter label="Users" current={15} limit={10} />)
    expect(screen.getByText('15 / 10')).toHaveClass('text-red-600')
  })

  it('should have orange color for critical usage', () => {
    render(<UsageMeter label="Users" current={96} limit={100} />)
    expect(screen.getByText('96 / 100')).toHaveClass('text-orange-600')
  })

  it('should have yellow color for warning usage', () => {
    render(<UsageMeter label="Users" current={85} limit={100} />)
    expect(screen.getByText('85 / 100')).toHaveClass('text-yellow-600')
  })
})

describe('UsageOverview Component', () => {
  const stats = {
    usersCount: 5,
    jobsThisMonth: 100,
    storageUsedMb: 2048,
  }

  const limits = {
    maxUsers: 10,
    maxJobsPerMonth: 500,
    maxStorageGb: 10,
  }

  it('should render without crashing', () => {
    expect(() => render(<UsageOverview stats={stats} limits={limits} />)).not.toThrow()
  })

  it('should display Team Members meter', () => {
    render(<UsageOverview stats={stats} limits={limits} />)
    expect(screen.getByText('Team Members')).toBeInTheDocument()
  })

  it('should display Jobs This Month meter', () => {
    render(<UsageOverview stats={stats} limits={limits} />)
    expect(screen.getByText('Jobs This Month')).toBeInTheDocument()
  })

  it('should display Storage meter', () => {
    render(<UsageOverview stats={stats} limits={limits} />)
    expect(screen.getByText('Storage')).toBeInTheDocument()
  })

  it('should accept custom className', () => {
    const { container } = render(<UsageOverview stats={stats} limits={limits} className="custom-overview" />)
    expect(container.firstChild).toHaveClass('custom-overview')
  })

  it('should convert storage from MB to GB', () => {
    render(<UsageOverview stats={stats} limits={limits} />)
    // 2048 MB = 2 GB
    expect(screen.getByText('2 GB / 10 GB')).toBeInTheDocument()
  })
})
