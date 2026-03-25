import { EmotionVariable } from '../types';

export const EMOTION_VARIABLES: EmotionVariable[] = [
  { emoji: '😂', label: 'Risada', variable: '{{risada}}', elevenlabs: '[laughs]' },
  { emoji: '⏸', label: 'Pausa curta', variable: '{{pausa curta}}', elevenlabs: '<break time="0.5s"/>' },
  { emoji: '⏸⏸', label: 'Pausa longa', variable: '{{pausa longa}}', elevenlabs: '<break time="1.5s"/>' },
  { emoji: '😊', label: 'Tom animado', variable: '{{tom animado}}', elevenlabs: '[cheerfully]' },
  { emoji: '😢', label: 'Tom triste', variable: '{{tom triste}}', elevenlabs: '[sadly]' },
  { emoji: '😠', label: 'Tom irritado', variable: '{{tom irritado}}', elevenlabs: '[angrily]' },
  { emoji: '😨', label: 'Tom assustado', variable: '{{tom assustado}}', elevenlabs: '[fearfully]' },
  { emoji: '🤫', label: 'Sussurro', variable: '{{sussurro}}', elevenlabs: '(em voz baixa)' },
  { emoji: '🎉', label: 'Empolgação', variable: '{{empolgação}}', elevenlabs: '[excitedly]' },
  { emoji: '😏', label: 'Ironia', variable: '{{ironia}}', elevenlabs: '[sarcastically]' },
  { emoji: '😭', label: 'Choro', variable: '{{choro}}', elevenlabs: '[crying]' },
  { emoji: '😮', label: 'Suspiro', variable: '{{suspiro}}', elevenlabs: '[sighs]' },
];

const VARIABLE_MAP: Record<string, string> = {};
EMOTION_VARIABLES.forEach((v) => {
  VARIABLE_MAP[v.variable] = v.elevenlabs;
});

/** Convert user-facing variables to ElevenLabs syntax */
export function convertVariables(text: string): string {
  let converted = text;
  for (const [variable, replacement] of Object.entries(VARIABLE_MAP)) {
    converted = converted.split(variable).join(replacement);
  }
  return converted;
}

/** Count characters excluding {{...}} variables */
export function countCharactersExcludingVariables(text: string): number {
  return text.replace(/\{\{[^}]+\}\}/g, '').length;
}

/** Calculate credits cost based on character count */
export function calculateCreditsCost(charCount: number): number {
  // 1 credit per 100 characters, minimum 1
  return Math.max(1, Math.ceil(charCount / 100));
}
