'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  Building2,
} from 'lucide-react'
import type { PublicSurveyView, SubmitFeedbackInput } from '@/types/feedback'

export default function FeedbackSurveyPage() {
  const params = useParams()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [survey, setSurvey] = useState<PublicSurveyView | null>(null)

  // Form state
  const [ratings, setRatings] = useState({
    overall: 0,
    quality: 0,
    communication: 0,
    timeliness: 0,
    value: 0,
  })
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null)
  const [npsScore, setNpsScore] = useState<number | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [improvementSuggestions, setImprovementSuggestions] = useState('')
  const [testimonialText, setTestimonialText] = useState('')
  const [testimonialPermission, setTestimonialPermission] = useState(false)

  // Fetch survey data
  useEffect(() => {
    async function fetchSurvey() {
      try {
        const res = await fetch(`/api/feedback/${token}`)
        if (!res.ok) {
          if (res.status === 404) {
            setError('Survey not found or has expired')
          } else {
            setError('Failed to load survey')
          }
          return
        }

        const data = await res.json()
        setSurvey(data)

        // If already completed, show results
        if (data.status === 'completed') {
          setSubmitted(true)
          setRatings({
            overall: data.rating_overall || 0,
            quality: data.rating_quality || 0,
            communication: data.rating_communication || 0,
            timeliness: data.rating_timeliness || 0,
            value: data.rating_value || 0,
          })
          setWouldRecommend(data.would_recommend)
          setNpsScore(data.likelihood_to_recommend)
          setFeedbackText(data.feedback_text || '')
          setTestimonialText(data.testimonial_text || '')
        }
      } catch {
        setError('Failed to load survey')
      } finally {
        setLoading(false)
      }
    }

    fetchSurvey()
  }, [token])

  async function handleSubmit() {
    if (ratings.overall === 0) {
      setError('Please provide an overall rating')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const input: SubmitFeedbackInput = {
        rating_overall: ratings.overall,
        rating_quality: ratings.quality || undefined,
        rating_communication: ratings.communication || undefined,
        rating_timeliness: ratings.timeliness || undefined,
        rating_value: ratings.value || undefined,
        would_recommend: wouldRecommend ?? undefined,
        likelihood_to_recommend: npsScore ?? undefined,
        feedback_text: feedbackText || undefined,
        improvement_suggestions: improvementSuggestions || undefined,
        testimonial_text: testimonialText || undefined,
        testimonial_permission: testimonialPermission,
      }

      const res = await fetch(`/api/feedback/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit feedback')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback')
    } finally {
      setSubmitting(false)
    }
  }

  // Star rating component
  function StarRating({
    value,
    onChange,
    disabled,
  }: {
    value: number
    onChange: (v: number) => void
    disabled?: boolean
  }) {
    const [hover, setHover] = useState(0)

    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            className={cn(
              'p-1 transition-colors',
              disabled ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            )}
            onClick={() => !disabled && onChange(star)}
            onMouseEnter={() => !disabled && setHover(star)}
            onMouseLeave={() => !disabled && setHover(0)}
          >
            <Star
              className={cn(
                'w-8 h-8 transition-colors',
                (hover || value) >= star
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              )}
            />
          </button>
        ))}
      </div>
    )
  }

  // NPS scale component
  function NPSScale({
    value,
    onChange,
    disabled,
  }: {
    value: number | null
    onChange: (v: number) => void
    disabled?: boolean
  }) {
    return (
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
          <button
            key={score}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(score)}
            className={cn(
              'w-10 h-10 rounded-lg border-2 font-medium transition-all',
              value === score
                ? score <= 6
                  ? 'bg-red-500 border-red-500 text-white'
                  : score <= 8
                  ? 'bg-yellow-500 border-yellow-500 text-white'
                  : 'bg-green-500 border-green-500 text-white'
                : 'border-gray-200 hover:border-gray-400',
              disabled && 'cursor-default'
            )}
          >
            {score}
          </button>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error && !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Survey Not Available</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
            <p className="text-muted-foreground mb-4">
              Your feedback has been submitted successfully.
              We appreciate you taking the time to share your experience.
            </p>
            {testimonialPermission && testimonialText && (
              <p className="text-sm text-green-600">
                Thank you for allowing us to use your testimonial!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          {survey?.organization_logo ? (
            <div className="relative h-12 w-32 mx-auto mb-4">
              <Image
                src={survey.organization_logo}
                alt={survey.organization_name}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          ) : (
            <Building2 className="w-12 h-12 text-primary mx-auto mb-4" />
          )}
          <h1 className="text-2xl font-bold">{survey?.organization_name}</h1>
          <p className="text-muted-foreground mt-2">
            How was your experience with Job #{survey?.job_number}?
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Overall Rating */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Experience *</CardTitle>
            <CardDescription>How would you rate your overall experience?</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <StarRating
              value={ratings.overall}
              onChange={(v) => setRatings({ ...ratings, overall: v })}
            />
          </CardContent>
        </Card>

        {/* Detailed Ratings */}
        <Card>
          <CardHeader>
            <CardTitle>Rate Different Aspects</CardTitle>
            <CardDescription>Optional but helpful for us to improve</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="mb-2 block">Quality of Work</Label>
              <StarRating
                value={ratings.quality}
                onChange={(v) => setRatings({ ...ratings, quality: v })}
              />
            </div>
            <div>
              <Label className="mb-2 block">Communication</Label>
              <StarRating
                value={ratings.communication}
                onChange={(v) => setRatings({ ...ratings, communication: v })}
              />
            </div>
            <div>
              <Label className="mb-2 block">Timeliness</Label>
              <StarRating
                value={ratings.timeliness}
                onChange={(v) => setRatings({ ...ratings, timeliness: v })}
              />
            </div>
            <div>
              <Label className="mb-2 block">Value for Money</Label>
              <StarRating
                value={ratings.value}
                onChange={(v) => setRatings({ ...ratings, value: v })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Would Recommend */}
        <Card>
          <CardHeader>
            <CardTitle>Would you recommend us?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 justify-center">
              <Button
                variant={wouldRecommend === true ? 'default' : 'outline'}
                size="lg"
                onClick={() => setWouldRecommend(true)}
                className="flex-1 max-w-[150px]"
              >
                <ThumbsUp className="w-5 h-5 mr-2" />
                Yes
              </Button>
              <Button
                variant={wouldRecommend === false ? 'destructive' : 'outline'}
                size="lg"
                onClick={() => setWouldRecommend(false)}
                className="flex-1 max-w-[150px]"
              >
                <ThumbsDown className="w-5 h-5 mr-2" />
                No
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* NPS Score */}
        <Card>
          <CardHeader>
            <CardTitle>How likely are you to recommend us?</CardTitle>
            <CardDescription>0 = Not likely at all, 10 = Extremely likely</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <NPSScale value={npsScore} onChange={setNpsScore} />
          </CardContent>
        </Card>

        {/* Feedback Text */}
        <Card>
          <CardHeader>
            <CardTitle>Tell us more</CardTitle>
            <CardDescription>Share your experience with us</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="feedback">What did you like about our service?</Label>
              <Textarea
                id="feedback"
                placeholder="Share what went well..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="improvements">How could we improve?</Label>
              <Textarea
                id="improvements"
                placeholder="Any suggestions for improvement..."
                value={improvementSuggestions}
                onChange={(e) => setImprovementSuggestions(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Testimonial */}
        <Card>
          <CardHeader>
            <CardTitle>Leave a Testimonial</CardTitle>
            <CardDescription>
              Would you like to share a testimonial we can use on our website?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Write a testimonial that we can share with others..."
              value={testimonialText}
              onChange={(e) => setTestimonialText(e.target.value)}
              rows={4}
            />
            {testimonialText && (
              <div className="flex items-start gap-2">
                <Checkbox
                  id="testimonial-permission"
                  checked={testimonialPermission}
                  onCheckedChange={(checked) => setTestimonialPermission(checked as boolean)}
                />
                <label
                  htmlFor="testimonial-permission"
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  I give permission to use this testimonial on the company website and marketing materials,
                  with my name displayed as "{survey?.customer_name || 'Customer'}"
                </label>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={submitting || ratings.overall === 0}
          size="lg"
          className="w-full"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Submit Feedback
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Your feedback is confidential and will help us improve our services.
        </p>
      </div>
    </div>
  )
}
