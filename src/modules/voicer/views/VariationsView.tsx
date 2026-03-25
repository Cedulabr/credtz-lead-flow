import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Sparkles, Copy, Check, Loader2, Shuffle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function VariationsView() {
  const { user } = useAuth();
  const [originalText, setOriginalText] = useState('');
  const [variations, setVariations] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [count, setCount] = useState(5);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!originalText.trim()) {
      toast.error('Digite o texto original primeiro');
      return;
    }
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    setGenerating(true);
    setVariations([]);

    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voicer-ai-variations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({ text: originalText, count }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao gerar variações');
      }

      const data = await response.json();
      setVariations(data.variations || []);
      toast.success(`${(data.variations || []).length} variações geradas!`);
    } catch (err) {
      console.error('Variations error:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar variações');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success('Copiado!');
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shuffle className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Variações Anti-Spam</h2>
          <p className="text-sm text-muted-foreground">Gere variações do texto para evitar bloqueios em campanhas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Texto Original
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Cole aqui o texto que deseja variar para campanhas..."
              value={originalText}
              onChange={e => setOriginalText(e.target.value)}
              rows={8}
              className="resize-none"
            />

            <div className="space-y-2">
              <Label className="text-sm">Quantidade de variações: {count}</Label>
              <Slider
                value={[count]}
                onValueChange={v => setCount(v[0])}
                min={2}
                max={10}
                step={1}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={generating || !originalText.trim()}
            >
              {generating ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Gerando variações...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Gerar {count} Variações</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Output */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shuffle className="h-4 w-4" />
              Variações Geradas
              {variations.length > 0 && (
                <Badge variant="secondary" className="text-xs ml-auto">{variations.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {variations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">As variações aparecerão aqui</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {variations.map((v, idx) => (
                  <div key={idx} className="p-3 rounded-lg border bg-card hover:border-primary/20 transition-colors group">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge variant="outline" className="text-[10px] mb-1.5">V{idx + 1}</Badge>
                        <p className="text-sm">{v}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={() => handleCopy(v, idx)}
                      >
                        {copiedIdx === idx ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
