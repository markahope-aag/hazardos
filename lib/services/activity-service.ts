import { createClient } from '@/lib/supabase/server';

export interface LogActivityInput {
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  description?: string;
}

export interface ActivityLogEntry {
  id: string;
  organization_id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  description: string | null;
  created_at: string;
}

export async function logActivity(input: LogActivityInput): Promise<void> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, full_name')
    .eq('id', user.id)
    .single();

  if (!profile) return;

  await supabase.from('activity_log').insert({
    organization_id: profile.organization_id,
    user_id: user.id,
    user_name: profile.full_name,
    action: input.action,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    entity_name: input.entity_name,
    old_values: input.old_values,
    new_values: input.new_values,
    description: input.description,
  });
}

export async function getRecentActivity(limit: number = 20): Promise<ActivityLogEntry[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data || []) as ActivityLogEntry[];
}

export async function getEntityActivity(entityType: string, entityId: string): Promise<ActivityLogEntry[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('activity_log')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  return (data || []) as ActivityLogEntry[];
}
