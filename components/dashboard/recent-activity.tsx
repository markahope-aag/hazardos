import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface ActivityEntry {
  id: string;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_name: string | null;
  created_at: string;
}

const actionIcons: Record<string, string> = {
  created: '+',
  updated: '~',
  deleted: '-',
  status_changed: '*',
  signed: 'S',
  paid: '$',
  sent: '>',
};

export async function RecentActivity() {
  const supabase = await createClient();

  const { data: activities } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(8);

  const typedActivities = (activities || []) as ActivityEntry[];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {typedActivities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        ) : (
          <div className="space-y-4">
            {typedActivities.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {activity.user_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{activity.user_name || 'System'}</span>
                    {' '}
                    <span className="text-muted-foreground">
                      {actionIcons[activity.action] || '*'} {activity.action}
                    </span>
                    {' '}
                    <span className="font-medium">{activity.entity_type}</span>
                    {activity.entity_name && (
                      <span className="text-muted-foreground"> &quot;{activity.entity_name}&quot;</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
