'use client';

import { useState, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Sparkles, AlertTriangle, Check, X } from 'lucide-react';
import { IntegrationErrorBoundary } from '@/components/error-boundaries';
import { formatCurrency } from '@/lib/utils';
import type { EstimateSuggestion, SuggestedLineItem } from '@/types/integrations';

/**
 * Error boundary wrapper for the AI Suggestions Panel
 */
export function AISuggestionsPanelErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <IntegrationErrorBoundary
      integrationName="AI Suggestions"
      icon={<Sparkles className="h-6 w-6 text-purple-500" />}
    >
      {children}
    </IntegrationErrorBoundary>
  );
}

interface AISuggestionsPanelProps {
  hazardTypes: string[];
  propertyType?: string;
  squareFootage?: number;
  siteSurveyNotes?: string;
  onAcceptItems: (items: SuggestedLineItem[]) => void;
  onClose?: () => void;
}

export function AISuggestionsPanel({
  hazardTypes,
  propertyType,
  squareFootage,
  siteSurveyNotes,
  onAcceptItems,
  onClose,
}: AISuggestionsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<EstimateSuggestion | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const generateSuggestions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hazard_types: hazardTypes,
          property_type: propertyType,
          square_footage: squareFootage,
          site_survey_notes: siteSurveyNotes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate suggestions');
      }

      const data = await response.json();
      setSuggestion(data);
      // Select all items by default
      setSelectedItems(new Set(data.suggested_items.map((_: SuggestedLineItem, i: number) => i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    if (suggestion) {
      setSelectedItems(new Set(suggestion.suggested_items.map((_, i) => i)));
    }
  };

  const selectNone = () => {
    setSelectedItems(new Set());
  };

  const handleAccept = () => {
    if (suggestion) {
      const items = suggestion.suggested_items.filter((_, i) => selectedItems.has(i));
      onAcceptItems(items);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      labor: 'bg-blue-100 text-blue-800',
      materials: 'bg-green-100 text-green-800',
      equipment: 'bg-purple-100 text-purple-800',
      disposal: 'bg-orange-100 text-orange-800',
      testing: 'bg-cyan-100 text-cyan-800',
      permits: 'bg-pink-100 text-pink-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const selectedTotal = suggestion
    ? suggestion.suggested_items
        .filter((_, i) => selectedItems.has(i))
        .reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
    : 0;

  if (!suggestion && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Estimate Suggestions
          </CardTitle>
          <CardDescription>
            Generate line items based on hazard types and site details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p><strong>Hazard Types:</strong> {hazardTypes.join(', ') || 'None specified'}</p>
              {propertyType && <p><strong>Property Type:</strong> {propertyType}</p>}
              {squareFootage && <p><strong>Square Footage:</strong> {squareFootage.toLocaleString()} sq ft</p>}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={generateSuggestions} disabled={!hazardTypes.length}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Suggestions
              </Button>
              {onClose && (
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            <p className="text-muted-foreground">Analyzing site details and generating estimates...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI Suggestions
            </CardTitle>
            <CardDescription>
              {suggestion?.suggested_items.length} items suggested
              {suggestion?.confidence_score && (
                <span className={`ml-2 ${getConfidenceColor(suggestion.confidence_score)}`}>
                  ({Math.round(suggestion.confidence_score * 100)}% confidence)
                </span>
              )}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={generateSuggestions}>
            Regenerate
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {suggestion?.reasoning && (
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              {suggestion.reasoning}
            </p>
          )}

          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={selectNone}>
                Select None
              </Button>
            </div>
            <span className="text-sm text-muted-foreground">
              {selectedItems.size} of {suggestion?.suggested_items.length} selected
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {suggestion?.suggested_items.map((item, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 border rounded-md transition-colors ${
                  selectedItems.has(index) ? 'bg-purple-50 border-purple-200' : 'bg-white'
                }`}
              >
                <Checkbox
                  checked={selectedItems.has(index)}
                  onCheckedChange={() => toggleItem(index)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{item.description}</span>
                    <Badge className={getCategoryColor(item.category)}>{item.category}</Badge>
                    {item.hazard_type && (
                      <Badge variant="outline">{item.hazard_type}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span>{item.quantity} × {formatCurrency(item.unit_price)}</span>
                    <span className="font-medium text-foreground">
                      = {formatCurrency(item.quantity * item.unit_price)}
                    </span>
                  </div>
                  {item.reasoning && (
                    <p className="text-xs text-muted-foreground mt-1">{item.reasoning}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-lg font-semibold">
              Selected Total: {formatCurrency(selectedTotal)}
            </div>
            <div className="flex gap-2">
              {onClose && (
                <Button variant="outline" onClick={onClose}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleAccept}
                disabled={selectedItems.size === 0}
              >
                <Check className="h-4 w-4 mr-2" />
                Add Selected Items
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
