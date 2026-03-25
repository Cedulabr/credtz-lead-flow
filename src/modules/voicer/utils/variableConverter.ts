import { EmotionVariable } from '../types';

export interface VariableCategory {
  name: string;
  icon: string;
  variables: EmotionVariable[];
}

export const EMOTION_VARIABLES: EmotionVariable[] = [
  // Tons/Emoções
  { emoji: '😊', label: 'Tom animado', variable: '{{tom animado}}', elevenlabs: '[cheerfully]' },
  { emoji: '😢', label: 'Tom triste', variable: '{{tom triste}}', elevenlabs: '[sadly]' },
  { emoji: '😠', label: 'Tom irritado', variable: '{{tom irritado}}', elevenlabs: '[angrily]' },
  { emoji: '😨', label: 'Tom assustado', variable: '{{tom assustado}}', elevenlabs: '[fearfully]' },
  { emoji: '🎉', label: 'Empolgação', variable: '{{empolgação}}', elevenlabs: '[excitedly]' },
  { emoji: '😏', label: 'Ironia', variable: '{{ironia}}', elevenlabs: '[sarcastically]' },
  { emoji: '🌟', label: 'Tom entusiasmado', variable: '{{tom entusiasmado}}', elevenlabs: '[enthusiastically]' },
  { emoji: '🤫', label: 'Tom conspiratório', variable: '{{tom conspiratório}}', elevenlabs: '[in a conspiratorial tone]' },
  { emoji: '⚡', label: 'Tom de urgência', variable: '{{tom de urgência}}', elevenlabs: '[urgently]' },
  { emoji: '🕵️', label: 'Tom misterioso', variable: '{{tom misterioso}}', elevenlabs: '[mysteriously]' },
  { emoji: '💪', label: 'Empoderada', variable: '{{empoderada}}', elevenlabs: '[empoweringly]' },
  { emoji: '😤', label: 'Indignado', variable: '{{indignado}}', elevenlabs: '[indignantly]' },
  { emoji: '😱', label: 'Em pânico', variable: '{{em pânico}}', elevenlabs: '[panicking]' },
  { emoji: '🤔', label: 'Tom desconfiado', variable: '{{tom desconfiado}}', elevenlabs: '[suspiciously]' },
  { emoji: '🥰', label: 'Tom suave', variable: '{{tom suave}}', elevenlabs: '[softly]' },
  { emoji: '🤗', label: 'Tom acolhedor', variable: '{{tom acolhedor}}', elevenlabs: '[warmly]' },
  { emoji: '😌', label: 'Tom prestativo', variable: '{{tom prestativo}}', elevenlabs: '[helpfully]' },
  // Estilos/Personagens
  { emoji: '🎅', label: 'Voz de Papai Noel', variable: '{{voz de papai noel}}', elevenlabs: '[speaking like Santa Claus, jolly and warm]' },
  { emoji: '🧪', label: 'Cientista maluco', variable: '{{cientista maluco}}', elevenlabs: '[speaking like a mad scientist, excited and erratic]' },
  { emoji: '🎙️', label: 'Locução profissional', variable: '{{locução profissional}}', elevenlabs: '[speaking in a professional broadcast voice]' },
  { emoji: '📖', label: 'Narrador de suspense', variable: '{{narrador de suspense}}', elevenlabs: '[speaking like a suspense narrator, dramatic and tense]' },
  { emoji: '👴', label: 'Voz de velhinho', variable: '{{voz de velhinho}}', elevenlabs: '[speaking like an elderly person, slow and wise]' },
  { emoji: '😎', label: 'Locução coloquial', variable: '{{locução coloquial}}', elevenlabs: '[speaking casually and informally]' },
  { emoji: '🤡', label: 'Locução caricata', variable: '{{locução caricata}}', elevenlabs: '[speaking in an exaggerated caricature voice]' },
  { emoji: '💼', label: 'Locução cordial', variable: '{{locução cordial}}', elevenlabs: '[speaking cordially and professionally]' },
  { emoji: '😄', label: 'Locução amigável', variable: '{{locução amigável}}', elevenlabs: '[speaking in a friendly, approachable way]' },
  // Ações/Efeitos
  { emoji: '😂', label: 'Risada', variable: '{{risada}}', elevenlabs: '[laughs]' },
  { emoji: '🤣', label: 'Gargalhada', variable: '{{gargalhada}}', elevenlabs: '[laughs loudly]' },
  { emoji: '😮', label: 'Suspiro', variable: '{{suspiro}}', elevenlabs: '[sighs]' },
  { emoji: '😭', label: 'Choro', variable: '{{choro}}', elevenlabs: '[crying]' },
  { emoji: '😊', label: 'Sorrindo', variable: '{{sorrindo}}', elevenlabs: '[smiling]' },
  { emoji: '😆', label: 'Rindo', variable: '{{rindo}}', elevenlabs: '[chuckling]' },
  { emoji: '😤', label: 'Respiração ofegante', variable: '{{respiração ofegante}}', elevenlabs: '[breathing heavily]' },
  { emoji: '💨', label: 'Puxa o ar e solta', variable: '{{puxa o ar e solta}}', elevenlabs: '[takes a deep breath and exhales]' },
  { emoji: '📢', label: 'Gritando', variable: '{{gritando}}', elevenlabs: '[shouting]' },
  // Pausas
  { emoji: '⏸', label: 'Pausa curta', variable: '{{pausa curta}}', elevenlabs: '<break time="0.5s"/>' },
  { emoji: '⏸⏸', label: 'Pausa longa', variable: '{{pausa longa}}', elevenlabs: '<break time="1.5s"/>' },
  { emoji: '⏱️', label: 'Pausa 2 segundos', variable: '{{pausa 2 segundos}}', elevenlabs: '<break time="2s"/>' },
  { emoji: '⏱️', label: 'Pausa 3 segundos', variable: '{{pausa 3 segundos}}', elevenlabs: '<break time="3s"/>' },
  { emoji: '⏱️', label: 'Pausa 5 segundos', variable: '{{pausa 5 segundos}}', elevenlabs: '<break time="5s"/>' },
  // Modulação
  { emoji: '🔊', label: 'Ênfase', variable: '{{ênfase}}', elevenlabs: '[with emphasis]' },
  { emoji: '🤫', label: 'Sussurro', variable: '{{sussurro}}', elevenlabs: '(em voz baixa)' },
  { emoji: '🍺', label: 'Voz embriagada', variable: '{{voz embriagada}}', elevenlabs: '[speaking as if drunk, slurring words]' },
  { emoji: '🤭', label: 'Sussurrando baixinho', variable: '{{sussurrando baixinho}}', elevenlabs: '[whispering very quietly]' },
  { emoji: '🎵', label: 'Locução suave', variable: '{{locução suave}}', elevenlabs: '[speaking smoothly and gently]' },
  { emoji: '🗣️', label: 'Fala entusiasmada', variable: '{{fala entusiasmada}}', elevenlabs: '[speaking with great enthusiasm]' },
];

