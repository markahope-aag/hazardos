import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';
import type { PhotoAnalysis, DetectedHazard } from '@/types/integrations';

const MODEL_VERSION = 'claude-3-5-sonnet-20241022';

export interface PhotoAnalysisContext {
  property_type?: string;
  known_hazards?: string[];
  additional_context?: string;
}

export interface PhotoAnalysisResult {
  detected_hazards: DetectedHazard[];
  overall_risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommendations: Array<{ action: string; priority: string }>;
  raw_analysis: string;
}

export interface AggregateAnalysisResult {
  total_photos: number;
  hazards_by_type: Record<string, number>;
  overall_risk_level: 'low' | 'medium' | 'high' | 'critical';
  all_recommendations: Array<{ action: string; priority: string }>;
  summary: string;
}

export class PhotoAnalysisService {
  private static client: Anthropic | null = null;

  private static getClient(): Anthropic {
    if (!this.client) {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is not configured');
      }
      this.client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
    return this.client;
  }

  static async analyzePhoto(
    organizationId: string,
    imageBase64: string,
    context?: PhotoAnalysisContext
  ): Promise<PhotoAnalysis> {
    const supabase = await createClient();
    const startTime = Date.now();

    // Generate hash for deduplication
    const imageHash = createHash('sha256').update(imageBase64).digest('hex');

    // Check for existing analysis
    const { data: existing } = await supabase
      .from('photo_analyses')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('image_hash', imageHash)
      .maybeSingle();

    if (existing) {
      return existing;
    }

    // Build the prompt
    const prompt = this.buildAnalysisPrompt(context);

    // Determine media type
    const mediaType = this.detectMediaType(imageBase64);

    // Call Claude with vision
    const client = this.getClient();
    const response = await client.messages.create({
      model: MODEL_VERSION,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
      system: `You are an expert hazardous materials inspector and safety analyst.
Your task is to analyze photos from potential hazmat sites and identify hazardous materials, safety concerns, and recommend actions.
Be thorough but avoid false positives. Only identify hazards you're reasonably confident about.
Always respond with valid JSON matching the requested schema.`,
    });

    // Parse response
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI');
    }

    const result = this.parseAnalysisResponse(textContent.text);
    const processingTime = Date.now() - startTime;

    // Save to database
    const { data: analysis, error } = await supabase
      .from('photo_analyses')
      .insert({
        organization_id: organizationId,
        image_hash: imageHash,
        property_type: context?.property_type,
        known_hazards: context?.known_hazards || [],
        detected_hazards: result.detected_hazards,
        overall_risk_level: result.overall_risk_level,
        recommendations: result.recommendations,
        raw_analysis: result.raw_analysis,
        model_version: MODEL_VERSION,
        processing_time_ms: processingTime,
      })
      .select()
      .single();

    if (error) throw error;

