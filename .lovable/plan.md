

## Módulo Easyn Voicer — Studio de Geração de Áudios com IA

### Visao Geral

Modulo completo de TTS integrado ao CRM, usando ElevenLabs para geração de voz e Lovable AI (ja disponivel) para sugestao de variaveis e geracao de variacoes anti-spam. Comecaremos pelo **Studio completo** (etapa 1) conforme solicitado.

### Arquitetura

- **ElevenLabs API**: chamada via Edge Function (chave no servidor, nunca no client)
- **Lovable AI**: usada para sugestao de variaveis e geracao de variacoes (LOVABLE_API_KEY ja configurada)
- **Storage**: audios salvos no Supabase Storage bucket `voicer-audios`
- **Banco**: tabelas dedicadas para o modulo

### Pré-requisito: API Key ElevenLabs

Sera necessario adicionar o secret `ELEVENLABS_API_KEY` via ferramenta de secrets. O usuario precisara fornecer a chave.

### Tabelas (Migration SQL)

```sql
-- audio_generations: historico de audios gerados
CREATE TABLE public.audio_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id uuid,
  campaign_id text,
  text_original text NOT NULL,
  text_converted text,
  voice_id text NOT NULL,
  voice_name text,
  audio_url text,
  file_path text,
  duration_seconds numeric,
  characters_count integer DEFAULT 0,
  credits_used numeric DEFAULT 0,
  settings_json jsonb DEFAULT '{}',
  ab_test_group text, -- 'a' | 'b' | null
  status text DEFAULT 'pending', -- pending | processing | ready | error
  created_at timestamptz DEFAULT now()
);

-- audio_variations: variacoes anti-spam
CREATE TABLE public.audio_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid REFERENCES public.audio_generations(id) ON DELETE CASCADE,
  variation_index integer DEFAULT 0,
  text_content text NOT NULL,
  audio_url text,
  file_path text,
  selected boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- voicer_credit_transactions: historico de consumo separado
CREATE TABLE public.voicer_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL, -- 'debit' | 'credit'
  amount numeric NOT NULL,
  description text,
  generation_id uuid REFERENCES public.audio_generations(id),
  created_at timestamptz DEFAULT now()
);

-- ab_tests
CREATE TABLE public.voicer_ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  generation_a_id uuid REFERENCES public.audio_generations(id),
  generation_b_id uuid REFERENCES public.audio_generations(id),
  winner_id uuid REFERENCES public.audio_generations(id),
  campaign_id text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.audio_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voicer_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voicer_ab_tests ENABLE ROW LEVEL SECURITY;

-- Policies: users see own data
CREATE POLICY "Users manage own generations" ON public.audio_generations
  FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users manage own variations" ON public.audio_variations
  FOR ALL TO authenticated USING (
    generation_id IN (SELECT id FROM public.audio_generations WHERE user_id = auth.uid())
  );
CREATE POLICY "Users manage own voicer credits" ON public.voicer_credit_transactions
  FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users manage own ab tests" ON public.voicer_ab_tests
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('voicer-audios', 'voicer-audios', true)
ON CONFLICT DO NOTHING;
```

### Edge Functions

| Funcao | Descricao |
|---|---|
| `elevenlabs-tts` | POST: recebe texto, voice_id, settings. Chama ElevenLabs, retorna audio binario |
| `elevenlabs-voices` | GET: lista vozes disponiveis, cacheia por 1h |
| `voicer-ai-suggest` | POST: usa Lovable AI para inserir variaveis de emocao no texto |
| `voicer-ai-variations` | POST: usa Lovable AI para gerar ate 10 variacoes anti-spam |

### Estrutura de Arquivos

```
src/modules/voicer/
  VoicerModule.tsx          -- Container principal com abas
  types.ts                  -- Tipos do modulo
  utils/
    variableConverter.ts    -- Converte {{risada}} → [laughs] etc.
  hooks/
    useVoices.ts           -- Lista e cacheia vozes ElevenLabs
    useVoicerCredits.ts    -- Saldo e transacoes de creditos
    useAudioGeneration.ts  -- Logica de geracao TTS
  views/
    StudioView.tsx         -- Editor + seletor de voz + controles + player
    VariationsView.tsx     -- Gerador anti-spam (etapa futura)
    ABTestView.tsx         -- Comparacao A/B (etapa futura)
    HistoryView.tsx        -- Meus audios (etapa futura)
    CreditsView.tsx        -- Saldo e consumo (etapa futura)
    SettingsView.tsx       -- Config API key (etapa futura)
  components/
    TextEditor.tsx         -- Textarea com variaveis e contador
    VariableButtons.tsx    -- Botoes de insercao rapida
    VoiceSelector.tsx      -- Grid de vozes com preview
    AudioControls.tsx      -- Sliders de estabilidade, similaridade etc.
    AudioPlayer.tsx        -- Player customizado com download
    WaveformAnimation.tsx  -- Animacao de onda durante geracao
```

### Integracao ao CRM

| Arquivo | Acao |
|---|---|
| `LazyComponents.tsx` | Adicionar `VoicerModule` lazy |
| `Navigation.tsx` | Adicionar item "Easyn Voicer" com icone `Mic` |
| `Index.tsx` | Adicionar tab `voicer` com permissao `can_access_voicer`, registrar no `tabComponents` |
| `supabase/config.toml` | Registrar edge functions `elevenlabs-tts` e `elevenlabs-voices` |

### Studio (Etapa 1) — Detalhes

**Layout desktop**: 2 colunas. Esquerda: editor de texto com variaveis e contador. Direita: seletor de voz, controles de audio, player.

**Layout mobile**: coluna unica com abas (Texto / Voz / Player).

**Tema**: respeita o tema do app (dark/light), com acentos em roxo/violeta para o modulo.

**Fluxo de geracao**:
1. Usuario digita texto e insere variaveis via botoes
2. Seleciona voz (grid com preview)
3. Ajusta sliders (stability, similarity, style, speed)
4. Clica "Gerar Audio" → converte variaveis → chama edge function → salva no Storage
5. Player aparece com opcoes de download, regenerar, salvar

**Conversao de variaveis** (utilitario puro):
```typescript
const VARIABLE_MAP = {
  '{{risada}}': '[laughs]',
  '{{pausa curta}}': '<break time="0.5s"/>',
  '{{pausa longa}}': '<break time="1.5s"/>',
  '{{sussurro}}': '(em voz baixa)',
  '{{empolgação}}': '[excitedly]',
  '{{tom triste}}': '[sadly]',
  '{{tom irritado}}': '[angrily]',
  '{{tom assustado}}': '[fearfully]',
  '{{ironia}}': '[sarcastically]',
  '{{choro}}': '[crying]',
  '{{suspiro}}': '[sighs]',
  '{{tom animado}}': '[cheerfully]',
};
```

**Creditos**: reutiliza a tabela `user_credits` existente. Custo calculado por caracteres (excluindo `{{...}}`). Debito automatico ao gerar.

### Ordem de Implementacao (nesta mensagem)

Apenas **Etapa 1 — Studio completo**: editor, seletor de voz, controles, player, edge functions TTS + voices, tabelas, integracao na navegacao.

Etapas 2-6 serao implementadas em mensagens futuras.

