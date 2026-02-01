'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import type { CustomerSegment, SegmentRule } from '@/types/integrations';

interface SegmentBuilderProps {
  segment?: CustomerSegment;
  availableFields: Array<{ value: string; label: string; type: string }>;
}

const OPERATORS_BY_TYPE: Record<string, Array<{ value: string; label: string }>> = {
  string: [
    { value: '=', label: 'equals' },
    { value: '!=', label: 'does not equal' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'ends_with', label: 'ends with' },
    { value: 'is_null', label: 'is empty' },
    { value: 'is_not_null', label: 'is not empty' },
  ],
  number: [
    { value: '=', label: 'equals' },
    { value: '!=', label: 'does not equal' },
    { value: '>', label: 'greater than' },
    { value: '<', label: 'less than' },
    { value: '>=', label: 'greater than or equal' },
    { value: '<=', label: 'less than or equal' },
    { value: 'is_null', label: 'is empty' },
    { value: 'is_not_null', label: 'is not empty' },
  ],
  date: [
    { value: '=', label: 'equals' },
    { value: '!=', label: 'does not equal' },
    { value: '>', label: 'after' },
    { value: '<', label: 'before' },
    { value: '>=', label: 'on or after' },
    { value: '<=', label: 'on or before' },
    { value: 'is_null', label: 'is empty' },
    { value: 'is_not_null', label: 'is not empty' },
  ],
};

export function SegmentBuilder({ segment, availableFields }: SegmentBuilderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState(segment?.name || '');
  const [description, setDescription] = useState(segment?.description || '');
  const [segmentType, setSegmentType] = useState<'dynamic' | 'static'>(
    segment?.segment_type || 'dynamic'
  );
  const [rules, setRules] = useState<SegmentRule[]>(
    segment?.rules || [{ field: 'status', operator: '=', value: 'active' }]
  );

  const addRule = () => {
    setRules([...rules, { field: 'status', operator: '=', value: '' }]);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, updates: Partial<SegmentRule>) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates };
    setRules(newRules);
  };

  const getFieldType = (fieldValue: string): string => {
    const field = availableFields.find((f) => f.value === fieldValue);
    return field?.type || 'string';
  };

  const getOperators = (fieldValue: string) => {
    const type = getFieldType(fieldValue);
    return OPERATORS_BY_TYPE[type] || OPERATORS_BY_TYPE.string;
  };

  const needsValue = (operator: string): boolean => {
    return !['is_null', 'is_not_null'].includes(operator);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Segment name is required',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const url = segment ? `/api/segments/${segment.id}` : '/api/segments';
      const method = segment ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          segment_type: segmentType,
          rules: segmentType === 'dynamic' ? rules : [],
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: segment ? 'Segment updated' : 'Segment created',
        });
        router.push('/customers/segments');
        router.refresh();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{segment ? 'Edit Segment' : 'Create Segment'}</CardTitle>
          <CardDescription>
            Define your segment criteria to target specific customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Segment Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., High Value Customers"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Segment Type</Label>
              <Select value={segmentType} onValueChange={(v) => setSegmentType(v as 'dynamic' | 'static')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dynamic">Dynamic (rule-based)</SelectItem>
                  <SelectItem value="static">Static (manually managed)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this segment"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {segmentType === 'dynamic' && (
        <Card>
          <CardHeader>
            <CardTitle>Segment Rules</CardTitle>
            <CardDescription>
              Customers matching ALL rules will be included in this segment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {rules.map((rule, index) => (
              <div key={index} className="flex items-start gap-4 p-4 border rounded-lg bg-muted/50">
                <div className="flex-1 grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Field</Label>
                    <Select
                      value={rule.field}
                      onValueChange={(v) => updateRule(index, { field: v, operator: '=', value: '' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableFields.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Operator</Label>
                    <Select
                      value={rule.operator}
                      onValueChange={(v) => updateRule(index, { operator: v as SegmentRule['operator'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getOperators(rule.field).map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {needsValue(rule.operator) && (
                    <div className="space-y-2">
                      <Label>Value</Label>
                      {getFieldType(rule.field) === 'date' ? (
                        <Input
                          type="date"
                          value={rule.value as string || ''}
                          onChange={(e) => updateRule(index, { value: e.target.value })}
                        />
                      ) : getFieldType(rule.field) === 'number' ? (
                        <Input
                          type="number"
                          value={rule.value as number || ''}
                          onChange={(e) => updateRule(index, { value: parseFloat(e.target.value) || 0 })}
                        />
                      ) : (
                        <Input
                          value={rule.value as string || ''}
                          onChange={(e) => updateRule(index, { value: e.target.value })}
                          placeholder="Enter value"
                        />
                      )}
                    </div>
                  )}
                </div>

                {rules.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRule(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button variant="outline" onClick={addRule}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Saving...' : segment ? 'Update Segment' : 'Create Segment'}
        </Button>
      </div>
    </div>
  );
}
