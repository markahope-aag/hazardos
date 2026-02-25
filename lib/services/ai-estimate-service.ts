import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createServiceLogger } from '@/lib/utils/logger';
import { redactPII } from '@/lib/utils/pii-redaction';
import type { EstimateSuggestion, SuggestedLineItem } from '@/types/integrations';

const log = createServiceLogger('AIEstimateService');

const MODEL_VERSION = 'claude-3-5-sonnet-20241022';

// Pricing data structure (would typically come from database)
interface PricingData {
  laborRates: Record<string, number>;
  materialCosts: Record<string, number>;
  disposalFees: Record<string, number>;
}

export interface EstimateInput {
  hazard_types: string[];
  property_type?: string;
  square_footage?: number;
  photos?: string[]; // Base64 encoded images
  site_survey_notes?: string;
  customer_notes?: string;
}

export interface VarianceAnalysis {
  job_id: string;
  estimated_total: number;
  actual_total: number;
  variance_amount: number;
  variance_percentage: number;
  factors: Array<{
    category: string;
    description: string;
    impact: number;
  }>;
  recommendations: string[];
}

export class AIEstimateService {
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

  /**
   * Check if AI estimate suggestions are enabled for the organization
   */
  private static async checkAIEnabled(
    supabase: Awaited<ReturnType<typeof createClient>>,
    organizationId: string
  ): Promise<{ enabled: boolean; anonymize: boolean }> {
    const { data } = await supabase
      .from('organization_ai_settings')
      .select('ai_enabled, estimate_suggestions_enabled, anonymize_customer_data')
      .eq('organization_id', organizationId)
      .single();

    return {
      enabled: data?.ai_enabled && data?.estimate_suggestions_enabled,
      anonymize: data?.anonymize_customer_data ?? true,
    };
  }

  /**
   * Log AI usage for audit trail
   */
  private static async logUsage(
    supabase: Awaited<ReturnType<typeof createClient>>,
    organizationId: string,
    operation: string,
    options: {
      processingTimeMs?: number;
      success?: boolean;
      errorMessage?: string;
      piiRedacted?: boolean;
      relatedEntityType?: string;
      relatedEntityId?: string;
    } = {}
  ): Promise<void> {
    try {
      await supabase.rpc('log_ai_usage', {
        p_organization_id: organizationId,
        p_service_name: 'estimate_suggestion',
        p_operation: operation,
        p_provider: 'anthropic',
        p_model_version: MODEL_VERSION,
        p_related_entity_type: options.relatedEntityType ?? null,
        p_related_entity_id: options.relatedEntityId ?? null,
        p_data_categories: ['text'],
        p_pii_redacted: options.piiRedacted ?? false,
        p_processing_time_ms: options.processingTimeMs ?? null,
        p_success: options.success ?? true,
        p_error_message: options.errorMessage ?? null,
      });
    } catch (error) {
      log.warn({ error }, 'Failed to log AI usage');
    }
  }

  /**
   * Redact PII from estimate input before sending to AI
   */
  private static redactInputPII(input: EstimateInput): { input: EstimateInput; wasRedacted: boolean } {
    let wasRedacted = false;

    // Redact site survey notes
    let redactedSurveyNotes = input.site_survey_notes;
    if (input.site_survey_notes) {
      const result = redactPII(input.site_survey_notes);
      redactedSurveyNotes = result.text;
      if (result.wasRedacted) wasRedacted = true;
    }

    // Redact customer notes
    let redactedCustomerNotes = input.customer_notes;
    if (input.customer_notes) {
      const result = redactPII(input.customer_notes);
      redactedCustomerNotes = result.text;
      if (result.wasRedacted) wasRedacted = true;
    }

    return {
      input: {
        ...input,
        site_survey_notes: redactedSurveyNotes,
        customer_notes: redactedCustomerNotes,
      },
      wasRedacted,
    };
  }

