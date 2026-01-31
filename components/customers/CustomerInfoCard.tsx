import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Phone, MapPin, Calendar, User, Building } from 'lucide-react'
import { format } from 'date-fns'
import CustomerStatusBadge from './CustomerStatusBadge'
import type { Customer } from '@/types/database'

interface CustomerInfoCardProps {
  customer: Customer
}

export default function CustomerInfoCard({ customer }: CustomerInfoCardProps) {
  const hasAddress = customer.address_line1 || customer.city || customer.state || customer.zip

  const formatAddress = () => {
    const parts = []
    if (customer.address_line1) parts.push(customer.address_line1)
    if (customer.address_line2) parts.push(customer.address_line2)
    
    const cityStateZip = [customer.city, customer.state, customer.zip]
      .filter(Boolean)
      .join(', ')
    if (cityStateZip) parts.push(cityStateZip)
    
    return parts.join('\n')
  }

  const getSourceLabel = (source: string | null) => {
    if (!source) return 'Unknown'
    return source.charAt(0).toUpperCase() + source.slice(1)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {customer.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-gray-400" />
              <div>
                <a 
                  href={`mailto:${customer.email}`}
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {customer.email}
                </a>
              </div>
            </div>
          )}
          
          {customer.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-gray-400" />
              <div>
                <a 
                  href={`tel:${customer.phone}`}
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {customer.phone}
                </a>
              </div>
            </div>
          )}

          {customer.company_name && (
            <div className="flex items-center gap-3">
              <Building className="h-4 w-4 text-gray-400" />
              <div className="text-gray-900">{customer.company_name}</div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div className="text-sm text-gray-600">
              Customer since {format(new Date(customer.created_at), 'MMMM d, yyyy')}
            </div>
          </div>

          {!customer.email && !customer.phone && (
            <div className="text-sm text-gray-500 italic">
              No contact information available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Address & Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Address & Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasAddress ? (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
              <div className="whitespace-pre-line text-gray-900">
                {formatAddress()}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-gray-400" />
              <div className="text-sm text-gray-500 italic">
                No address on file
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Status</div>
              <CustomerStatusBadge status={customer.status} />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Source</div>
              <div className="text-sm text-gray-900">{getSourceLabel(customer.source)}</div>
            </div>
          </div>

          {customer.marketing_consent && (
            <div className="pt-2 border-t">
              <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                ✓ Consented to marketing communications
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}