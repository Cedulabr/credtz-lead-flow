import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, Coins, ChevronDown, Settings2, AlertTriangle, ShoppingCart } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TextEditor } from '../components/TextEditor';
import { VoiceSelector } from '../components/VoiceSelector';
import { AudioControls } from '../components/AudioControls';
import { AudioPlayer } from '../components/AudioPlayer';
import { WaveformAnimation } from '../components/WaveformAnimation';
import { ExamplesDialog } from '../components/ExamplesDialog';
import { useVoices } from '../hooks/useVoices';
import { useAudioGeneration } from '../hooks/useAudioGeneration';
import { useVoicerCredits } from '../hooks/useVoicerCredits';
import { AudioSettings, Voice } from '../types';
import { countCharactersExcludingVariables, calculateCreditsCost } from '../utils/variableConverter';

const LOCAL_STORAGE_KEY = 'voicer_draft';

const DEFAULT_SETTINGS: AudioSettings = {
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0.0,
  speed: 1.0,
};

export function StudioView() {
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [settings, setSettings] = useState<AudioSettings>(DEFAULT_SETTINGS);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const { voices, loading: voicesLoading } = useVoices();
  const { generate, generating, audioUrl, setAudioUrl } = useAudioGeneration();
  const { balance, reload: reloadCredits } = useVoicerCredits();

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

  const handleUseExample = (exText: string, voiceId: string, voiceName: string) => {
    setText(exText);
    const voice = voices.find((v) => v.voice_id === voiceId);
    if (voice) setSelectedVoice(voice);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      {/* Zero balance alert */}
      {balance === 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm flex-1">Seus créditos acabaram. Adquira mais para continuar.</p>
            <Button size="sm" variant="destructive" className="gap-1.5 shrink-0" onClick={() => window.open('https://easyn.com.br/', '_blank')}>
              <ShoppingCart className="h-3.5 w-3.5" /> Comprar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Top bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Mic className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Easyn Voicer</h2>
            <p className="text-xs text-muted-foreground">Studio de áudio com IA</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <VoiceSelector
            voices={voices}
            loading={voicesLoading}
            selectedVoiceId={selectedVoice?.voice_id || null}
            onSelect={setSelectedVoice}
          />
          <Badge variant="outline" className="text-xs px-2.5 py-1 whitespace-nowrap">
            <Coins className="h-3 w-3 mr-1" /> {balance}
          </Badge>
        </div>
      </div>

      {/* Editor */}
      <Card>
        <CardContent className="pt-5">
          <TextEditor text={text} onChange={setText} />
        </CardContent>
      </Card>

      {/* Advanced settings */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1.5 w-full justify-center">
            <Settings2 className="h-3.5 w-3.5" />
            Configurações avançadas
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2">
            <CardContent className="pt-4">
              <AudioControls settings={settings} onChange={setSettings} />
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <ExamplesDialog onUseExample={handleUseExample} />
        <div className="flex items-center gap-3 sm:ml-auto">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5" />
            Custo: {creditsCost} crédito{creditsCost !== 1 ? 's' : ''}
          </div>
          <Button
            className="h-10 px-6"
            onClick={handleGenerate}
            disabled={generating || !text.trim() || !selectedVoice || balance === 0}
          >
            <Mic className="h-4 w-4 mr-2" />
            {generating ? 'Gerando...' : '🎙️ Gerar Fala'}
          </Button>
        </div>
      </div>

      {/* Waveform */}
      {generating && (
        <Card>
          <CardContent className="py-6">
            <WaveformAnimation />
            <p className="text-center text-sm text-muted-foreground mt-2">Processando áudio...</p>
          </CardContent>
        </Card>
      )}

      {/* Player */}
      {audioUrl && !generating && (
        <AudioPlayer
          audioUrl={audioUrl}
          onRegenerate={handleRegenerate}
          regenerating={generating}
        />
      )}
    </div>
  );
}
