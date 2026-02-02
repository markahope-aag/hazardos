import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, User, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import type { Customer } from '@/types/database'

interface CustomerActivityFeedProps {
  customer: Customer
}

export default function CustomerActivityFeed({ customer }: CustomerActivityFeedProps) {
  // For now, we'll show basic activity. In the future, this could include:
  // - Survey creation/completion
  // - Estimate generation
  // - Job scheduling
  // - Payment processing
  // - Communication logs
  
  const activities = [
    {
      id: 1,
      type: 'created',
      description: 'Customer record created',
      timestamp: customer.created_at,
      icon: User,
      user: customer.created_by ? 'System' : 'System' // In the future, fetch actual user name
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = activity.icon
            return (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <Icon className="h-4 w-4 text-gray-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900">{activity.description}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(activity.timestamp), 'MMM d, yyyy \'at\' h:mm a')}
                    {activity.user && (
                      <>
                        <span>•</span>
                        <span>by {activity.user}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600 text-center">
            <Activity className="h-4 w-4 inline mr-2" />
            Future activity will appear here
          </div>
          <div className="text-xs text-gray-500 text-center mt-1">
            Surveys, estimates, jobs, and communications
          </div>
        </div>
      </CardContent>
    </Card>
  )
}