  static async suggestEstimate(
    organizationId: string,
    input: EstimateInput
  ): Promise<EstimateSuggestion> {
    const supabase = await createClient();
    const startTime = Date.now();

    // Check if AI features are enabled for this organization
    const aiSettings = await this.checkAIEnabled(supabase, organizationId);
    if (!aiSettings.enabled) {
      throw new Error(
        'AI estimate suggestions are not enabled for this organization. ' +
        'Please enable AI features in Settings → AI & Automation to use this feature.'
      );
    }

    // Redact PII from input if anonymization is enabled
    let processedInput = input;
    let piiWasRedacted = false;

    if (aiSettings.anonymize) {
      const redactionResult = this.redactInputPII(input);
      processedInput = redactionResult.input;
      piiWasRedacted = redactionResult.wasRedacted;

      if (piiWasRedacted) {
        log.info(
          { organizationId, operation: 'suggestEstimate' },
          'PII redacted from estimate input before AI processing'
        );
      }
    }

    // Fetch organization's pricing data
    const pricingData = await this.getPricingData(organizationId);

    // Build the prompt with redacted input
    const prompt = this.buildEstimatePrompt(processedInput, pricingData);

    // Call Claude
    const client = this.getClient();
    const response = await client.messages.create({
      model: MODEL_VERSION,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      system: `You are an expert hazardous materials estimator for an abatement company.
Your task is to generate detailed cost estimates for hazardous material removal jobs.
Always respond with valid JSON matching the requested schema.
Be conservative in estimates to ensure profitability while remaining competitive.
Include all necessary line items: labor, materials, equipment, disposal, permits, testing.`,
    });

    // Parse the response
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI');
    }

    const parsedResponse = this.parseEstimateResponse(textContent.text);