export const VARIABLE_CATEGORIES: VariableCategory[] = [
  {
    name: 'Tons e Emoções',
    icon: '🎭',
    variables: EMOTION_VARIABLES.filter((_, i) => i < 17),
  },
  {
    name: 'Estilos e Personagens',
    icon: '🎬',
    variables: EMOTION_VARIABLES.filter((_, i) => i >= 17 && i < 26),
  },
  {
    name: 'Ações e Efeitos',
    icon: '🎬',
    variables: EMOTION_VARIABLES.filter((_, i) => i >= 26 && i < 35),
  },
  {
    name: 'Pausas',
    icon: '⏸',
    variables: EMOTION_VARIABLES.filter((_, i) => i >= 35 && i < 40),
  },
  {
    name: 'Modulação',
    icon: '🎛️',
    variables: EMOTION_VARIABLES.filter((_, i) => i >= 40),
  },
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
  // Also handle custom variables like {{anything}} - pass through as contextual instruction
  converted = converted.replace(/\{\{([^}]+)\}\}/g, '[$1]');
  return converted;
}

/** Count characters excluding {{...}} variables */
export function countCharactersExcludingVariables(text: string): number {
  return text.replace(/\{\{[^}]+\}\}/g, '').length;
}

/** Calculate credits cost based on character count */
export function calculateCreditsCost(charCount: number): number {
  return Math.max(1, Math.ceil(charCount / 100));
}
