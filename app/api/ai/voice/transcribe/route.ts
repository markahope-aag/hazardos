import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { VoiceService, TranscriptionContext } from '@/lib/services/voice-service';
import { SecureError, createSecureErrorResponse } from '@/lib/utils/secure-error-handler';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new SecureError('UNAUTHORIZED');
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      throw new SecureError('NOT_FOUND', 'Organization not found');
    }

    // Parse the request - could be JSON with base64 or FormData with file
    const contentType = request.headers.get('content-type') || '';

    let audioBuffer: Buffer;
    let audioFormat: string;
    let context: TranscriptionContext | undefined;

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData with audio file
      const formData = await request.formData();
      const file = formData.get('audio') as File | null;

      if (!file) {
        throw new SecureError('VALIDATION_ERROR', 'Audio file is required');
      }

      const arrayBuffer = await file.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuffer);

      // Extract format from file type or name
      audioFormat = file.type.split('/')[1] || file.name.split('.').pop() || 'webm';

      // Parse context from form data
      const contextJson = formData.get('context') as string | null;
      if (contextJson) {
        try {
          context = JSON.parse(contextJson);
        } catch {
          // Ignore invalid JSON
        }
      }
    } else {
      // Handle JSON with base64 audio
      const body = await request.json();

      if (!body.audio) {
        throw new SecureError('VALIDATION_ERROR', 'Audio data is required');
      }

      // Decode base64 audio
      audioBuffer = Buffer.from(body.audio, 'base64');
      audioFormat = body.format || 'webm';
      context = body.context;
    }

    // Validate context type if provided
    if (context?.context_type) {
      const validContextTypes = ['site_survey_note', 'job_note', 'customer_note'];
      if (!validContextTypes.includes(context.context_type)) {
        throw new SecureError(
          'VALIDATION_ERROR',
          `Invalid context_type. Must be one of: ${validContextTypes.join(', ')}`
        );
      }
    }

    const transcription = await VoiceService.transcribe(
      profile.organization_id,
      user.id,
      audioBuffer,
      audioFormat,
      context
    );

    return NextResponse.json(transcription);
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}

// Get recent transcriptions
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new SecureError('UNAUTHORIZED');
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      throw new SecureError('NOT_FOUND', 'Organization not found');
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const userOnly = searchParams.get('user_only') === 'true';

    const transcriptions = await VoiceService.getRecentTranscriptions(
      profile.organization_id,
      userOnly ? user.id : undefined,
      limit
    );

    return NextResponse.json(transcriptions);
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}
