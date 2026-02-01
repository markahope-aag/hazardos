import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SegmentationService } from '@/lib/services/segmentation-service';
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler';

export async function GET(
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
    const segment = await SegmentationService.get(id);

    if (!segment) {
      throw new SecureError('NOT_FOUND', 'Segment not found');
    }

    return NextResponse.json({ segment });
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new SecureError('UNAUTHORIZED');
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, rules, is_active } = body;

    const segment = await SegmentationService.update(id, {
      name,
      description,
      rules,
      is_active,
    });

    return NextResponse.json({ segment });
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}

export async function DELETE(
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
    await SegmentationService.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}
