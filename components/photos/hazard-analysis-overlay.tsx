'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Scan, AlertTriangle, Shield, CheckCircle, XCircle, Info } from 'lucide-react';
import type { PhotoAnalysis, DetectedHazard } from '@/types/integrations';

interface HazardAnalysisOverlayProps {
  imageBase64?: string;
  imageUrl?: string;
  propertyType?: string;
  knownHazards?: string[];
  onAnalysisComplete?: (analysis: PhotoAnalysis) => void;
  existingAnalysis?: PhotoAnalysis;
}

export function HazardAnalysisOverlay({
  imageBase64,
  imageUrl: _imageUrl,
  propertyType,
  knownHazards,
  onAnalysisComplete,
  existingAnalysis,
}: HazardAnalysisOverlayProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PhotoAnalysis | null>(existingAnalysis || null);
  const [showDetails, setShowDetails] = useState(false);

  const analyzePhoto = async () => {
    if (!imageBase64) {
      setError('No image data provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/photo-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageBase64,
          context: {
            property_type: propertyType,
            known_hazards: knownHazards,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to analyze photo');
      }

      const data = await response.json();
      setAnalysis(data);
      onAnalysisComplete?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level?: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getRiskIcon = (level?: string) => {
    switch (level) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Info className="h-4 w-4" />;
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-50';
      case 'high':
        return 'border-orange-500 bg-orange-50';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-green-500 bg-green-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const getHazardTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      asbestos: '⚠️',
      lead: '🔴',
      mold: '🦠',
      pcb: '⚡',
      chemical: '🧪',
      structural: '🏗️',
      other: '❓',
    };
    return icons[type] || '❓';
  };

  const formatConfidence = (confidence: number) => {
    return `${Math.round(confidence * 100)}%`;
  };

  if (loading) {
    return (
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
        <div className="bg-white p-4 rounded-lg flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
          <span>Analyzing for hazards...</span>
        </div>
      </div>
    );
  }

  if (!analysis && !error) {
    return (
      <div className="absolute bottom-2 right-2">
        <Button
          size="sm"
          onClick={analyzePhoto}
          disabled={!imageBase64}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Scan className="h-4 w-4 mr-2" />
          Analyze for Hazards
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute bottom-2 right-2 left-2">
        <div className="bg-red-100 border border-red-300 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700 text-sm">
            <XCircle className="h-4 w-4" />
            {error}
          </div>
          <Button size="sm" variant="outline" onClick={analyzePhoto}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Risk level badge in corner */}
      <div className="absolute top-2 right-2">
        <Badge className={`${getRiskLevelColor(analysis?.overall_risk_level)} flex items-center gap-1`}>
          {getRiskIcon(analysis?.overall_risk_level)}
          {analysis?.overall_risk_level?.toUpperCase()} RISK
        </Badge>
      </div>

      {/* Hazard count badge */}
      {analysis?.detected_hazards && analysis.detected_hazards.length > 0 && (
        <div className="absolute top-2 left-2">
          <Badge
            variant="outline"
            className="bg-white cursor-pointer"
            onClick={() => setShowDetails(!showDetails)}
          >
            {analysis.detected_hazards.length} hazard{analysis.detected_hazards.length > 1 ? 's' : ''} detected
          </Badge>
        </div>
      )}

      {/* Detailed analysis panel */}
      {showDetails && analysis && (
        <div className="absolute inset-0 bg-black/70 overflow-y-auto p-4 rounded-lg">
          <Card className="max-w-md mx-auto">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Hazard Analysis</CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDetails(false)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                AI-powered hazardous materials detection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Detected hazards */}
              {analysis.detected_hazards.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Detected Hazards</h4>
                  {analysis.detected_hazards.map((hazard: DetectedHazard, index: number) => (
                    <div
                      key={index}
                      className={`p-3 rounded-md border-l-4 ${getSeverityColor(hazard.severity)}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {getHazardTypeIcon(hazard.type)} {hazard.type.toUpperCase()}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {formatConfidence(hazard.confidence)} confidence
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {hazard.description}
                      </p>
                      {hazard.location && (
                        <p className="text-xs text-muted-foreground mt-1">
                          📍 {hazard.location}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p>No hazards detected</p>
                </div>
              )}

              {/* Recommendations */}
              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Recommendations</h4>
                  <ul className="space-y-1">
                    {analysis.recommendations.map((rec: { action: string; priority: string }, index: number) => (
                      <li
                        key={index}
                        className="text-sm flex items-start gap-2"
                      >
                        <Badge
                          variant="outline"
                          className={`text-xs shrink-0 ${
                            rec.priority === 'high'
                              ? 'border-red-500 text-red-700'
                              : rec.priority === 'medium'
                              ? 'border-yellow-500 text-yellow-700'
                              : 'border-green-500 text-green-700'
                          }`}
                        >
                          {rec.priority}
                        </Badge>
                        <span>{rec.action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Re-analyze button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={analyzePhoto}
              >
                <Scan className="h-4 w-4 mr-2" />
                Re-analyze
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Toggle details button when collapsed */}
      {!showDetails && analysis?.detected_hazards && analysis.detected_hazards.length > 0 && (
        <div className="absolute bottom-2 right-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowDetails(true)}
          >
            View Details
          </Button>
        </div>
      )}
    </>
  );
}
