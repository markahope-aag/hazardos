import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SmsService } from '@/lib/services/sms-service';
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit';

// This endpoint should be called by a cron job (e.g., Vercel Cron) every hour
// Configure in vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/appointment-reminders",
//     "schedule": "0 * * * *"
//   }]
// }

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting (use auth type for cron jobs - 10/min is plenty)
    const rateLimitResponse = await applyUnifiedRateLimit(request, 'auth');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Also allow Vercel cron requests
      const vercelCronHeader = request.headers.get('x-vercel-cron');
      if (!vercelCronHeader) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const supabase = await createClient();

    // Get all organizations with SMS enabled and appointment reminders enabled
    const { data: orgsWithSms } = await supabase
      .from('organization_sms_settings')
      .select('organization_id, appointment_reminder_hours')
      .eq('sms_enabled', true)
      .eq('appointment_reminders_enabled', true);

    if (!orgsWithSms?.length) {
      return NextResponse.json({ sent: 0, failed: 0, message: 'No organizations with SMS enabled' });
    }

    let sent = 0;
    let failed = 0;
    const errors: Array<{ jobId: string; error: string }> = [];

    for (const org of orgsWithSms) {
      // Calculate time window for reminders
      const reminderHours = org.appointment_reminder_hours || 24;
      const windowStart = new Date();
      windowStart.setHours(windowStart.getHours() + reminderHours);
      const windowEnd = new Date(windowStart);
      windowEnd.setHours(windowEnd.getHours() + 1);

      // Get jobs in reminder window that haven't been reminded yet
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('organization_id', org.organization_id)
        .eq('status', 'scheduled')
        .gte('scheduled_start', windowStart.toISOString())
        .lt('scheduled_start', windowEnd.toISOString())
        .is('reminder_sent_at', null);

      for (const job of jobs || []) {
        try {
          const result = await SmsService.sendAppointmentReminder(job.id);

          if (result) {
            // Mark job as reminded
            await supabase
              .from('jobs')
              .update({ reminder_sent_at: new Date().toISOString() })
              .eq('id', job.id);

            sent++;
          }
        } catch (error) {
          console.error(`Failed to send reminder for job ${job.id}:`, error);
          errors.push({
            jobId: job.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          failed++;
        }
      }
    }

    return NextResponse.json({
      sent,
      failed,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
