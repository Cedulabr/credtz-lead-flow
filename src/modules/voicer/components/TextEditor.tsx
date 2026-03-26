import { useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Sparkles, Loader2 } from 'lucide-react';
import { countCharactersExcludingVariables, calculateCreditsCost } from '../utils/variableConverter';
import { VariablesDialog } from './VariablesDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TextEditorProps {
  text: string;
  onChange: (text: string) => void;
}

const MAX_CHARS = 5000;

export function TextEditor({ text, onChange }: TextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);

  const charCount = countCharactersExcludingVariables(text);
  const totalLength = text.length;
  const creditsCost = calculateCreditsCost(charCount);

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(text + variable);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = text.slice(0, start) + variable + text.slice(end);

    if (newText.length <= MAX_CHARS) {
      onChange(newText);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + variable.length;
        textarea.focus();
      }, 0);
    }
  };

  const handleEnhanceText = async () => {
    if (!text || text.trim().length < 10) {
      toast.error('Digite pelo menos 10 caracteres para usar a IA');
      return;
    }

    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('voicer-enhance-text', {
        body: { text },
      });

      if (error) throw error;
      if (!data?.enhancedText) throw new Error('IA não retornou texto');

      onChange(data.enhancedText);
      toast.success('Texto enriquecido com variáveis de fala!');
    } catch (err: any) {
      console.error('Error enhancing text:', err);
      toast.error(err?.message || 'Erro ao enriquecer texto com IA');
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Variable button bar */}
      <div className="flex items-center gap-2">
        <VariablesDialog onInsert={insertVariable} />
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleEnhanceText}
          disabled={isEnhancing || !text || text.trim().length < 10}
        >
          {isEnhancing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isEnhancing ? 'Aplicando IA...' : 'Adicionar emoções com IA'}
        </Button>
      </div>

      <Textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => {
          if (e.target.value.length <= MAX_CHARS) {
            onChange(e.target.value);
          }
        }}
        placeholder="Digite ou cole o texto que será convertido em áudio. Use variáveis de fala como {{tom animado}} para adicionar emoções..."
        className="min-h-[220px] md:min-h-[300px] font-mono text-sm resize-none"
      />

      {/* Footer: stats + clear */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-destructive gap-1.5"
          onClick={() => onChange('')}
          disabled={!text}
        >
          <Trash2 className="h-3.5 w-3.5" /> Limpar texto
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {charCount} chars
          </Badge>
          <Badge variant="secondary" className="text-xs">
            ~{creditsCost} crédito{creditsCost !== 1 ? 's' : ''}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {totalLength}/{MAX_CHARS}
          </span>
        </div>
      </div>
    </div>
  );
}
