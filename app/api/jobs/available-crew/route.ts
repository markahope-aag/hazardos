import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JobsService } from '@/lib/services/jobs-service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }

    // Validate date format
    const checkDate = new Date(date)
    if (isNaN(checkDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    const crew = await JobsService.getAvailableCrew(date)

    return NextResponse.json(crew)
  } catch (error) {
    console.error('Available crew error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch available crew' },
      { status: 500 }
    )
  }
}
