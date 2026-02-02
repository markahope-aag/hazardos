import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function checkJobsSchema() {
  // Get one row from jobs to see its structure
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .limit(1)

  if (error) {
    console.log('Error:', error.message)
    return
  }

  if (data && data.length > 0) {
    console.log('Jobs columns:', Object.keys(data[0]).join(', '))
  } else {
    console.log('Jobs table exists but is empty')

    // Try to get column info via a different approach
    const { data: sample } = await supabase
      .from('jobs')
      .select()
      .limit(0)

    console.log('Query successful - table exists')
  }
}

checkJobsSchema()
