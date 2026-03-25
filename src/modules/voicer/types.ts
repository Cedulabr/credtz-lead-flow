export interface Voice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  preview_url: string | null;
  description: string | null;
}

export interface AudioSettings {
  stability: number;
  similarityBoost: number;
  style: number;
  speed: number;
}

export interface AudioGeneration {
  id: string;
  user_id: string;
  text_original: string;
  text_converted: string | null;
  voice_id: string;
  voice_name: string | null;
  audio_url: string | null;
  file_path: string | null;
  duration_seconds: number | null;
  characters_count: number;
  credits_used: number;
  settings_json: AudioSettings;
  status: 'pending' | 'processing' | 'ready' | 'error';
  created_at: string;
}

export interface EmotionVariable {
  emoji: string;
  label: string;
  variable: string;
  elevenlabs: string;
}

export type VoicerTab = 'studio' | 'variations' | 'ab-test' | 'history' | 'credits' | 'settings';