    return analysis;
  }

  static async analyzeMultiplePhotos(
    organizationId: string,
    images: Array<{ base64: string; context?: PhotoAnalysisContext }>
  ): Promise<AggregateAnalysisResult> {
    // Analyze each photo
    const analyses: PhotoAnalysis[] = [];
    for (const image of images) {
      try {
        const analysis = await this.analyzePhoto(
          organizationId,
          image.base64,
          image.context
        );
        analyses.push(analysis);
      } catch (error) {
        console.error('Failed to analyze photo:', error);
      }
    }

    // Aggregate results
    const hazardsByType: Record<string, number> = {};
    const allRecommendations: Array<{ action: string; priority: string }> = [];
    let maxRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const riskOrder = ['low', 'medium', 'high', 'critical'];

    for (const analysis of analyses) {
      // Count hazards by type
      for (const hazard of analysis.detected_hazards) {
        hazardsByType[hazard.type] = (hazardsByType[hazard.type] || 0) + 1;
      }

      // Collect recommendations (deduplicate)
      for (const rec of analysis.recommendations) {
        if (!allRecommendations.some(r => r.action === rec.action)) {
          allRecommendations.push(rec);
        }
      }

      // Track highest risk level
      if (analysis.overall_risk_level) {
        const currentIdx = riskOrder.indexOf(maxRiskLevel);
        const newIdx = riskOrder.indexOf(analysis.overall_risk_level);
        if (newIdx > currentIdx) {
          maxRiskLevel = analysis.overall_risk_level;
        }
      }
    }

    // Generate summary using AI
    const summary = await this.generateAggregateSummary(analyses, hazardsByType);

    return {
      total_photos: analyses.length,
      hazards_by_type: hazardsByType,
      overall_risk_level: maxRiskLevel,
      all_recommendations: allRecommendations.sort((a, b) => {
        const priorityOrder = ['high', 'medium', 'low'];
        return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
      }),
      summary,
    };
  }

  private static buildAnalysisPrompt(context?: PhotoAnalysisContext): string {
    let prompt = `Analyze this image for potential hazardous materials and safety concerns.

`;

    if (context?.property_type) {
      prompt += `Property Type: ${context.property_type}\n`;
    }

    if (context?.known_hazards?.length) {
      prompt += `Known/Suspected Hazards: ${context.known_hazards.join(', ')}\n`;
    }

    if (context?.additional_context) {
      prompt += `Additional Context: ${context.additional_context}\n`;
    }

    prompt += `
Look for:
1. Asbestos-containing materials (floor tiles, insulation, popcorn ceilings, pipe wrap)
2. Lead paint (old paint, chipping/peeling surfaces)
3. Mold/mildew (discoloration, water damage)
4. PCBs (old electrical equipment, transformers)
5. Chemical storage (drums, containers, stains)
6. Structural concerns that may affect abatement
7. Any other potential hazards

Respond in JSON format:
{
  "detected_hazards": [
    {
      "type": "asbestos|lead|mold|pcb|chemical|structural|other",
      "confidence": 0.0-1.0,
      "location": "where in image",
      "description": "what was observed",
      "severity": "low|medium|high|critical"
    }
  ],
  "overall_risk_level": "low|medium|high|critical",
  "recommendations": [
    { "action": "specific action to take", "priority": "low|medium|high" }
  ]
}

If you cannot identify any hazards with reasonable confidence, return empty detected_hazards array.`;

    return prompt;
  }

  private static parseAnalysisResponse(text: string): PhotoAnalysisResult {
    try {
      const jsonStr = this.extractJson(text);
      const parsed = JSON.parse(jsonStr);

      return {
        detected_hazards: parsed.detected_hazards || [],
        overall_risk_level: parsed.overall_risk_level || 'low',
        recommendations: parsed.recommendations || [],
        raw_analysis: text,
      };
    } catch {
      return {
        detected_hazards: [],
        overall_risk_level: 'low',
        recommendations: [],
        raw_analysis: text,
      };
    }
  }

  private static async generateAggregateSummary(
    analyses: PhotoAnalysis[],
    hazardsByType: Record<string, number>
  ): Promise<string> {
    if (analyses.length === 0) {
      return 'No photos analyzed.';
    }

    const client = this.getClient();
    const response = await client.messages.create({
      model: MODEL_VERSION,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Summarize these hazardous materials photo analysis results in 2-3 sentences:

Photos Analyzed: ${analyses.length}
Hazards Found: ${JSON.stringify(hazardsByType)}
Risk Levels: ${analyses.map(a => a.overall_risk_level).join(', ')}

Provide a concise, professional summary suitable for a report.`,
        },
      ],
    });

    const textContent = response.content.find(c => c.type === 'text');
    return textContent && textContent.type === 'text' ? textContent.text : 'Analysis complete.';
  }

  private static detectMediaType(base64: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
    // Check first bytes of base64
    if (base64.startsWith('/9j/')) return 'image/jpeg';
    if (base64.startsWith('iVBORw0K')) return 'image/png';
    if (base64.startsWith('R0lGOD')) return 'image/gif';
    if (base64.startsWith('UklGR')) return 'image/webp';

    // Default to JPEG
    return 'image/jpeg';
  }

  private static extractJson(text: string): string {
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }

    return text;
  }
}
