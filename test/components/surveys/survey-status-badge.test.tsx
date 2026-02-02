import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SurveyStatusBadge, HazardTypeBadge } from '@/components/surveys/survey-status-badge'

describe('SurveyStatusBadge Component', () => {
  it('should render without crashing', () => {
    expect(() => render(<SurveyStatusBadge status="draft" />)).not.toThrow()
  })

  it('should render draft status', () => {
    render(<SurveyStatusBadge status="draft" />)
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('should render scheduled status', () => {
    render(<SurveyStatusBadge status="scheduled" />)
    expect(screen.getByText('Scheduled')).toBeInTheDocument()
  })

  it('should render in_progress status', () => {
    render(<SurveyStatusBadge status="in_progress" />)
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('should render submitted status', () => {
    render(<SurveyStatusBadge status="submitted" />)
    expect(screen.getByText('Submitted')).toBeInTheDocument()
  })

  it('should render reviewed status', () => {
    render(<SurveyStatusBadge status="reviewed" />)
    expect(screen.getByText('Reviewed')).toBeInTheDocument()
  })

  it('should render estimated status', () => {
    render(<SurveyStatusBadge status="estimated" />)
    expect(screen.getByText('Estimated')).toBeInTheDocument()
  })

  it('should render quoted status', () => {
    render(<SurveyStatusBadge status="quoted" />)
    expect(screen.getByText('Quoted')).toBeInTheDocument()
  })

  it('should render completed status', () => {
    render(<SurveyStatusBadge status="completed" />)
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('should render cancelled status', () => {
    render(<SurveyStatusBadge status="cancelled" />)
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
  })

  it('should handle unknown status gracefully', () => {
    render(<SurveyStatusBadge status="unknown_status" />)
    expect(screen.getByText('unknown_status')).toBeInTheDocument()
  })

  it('should show icon by default', () => {
    const { container } = render(<SurveyStatusBadge status="draft" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('should hide icon when showIcon is false', () => {
    const { container } = render(<SurveyStatusBadge status="draft" showIcon={false} />)
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })

  it('should accept custom className', () => {
    render(<SurveyStatusBadge status="draft" className="custom-badge" />)
    expect(screen.getByText('Draft').closest('.custom-badge')).toBeInTheDocument()
  })

  it('should have correct styling for draft', () => {
    render(<SurveyStatusBadge status="draft" />)
    expect(screen.getByText('Draft')).toHaveClass('bg-gray-100')
    expect(screen.getByText('Draft')).toHaveClass('text-gray-700')
  })

  it('should have correct styling for scheduled', () => {
    render(<SurveyStatusBadge status="scheduled" />)
    expect(screen.getByText('Scheduled')).toHaveClass('bg-blue-100')
    expect(screen.getByText('Scheduled')).toHaveClass('text-blue-700')
  })

  it('should have correct styling for in_progress', () => {
    render(<SurveyStatusBadge status="in_progress" />)
    expect(screen.getByText('In Progress')).toHaveClass('bg-indigo-100')
    expect(screen.getByText('In Progress')).toHaveClass('text-indigo-700')
  })

  it('should have correct styling for completed', () => {
    render(<SurveyStatusBadge status="completed" />)
    expect(screen.getByText('Completed')).toHaveClass('bg-emerald-100')
    expect(screen.getByText('Completed')).toHaveClass('text-emerald-700')
  })

  it('should have correct styling for cancelled', () => {
    render(<SurveyStatusBadge status="cancelled" />)
    expect(screen.getByText('Cancelled')).toHaveClass('bg-red-100')
    expect(screen.getByText('Cancelled')).toHaveClass('text-red-700')
  })
})

describe('HazardTypeBadge Component', () => {
  it('should render without crashing', () => {
    expect(() => render(<HazardTypeBadge hazardType="asbestos" />)).not.toThrow()
  })

  it('should render asbestos type', () => {
    render(<HazardTypeBadge hazardType="asbestos" />)
    expect(screen.getByText('Asbestos')).toBeInTheDocument()
  })

  it('should render mold type', () => {
    render(<HazardTypeBadge hazardType="mold" />)
    expect(screen.getByText('Mold')).toBeInTheDocument()
  })

  it('should render lead type', () => {
    render(<HazardTypeBadge hazardType="lead" />)
    expect(screen.getByText('Lead')).toBeInTheDocument()
  })

  it('should render vermiculite type', () => {
    render(<HazardTypeBadge hazardType="vermiculite" />)
    expect(screen.getByText('Vermiculite')).toBeInTheDocument()
  })

  it('should render other type', () => {
    render(<HazardTypeBadge hazardType="other" />)
    expect(screen.getByText('Other')).toBeInTheDocument()
  })

  it('should handle unknown type gracefully', () => {
    render(<HazardTypeBadge hazardType="unknown" />)
    expect(screen.getByText('Other')).toBeInTheDocument()
  })

  it('should accept custom className', () => {
    render(<HazardTypeBadge hazardType="asbestos" className="custom-hazard" />)
    expect(screen.getByText('Asbestos').closest('.custom-hazard')).toBeInTheDocument()
  })

  it('should have correct styling for asbestos', () => {
    render(<HazardTypeBadge hazardType="asbestos" />)
    expect(screen.getByText('Asbestos')).toHaveClass('bg-red-100')
    expect(screen.getByText('Asbestos')).toHaveClass('text-red-700')
  })

  it('should have correct styling for mold', () => {
    render(<HazardTypeBadge hazardType="mold" />)
    expect(screen.getByText('Mold')).toHaveClass('bg-green-100')
    expect(screen.getByText('Mold')).toHaveClass('text-green-700')
  })

  it('should have correct styling for lead', () => {
    render(<HazardTypeBadge hazardType="lead" />)
    expect(screen.getByText('Lead')).toHaveClass('bg-orange-100')
    expect(screen.getByText('Lead')).toHaveClass('text-orange-700')
  })

  it('should have correct styling for vermiculite', () => {
    render(<HazardTypeBadge hazardType="vermiculite" />)
    expect(screen.getByText('Vermiculite')).toHaveClass('bg-purple-100')
    expect(screen.getByText('Vermiculite')).toHaveClass('text-purple-700')
  })
})
