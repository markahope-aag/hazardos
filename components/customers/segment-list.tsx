'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Users, RefreshCw, Trash2, Edit, Mail, Hexagon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import type { CustomerSegment } from '@/types/integrations';

interface SegmentListProps {
  segments: CustomerSegment[];
}

export function SegmentList({ segments }: SegmentListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isCalculating, setIsCalculating] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleCalculate = async (segmentId: string) => {
    setIsCalculating(segmentId);
    try {
      const response = await fetch(`/api/segments/${segmentId}/calculate`, {
        method: 'POST',
      });
      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'Calculation Complete',
          description: `Segment has ${result.member_count} members`,
        });
        router.refresh();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Calculation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsCalculating(null);
    }
  };

  const handleDelete = async (segmentId: string) => {
    if (!confirm('Are you sure you want to delete this segment?')) return;

    setIsDeleting(segmentId);
    try {
      const response = await fetch(`/api/segments/${segmentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Segment deleted' });
        router.refresh();
      } else {
        const result = await response.json();
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSyncMailchimp = async (segmentId: string) => {
    try {
      const response = await fetch(`/api/segments/${segmentId}/sync/mailchimp`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Segment synced to Mailchimp' });
        router.refresh();
      } else {
        const result = await response.json();
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleSyncHubSpot = async (segmentId: string) => {
    try {
      const response = await fetch(`/api/segments/${segmentId}/sync/hubspot`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Segment synced to HubSpot' });
        router.refresh();
      } else {
        const result = await response.json();
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  if (segments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No segments yet</h3>
          <p className="text-muted-foreground text-center mb-4">
            Create your first segment to start targeting customers
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Segments</CardTitle>
        <CardDescription>
          {segments.length} segment{segments.length !== 1 ? 's' : ''} created
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Last Calculated</TableHead>
              <TableHead>Synced To</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {segments.map((segment) => (
              <TableRow key={segment.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{segment.name}</p>
                    {segment.description && (
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {segment.description}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={segment.segment_type === 'dynamic' ? 'default' : 'secondary'}>
                    {segment.segment_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {segment.member_count.toLocaleString()}
                  </div>
                </TableCell>
                <TableCell>
                  {segment.last_calculated_at
                    ? formatDistanceToNow(new Date(segment.last_calculated_at), { addSuffix: true })
                    : 'Never'
                  }
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {segment.mailchimp_synced_at && (
                      <Badge variant="outline" className="text-xs">
                        <Mail className="h-3 w-3 mr-1" />
                        MC
                      </Badge>
                    )}
                    {segment.hubspot_synced_at && (
                      <Badge variant="outline" className="text-xs">
                        <Hexagon className="h-3 w-3 mr-1" />
                        HS
                      </Badge>
                    )}
                    {!segment.mailchimp_synced_at && !segment.hubspot_synced_at && (
                      <span className="text-muted-foreground text-sm">None</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/customers/segments/${segment.id}`)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleCalculate(segment.id)}
                        disabled={isCalculating === segment.id}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isCalculating === segment.id ? 'animate-spin' : ''}`} />
                        Recalculate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSyncMailchimp(segment.id)}>
                        <Mail className="h-4 w-4 mr-2" />
                        Sync to Mailchimp
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSyncHubSpot(segment.id)}>
                        <Hexagon className="h-4 w-4 mr-2" />
                        Sync to HubSpot
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(segment.id)}
                        disabled={isDeleting === segment.id}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
