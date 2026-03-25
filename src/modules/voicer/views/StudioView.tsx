import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, Sparkles, Coins } from 'lucide-react';
import { TextEditor } from '../components/TextEditor';
import { VoiceSelector } from '../components/VoiceSelector';
import { AudioControls } from '../components/AudioControls';
import { AudioPlayer } from '../components/AudioPlayer';
import { WaveformAnimation } from '../components/WaveformAnimation';
import { useVoices } from '../hooks/useVoices';
import { useAudioGeneration } from '../hooks/useAudioGeneration';
import { useVoicerCredits } from '../hooks/useVoicerCredits';
import { AudioSettings, Voice } from '../types';
import { countCharactersExcludingVariables, calculateCreditsCost } from '../utils/variableConverter';
import { useIsMobile } from '@/hooks/use-mobile';

const LOCAL_STORAGE_KEY = 'voicer_draft';

const DEFAULT_SETTINGS: AudioSettings = {
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0.0,
  speed: 1.0,
};

export function StudioView() {
  const isMobile = useIsMobile();
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [settings, setSettings] = useState<AudioSettings>(DEFAULT_SETTINGS);

  const { voices, loading: voicesLoading } = useVoices();
  const { generate, generating, audioUrl, setAudioUrl } = useAudioGeneration();
  const { balance, reload: reloadCredits } = useVoicerCredits();

  // Auto-save draft
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) setText(saved);
  }, []);

  useEffect(() => {
    if (text) localStorage.setItem(LOCAL_STORAGE_KEY, text);
  }, [text]);

  const charCount = countCharactersExcludingVariables(text);
  const creditsCost = calculateCreditsCost(charCount);

  const handleGenerate = async () => {
    if (!selectedVoice || !text.trim()) return;
    const result = await generate(text, selectedVoice.voice_id, selectedVoice.name, settings);
    if (result) reloadCredits();
  };

  const handleRegenerate = async () => {
    setAudioUrl(null);
    await handleGenerate();
  };

  const editorSection = (
    <div className="space-y-4">
      <TextEditor text={text} onChange={setText} />
    </div>
  );

  const controlsSection = (
    <div className="space-y-4">
      <VoiceSelector
        voices={voices}
        loading={voicesLoading}
        selectedVoiceId={selectedVoice?.voice_id || null}
        onSelect={setSelectedVoice}
      />

      <AudioControls settings={settings} onChange={setSettings} />

      {/* Generate Button */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Coins className="h-3.5 w-3.5" />
          <span>Custo: {creditsCost} crédito{creditsCost !== 1 ? 's' : ''}</span>
          <span className="text-muted-foreground/60">•</span>
          <span>Saldo: {balance}</span>
        </div>
        <Button
          className="w-full h-11"
          onClick={handleGenerate}
          disabled={generating || !text.trim() || !selectedVoice}
        >
          <Mic className="h-4 w-4 mr-2" />
          {generating ? 'Gerando...' : '🎙️ Gerar Áudio'}
        </Button>
      </div>

      {/* Waveform Animation */}
      {generating && (
        <Card>
          <CardContent className="py-6">
            <WaveformAnimation />
            <p className="text-center text-sm text-muted-foreground mt-2">
              Processando áudio...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Audio Player */}
      {audioUrl && !generating && (
        <AudioPlayer
          audioUrl={audioUrl}
          onRegenerate={handleRegenerate}
          regenerating={generating}
        />
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Studio</h2>
          </div>
          <Badge variant="outline" className="text-xs">
            <Coins className="h-3 w-3 mr-1" /> {balance} créditos
          </Badge>
        </div>
        {editorSection}
        {controlsSection}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Mic className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Studio</h2>
            <p className="text-sm text-muted-foreground">Crie áudios profissionais com IA</p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          <Coins className="h-4 w-4 mr-1.5" /> {balance} créditos
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Editor de Texto</CardTitle>
          </CardHeader>
          <CardContent>{editorSection}</CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Configurações</CardTitle>
            </CardHeader>
            <CardContent>{controlsSection}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
