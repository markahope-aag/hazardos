'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LogoVertical } from '@/components/ui/logo'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { logger, formatError } from '@/lib/utils/logger'
import type { User } from '@supabase/supabase-js'

export default function OnboardPage() {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    organizationName: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
    licenseNumber: '',
  })

  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
    }
    getUser()
  }, [supabase, router])

  const formatPhoneNumber = (value: string): string => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
  }

  const handleInputChange = (field: string, value: string) => {
    if (field === 'phone') {
      value = formatPhoneNumber(value)
    }
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!user) {
        throw new Error('You must be logged in to create an organization')
      }

      // Create the organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: formData.organizationName,
          email: formData.email || user.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          license_number: formData.licenseNumber,
          status: 'active',
          subscription_tier: 'trial',
        })
        .select()
        .single()

      if (orgError) throw orgError

      // Update the user's profile with the organization
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          organization_id: org.id,
          role: 'tenant_owner',
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      toast({
        title: 'Organization Created!',
        description: 'Welcome to HazardOS. Redirecting to your dashboard...',
      })

      router.push('/')
      router.refresh()

    } catch (error) {
      logger.error(
        { 
          error: formatError(error, 'ONBOARDING_ERROR'),
          userId: user?.id
        },
        'Onboarding error'
      )
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred during onboarding',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <LogoVertical size="xl" />
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Welcome to HazardOS</h1>
          <p className="text-gray-600 mt-2">
            Set up your organization and start managing environmental remediation projects
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Your Organization</CardTitle>
            <CardDescription>
              Let's get your environmental remediation company set up on HazardOS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Organization Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Organization Information</h3>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="organizationName">Company Name *</Label>
                    <Input
                      id="organizationName"
                      value={formData.organizationName}
                      onChange={(e) => handleInputChange('organizationName', e.target.value)}
                      placeholder="Acme Environmental Services"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="licenseNumber">License Number</Label>
                    <Input
                      id="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                      placeholder="ENV-2024-001"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="123 Business Street"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="Denver"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder="CO"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input
                      id="zip"
                      value={formData.zip}
                      onChange={(e) => handleInputChange('zip', e.target.value)}
                      placeholder="80202"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="(303) 555-0123"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Company Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="info@company.com"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <Button type="submit" disabled={loading} size="lg">
                  {loading ? 'Creating Organization...' : 'Create Organization'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}