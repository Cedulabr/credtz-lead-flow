import { useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { countCharactersExcludingVariables, calculateCreditsCost } from '../utils/variableConverter';
import { VariablesDialog } from './VariablesDialog';

interface TextEditorProps {
  text: string;
  onChange: (text: string) => void;
}

const MAX_CHARS = 5000;

export function TextEditor({ text, onChange }: TextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <div className="space-y-3">
      {/* Variable button bar */}
      <VariablesDialog onInsert={insertVariable} />

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
