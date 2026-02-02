import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import NewSiteSurveyPage from '@/app/(dashboard)/site-surveys/new/page'

// Mock the SimpleSiteSurveyForm component
vi.mock('@/components/assessments/simple-site-survey-form', () => ({
  SimpleSiteSurveyForm: () => <div data-testid="site-survey-form">Site Survey Form</div>,
}))

describe('NewSiteSurveyPage', () => {
  it('renders without crashing', () => {
    expect(() => render(<NewSiteSurveyPage />)).not.toThrow()
  })

  it('displays page heading', () => {
    render(<NewSiteSurveyPage />)
    expect(screen.getByText('New Site Survey')).toBeInTheDocument()
  })

  it('displays page description', () => {
    render(<NewSiteSurveyPage />)
    expect(screen.getByText('Create a new field site survey')).toBeInTheDocument()
  })

  it('has back link to site-surveys', () => {
    render(<NewSiteSurveyPage />)
    const backLink = screen.getByRole('link', { name: /back/i })
    expect(backLink).toHaveAttribute('href', '/site-surveys')
  })

  it('renders the SimpleSiteSurveyForm component', () => {
    render(<NewSiteSurveyPage />)
    expect(screen.getByTestId('site-survey-form')).toBeInTheDocument()
  })
})
