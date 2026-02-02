'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, Square, Loader2, Check, X, Trash2 } from 'lucide-react';
import type { VoiceTranscription } from '@/types/integrations';

type ContextType = 'site_survey_note' | 'job_note' | 'customer_note';

interface VoiceRecorderProps {
  contextType?: ContextType;
  contextId?: string;
  onTranscriptionComplete?: (transcription: VoiceTranscription) => void;
  onTextExtracted?: (text: string, extractedData: Record<string, unknown>) => void;
  placeholder?: string;
  className?: string;
}

export function VoiceRecorder({
  contextType,
  contextId,
  onTranscriptionComplete,
  onTextExtracted,
  placeholder = 'Click to start recording...',
  className = '',
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<VoiceTranscription | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const processAudio = useCallback(async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );

      // Get format from MIME type
      const format = audioBlob.type.includes('webm') ? 'webm' : 'mp4';

      const response = await fetch('/api/ai/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64,
          format,
          context: contextType
            ? {
                context_type: contextType,
                context_id: contextId,
              }
            : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to transcribe audio');
      }

      const result: VoiceTranscription = await response.json();
      setTranscription(result);
      onTranscriptionComplete?.(result);
      onTextExtracted?.(result.processed_text || result.raw_transcription, result.extracted_data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process recording');
    } finally {
      setIsProcessing(false);
    }
  }, [contextType, contextId, onTranscriptionComplete, onTextExtracted]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setTranscription(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access and try again.');
      } else {
        setError('Failed to start recording. Please check your microphone.');
      }
    }
  }, [processAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, [isRecording]);

  const clearRecording = () => {
    setTranscription(null);
    setError(null);
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (transcription) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="font-medium">Transcription Complete</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(transcription.status)}>
                  {transcription.status}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearRecording}
                  aria-label="Clear recording"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            {/* Processed text */}
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm">
                {transcription.processed_text || transcription.raw_transcription}
              </p>
            </div>

            {/* Extracted data */}
            {transcription.extracted_data && Object.keys(transcription.extracted_data).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Extracted Information:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(transcription.extracted_data).map(([key, value]) => (
                    <div key={key} className="bg-muted/50 p-2 rounded">
                      <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                      <span className="ml-1">
                        {Array.isArray(value) ? value.join(', ') : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Record another */}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={clearRecording}
            >
              <Mic className="h-4 w-4 mr-2" />
              Record Another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isProcessing) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div
            className="flex flex-col items-center justify-center gap-3 py-4"
            role="status"
            aria-busy="true"
            aria-live="polite"
          >
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Processing recording...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isRecording) {
    return (
      <Card className={`border-red-300 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between" role="status" aria-live="polite">
            <div className="flex items-center gap-3">
              <div className="relative" aria-hidden="true">
                <div className="h-4 w-4 bg-red-500 rounded-full animate-pulse" />
                <div className="absolute inset-0 h-4 w-4 bg-red-500 rounded-full animate-ping opacity-75" />
              </div>
              <span className="font-medium">Recording...</span>
              <span className="text-muted-foreground font-mono" aria-label={`Recording time: ${formatTime(recordingTime)}`}>
                {formatTime(recordingTime)}
              </span>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={stopRecording}
              aria-label="Stop recording"
            >
              <Square className="h-4 w-4 mr-2" aria-hidden="true" />
              Stop
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        {error && (
          <div className="flex items-center gap-2 p-3 mb-3 bg-red-50 text-red-700 rounded-md text-sm">
            <X className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={startRecording}
          className="flex items-center justify-center gap-3 py-6 w-full cursor-pointer hover:bg-muted/50 rounded-lg transition-colors border-2 border-dashed bg-transparent"
          aria-label="Start voice recording"
        >
          <Mic className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <span className="text-muted-foreground">{placeholder}</span>
        </button>
      </CardContent>
    </Card>
  );
}
