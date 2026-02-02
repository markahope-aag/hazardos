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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Key, Trash2, Clock, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import type { ApiKey, ApiKeyScope } from '@/types/integrations';

interface ApiKeyListProps {
  apiKeys: ApiKey[];
  availableScopes: Array<{ value: ApiKeyScope; label: string; description: string }>;
}

export function ApiKeyList({ apiKeys, availableScopes }: ApiKeyListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [revokeKey, setRevokeKey] = useState<ApiKey | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const getScopeLabel = (scope: ApiKeyScope): string => {
    const found = availableScopes.find(s => s.value === scope);
    return found?.label || scope;
  };

  const handleRevoke = async () => {
    if (!revokeKey) return;

    setIsRevoking(true);
    try {
      const response = await fetch(`/api/api-keys/${revokeKey.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'API key revoked' });
        router.refresh();
      } else {
        throw new Error('Failed to revoke');
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to revoke API key',
        variant: 'destructive',
      });
    } finally {
      setIsRevoking(false);
      setRevokeKey(null);
    }
  };

  if (apiKeys.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Key className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No API keys</h3>
          <p className="text-muted-foreground text-center mb-4">
            Create an API key to access your data programmatically
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Active API Keys</CardTitle>
          <CardDescription>
            {apiKeys.length} API key{apiKeys.length !== 1 ? 's' : ''} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Rate Limit</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((apiKey) => (
                <TableRow key={apiKey.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{apiKey.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {apiKey.key_prefix}...
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {apiKey.scopes.slice(0, 2).map((scope) => (
                        <Badge key={scope} variant="outline" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          {getScopeLabel(scope)}
                        </Badge>
                      ))}
                      {apiKey.scopes.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{apiKey.scopes.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {apiKey.last_used_at
                        ? formatDistanceToNow(new Date(apiKey.last_used_at), { addSuffix: true })
                        : 'Never'
                      }
                    </div>
                  </TableCell>
                  <TableCell>
                    {apiKey.rate_limit.toLocaleString()}/hr
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRevokeKey(apiKey)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!revokeKey} onOpenChange={() => setRevokeKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke &quot;{revokeKey?.name}&quot;? Any applications using this key will immediately lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={isRevoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevoking ? 'Revoking...' : 'Revoke Key'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