    // Calculate total
    const totalAmount = parsedResponse.items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    );

    // Save to database
    const { data: suggestion, error } = await supabase
      .from('estimate_suggestions')
      .insert({
        organization_id: organizationId,
        hazard_types: input.hazard_types,
        property_type: input.property_type,
        square_footage: input.square_footage,
        suggested_items: parsedResponse.items,
        total_amount: totalAmount,
        model_version: MODEL_VERSION,
        confidence_score: parsedResponse.confidence,
        reasoning: parsedResponse.reasoning,
      })
      .select()
      .single();

    if (error) throw error;

    const durationMs = Date.now() - startTime;
    log.info(
      {
        operation: 'suggestEstimate',
        organizationId,
        durationMs,
        hazardTypes: input.hazard_types,
        confidence: parsedResponse.confidence,
        itemCount: parsedResponse.items.length,
        totalAmount,
        piiRedacted: piiWasRedacted,
      },
      'AI estimate generated'
    );

    // Log AI usage for audit trail
    await this.logUsage(supabase, organizationId, 'suggest', {
      processingTimeMs: durationMs,
      success: true,
      piiRedacted: piiWasRedacted,
    });

    return suggestion;
  }

  static async analyzeVariance(
    organizationId: string,
    jobId: string
  ): Promise<VarianceAnalysis> {
    const supabase = await createClient();

    // Check if AI features are enabled
    const aiSettings = await this.checkAIEnabled(supabase, organizationId);
    if (!aiSettings.enabled) {
      throw new Error(
        'AI estimate suggestions are not enabled for this organization. ' +
        'Please enable AI features in Settings → AI & Automation.'
      );
    }

    // Get job with estimate and actual costs
    const { data: job } = await supabase
      .from('jobs')
      .select(`
        *,
        estimate:estimates(*),
        material_usage:job_material_usage(*),
        time_entries:job_time_entries(*),
        disposal:job_disposal(*)
      `)
      .eq('id', jobId)
      .eq('organization_id', organizationId)
      .single();

    if (!job) throw new Error('Job not found');

    // Calculate estimated vs actual
    const estimate = job.estimate as { total_amount: number } | null;
    const estimatedTotal = estimate?.total_amount || 0;

    // Calculate actual from various sources
    interface TimeEntry { hours: number; rate: number }
    interface MaterialUsage { cost: number }
    interface Disposal { cost: number }

    const laborCost = ((job.time_entries || []) as TimeEntry[]).reduce(
      (sum: number, entry: TimeEntry) => sum + (entry.hours * entry.rate),
      0
    );
    const materialCost = ((job.material_usage || []) as MaterialUsage[]).reduce(
      (sum: number, usage: MaterialUsage) => sum + usage.cost,
      0
    );
    const disposalCost = ((job.disposal || []) as Disposal[]).reduce(
      (sum: number, disposal: Disposal) => sum + disposal.cost,
      0
    );

    const actualTotal = laborCost + materialCost + disposalCost;
    const varianceAmount = actualTotal - estimatedTotal;
    const variancePercentage = estimatedTotal > 0 ? (varianceAmount / estimatedTotal) * 100 : 0;

    // Use AI to analyze the variance
    const client = this.getClient();
    const response = await client.messages.create({
      model: MODEL_VERSION,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Analyze this job cost variance:

Estimated Total: $${estimatedTotal.toFixed(2)}
Actual Total: $${actualTotal.toFixed(2)}
Variance: $${varianceAmount.toFixed(2)} (${variancePercentage.toFixed(1)}%)

Breakdown:
- Labor: $${laborCost.toFixed(2)}
- Materials: $${materialCost.toFixed(2)}
- Disposal: $${disposalCost.toFixed(2)}

Job Type: ${job.job_type || 'Unknown'}
Hazard Types: ${(job.hazard_types || []).join(', ') || 'Unknown'}

Provide factors that likely contributed to this variance and recommendations.
Respond in JSON format:
{
  "factors": [{ "category": "string", "description": "string", "impact": number }],
  "recommendations": ["string"]
}`,
        },
      ],
    });

    const textContent = response.content.find(c => c.type === 'text');
    let factors: VarianceAnalysis['factors'] = [];
    let recommendations: string[] = [];

    if (textContent && textContent.type === 'text') {
      try {
        const parsed = JSON.parse(this.extractJson(textContent.text));
        factors = parsed.factors || [];
        recommendations = parsed.recommendations || [];
      } catch {
        // Use defaults if parsing fails
      }
    }

    // Log AI usage
    await this.logUsage(supabase, organizationId, 'analyze_variance', {
      success: true,
      relatedEntityType: 'job',
      relatedEntityId: jobId,
    });

    return {
      job_id: jobId,
      estimated_total: estimatedTotal,
      actual_total: actualTotal,
      variance_amount: varianceAmount,
      variance_percentage: variancePercentage,
      factors,
      recommendations,
    };
  }

  private static async getPricingData(organizationId: string): Promise<PricingData> {
    const supabase = await createClient();

    // Fetch labor rates
    const { data: laborRates } = await supabase
      .from('labor_rates')
      .select('hazard_type, rate')
      .eq('organization_id', organizationId);

    // Fetch material costs
    const { data: materialCosts } = await supabase
      .from('material_costs')
      .select('name, cost_per_unit')
      .eq('organization_id', organizationId);

    // Fetch disposal fees
    const { data: disposalFees } = await supabase
      .from('disposal_fees')
      .select('hazard_type, cost_per_cubic_yard')
      .eq('organization_id', organizationId);

    return {
      laborRates: (laborRates || []).reduce((acc, r) => ({ ...acc, [r.hazard_type]: r.rate }), {}),
      materialCosts: (materialCosts || []).reduce((acc, m) => ({ ...acc, [m.name]: m.cost_per_unit }), {}),
      disposalFees: (disposalFees || []).reduce((acc, d) => ({ ...acc, [d.hazard_type]: d.cost_per_cubic_yard }), {}),
    };
  }

  private static buildEstimatePrompt(input: EstimateInput, pricing: PricingData): string {
    let prompt = `Generate a detailed estimate for a hazardous materials abatement job with the following details:

Hazard Types: ${input.hazard_types.join(', ')}
Property Type: ${input.property_type || 'Unknown'}
Square Footage: ${input.square_footage ? `${input.square_footage} sq ft` : 'Unknown'}

`;

    if (input.site_survey_notes) {
      prompt += `Site Survey Notes:\n${input.site_survey_notes}\n\n`;
    }

    if (input.customer_notes) {
      prompt += `Customer Notes:\n${input.customer_notes}\n\n`;
    }

    prompt += `Available Pricing Data:
Labor Rates: ${JSON.stringify(pricing.laborRates)}
Material Costs: ${JSON.stringify(pricing.materialCosts)}
Disposal Fees: ${JSON.stringify(pricing.disposalFees)}

Generate a complete estimate including:
1. Labor (setup, removal, cleanup)
2. Materials (PPE, containment, sealants)
3. Equipment (rental if needed)
4. Disposal fees
5. Testing/clearance
6. Permits if applicable

Respond in JSON format:
{
  "items": [
    {
      "description": "string",
      "quantity": number,
      "unit_price": number,
      "category": "labor|materials|equipment|disposal|testing|permits",
      "hazard_type": "string or null",
      "reasoning": "why this is needed"
    }
  ],
  "confidence": number (0-1),
  "reasoning": "overall explanation of the estimate"
}`;

    return prompt;
  }

  private static parseEstimateResponse(text: string): {
    items: SuggestedLineItem[];
    confidence: number;
    reasoning: string;
  } {
    try {
      const jsonStr = this.extractJson(text);
      const parsed = JSON.parse(jsonStr);

      return {
        items: parsed.items || [],
        confidence: parsed.confidence || 0.7,
        reasoning: parsed.reasoning || '',
      };
    } catch {
      // Return default if parsing fails
      return {
        items: [],
        confidence: 0,
        reasoning: 'Failed to parse AI response',
      };
    }
  }

  private static extractJson(text: string): string {
    // Try to extract JSON from markdown code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // Try to find JSON object
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }

    return text;
  }
}
