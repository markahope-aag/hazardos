import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import type { VoiceTranscription } from '@/types/integrations';

const WHISPER_MODEL = 'whisper-1';
const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';

export interface TranscriptionContext {
  context_type: 'site_survey_note' | 'job_note' | 'customer_note';
  context_id?: string;
  additional_context?: string;
}

export interface TranscriptionResult {
  raw_text: string;
  processed_text: string;
  extracted_data: Record<string, unknown>;
}

export class VoiceService {
  private static openaiClient: OpenAI | null = null;
  private static anthropicClient: Anthropic | null = null;

  private static getOpenAIClient(): OpenAI {
    if (!this.openaiClient) {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not configured');
      }
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    return this.openaiClient;
  }

  private static getAnthropicClient(): Anthropic {
    if (!this.anthropicClient) {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is not configured');
      }
      this.anthropicClient = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
    return this.anthropicClient;
  }

  static async transcribe(
    organizationId: string,
    userId: string,
    audioBuffer: Buffer,
    audioFormat: string,
    context?: TranscriptionContext
  ): Promise<VoiceTranscription> {
    const supabase = await createClient();
    const startTime = Date.now();

    // Create pending transcription record
    const { data: transcription, error: insertError } = await supabase
      .from('voice_transcriptions')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        audio_format: audioFormat,
        context_type: context?.context_type,
        context_id: context?.context_id,
        status: 'processing',
        raw_transcription: '', // Placeholder
      })
      .select()
      .single();

    if (insertError) throw insertError;

    try {
      // Step 1: Transcribe with Whisper
      const rawText = await this.transcribeWithWhisper(audioBuffer, audioFormat);

      // Step 2: Process with Claude for context-aware improvements
      const { processedText, extractedData } = await this.processWithClaude(
        rawText,
        context
      );

      const processingTime = Date.now() - startTime;

      // Update transcription record
      const { data: updated, error: updateError } = await supabase
        .from('voice_transcriptions')
        .update({
          raw_transcription: rawText,
          processed_text: processedText,
          extracted_data: extractedData,
          transcription_model: WHISPER_MODEL,
          processing_model: CLAUDE_MODEL,
          processing_time_ms: processingTime,
          status: 'completed',
        })
        .eq('id', transcription.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return updated;
    } catch (error) {
      // Mark as failed
      await supabase
        .from('voice_transcriptions')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', transcription.id);

      throw error;
    }
  }

  private static async transcribeWithWhisper(
    audioBuffer: Buffer,
    audioFormat: string
  ): Promise<string> {
    const openai = this.getOpenAIClient();

    // Create a file-like object for the API
    // Use Blob constructor with ArrayBuffer slice to avoid SharedArrayBuffer type issues
    const arrayBuffer = audioBuffer.buffer.slice(
      audioBuffer.byteOffset,
      audioBuffer.byteOffset + audioBuffer.length
    ) as ArrayBuffer;
    const file = new File(
      [arrayBuffer],
      `audio.${audioFormat}`,
      { type: `audio/${audioFormat}` }
    );

    const response = await openai.audio.transcriptions.create({
      file,
      model: WHISPER_MODEL,
      language: 'en',
      response_format: 'text',
    });

    return response;
  }

  private static async processWithClaude(
    rawText: string,
    context?: TranscriptionContext
  ): Promise<{ processedText: string; extractedData: Record<string, unknown> }> {
    const claude = this.getAnthropicClient();

    const contextPrompt = this.buildContextPrompt(context);

    const response = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Process this voice transcription from a hazardous materials site inspection:

Raw Transcription:
"${rawText}"

${contextPrompt}

Tasks:
1. Clean up the transcription (fix obvious speech-to-text errors, add punctuation)
2. Format into clear, professional notes
3. Extract any structured data mentioned (measurements, hazard types, locations, etc.)

Respond in JSON format:
{
  "processed_text": "cleaned up and formatted text",
  "extracted_data": {
    "hazard_types": ["if mentioned"],
    "measurements": {"key": "value"},
    "locations": ["specific areas mentioned"],
    "concerns": ["safety concerns mentioned"],
    "action_items": ["any actions mentioned"]
  }
}`,
        },
      ],
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return { processedText: rawText, extractedData: {} };
    }

    try {
      const parsed = JSON.parse(this.extractJson(textContent.text));
      return {
        processedText: parsed.processed_text || rawText,
        extractedData: parsed.extracted_data || {},
      };
    } catch {
      return { processedText: rawText, extractedData: {} };
    }
  }

  private static buildContextPrompt(context?: TranscriptionContext): string {
    if (!context) return '';

    let prompt = 'Context:\n';

    switch (context.context_type) {
      case 'site_survey_note':
        prompt += 'This is a voice note from a site survey/inspection.\n';
        prompt += 'Look for: hazard observations, measurements, conditions, access issues, safety concerns.\n';
        break;
      case 'job_note':
        prompt += 'This is a voice note from an active job site.\n';
        prompt += 'Look for: progress updates, issues encountered, material usage, crew notes, safety observations.\n';
        break;
      case 'customer_note':
        prompt += 'This is a voice note about a customer interaction.\n';
        prompt += 'Look for: customer concerns, requirements, follow-up items, special instructions.\n';
        break;
    }

    if (context.additional_context) {
      prompt += `Additional context: ${context.additional_context}\n`;
    }

    return prompt;
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

  // Get recent transcriptions for a user
  static async getRecentTranscriptions(
    organizationId: string,
    userId?: string,
    limit: number = 20
  ): Promise<VoiceTranscription[]> {
    const supabase = await createClient();

    let query = supabase
      .from('voice_transcriptions')
      .select('id, organization_id, user_id, audio_format, context_type, context_id, raw_transcription, processed_text, extracted_data, transcription_model, processing_model, processing_time_ms, status, error_message, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }
}
