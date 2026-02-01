import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SegmentationService } from '@/lib/services/segmentation-service';
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new SecureError('UNAUTHORIZED');
    }

    const { id } = await params;
    const memberCount = await SegmentationService.calculateMembers(id);

    return NextResponse.json({ success: true, member_count: memberCount });
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}
