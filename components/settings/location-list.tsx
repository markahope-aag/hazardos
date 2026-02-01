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
import { MoreHorizontal, MapPin, Trash2, Edit, Building2, Star } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import type { Location } from '@/types/integrations';

interface LocationListProps {
  locations: Location[];
}

export function LocationList({ locations }: LocationListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    setIsDeleting(locationId);
    try {
      const response = await fetch(`/api/locations/${locationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Location deleted' });
        router.refresh();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete location',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const formatAddress = (location: Location): string => {
    const parts = [
      location.address_line1,
      location.city,
      location.state,
      location.zip,
    ].filter(Boolean);
    return parts.join(', ') || 'No address';
  };

  if (locations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No locations</h3>
          <p className="text-muted-foreground text-center mb-4">
            Add your first location to get started with multi-location management
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Locations</CardTitle>
        <CardDescription>
          {locations.length} location{locations.length !== 1 ? 's' : ''} configured
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map((location) => (
              <TableRow key={location.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {location.name}
                        {location.is_headquarters && (
                          <Star className="h-3 w-3 inline ml-1 text-yellow-500 fill-yellow-500" />
                        )}
                      </p>
                      {location.code && (
                        <p className="text-sm text-muted-foreground">{location.code}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-sm">{formatAddress(location)}</p>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {location.phone && <p>{location.phone}</p>}
                    {location.email && <p className="text-muted-foreground">{location.email}</p>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={location.is_active ? 'default' : 'secondary'}>
                    {location.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/settings/locations/${location.id}`)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(location.id)}
                        disabled={isDeleting === location.id || location.is_headquarters}
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
