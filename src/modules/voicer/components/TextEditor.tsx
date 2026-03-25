import { useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { countCharactersExcludingVariables, calculateCreditsCost } from '../utils/variableConverter';
import { VariableButtons } from './VariableButtons';

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
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = text.slice(0, start) + variable + text.slice(end);

    if (newText.length <= MAX_CHARS) {
      onChange(newText);
      // Restore cursor position after variable
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + variable.length;
        textarea.focus();
      }, 0);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Texto do Áudio</h3>
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

      <Textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => {
          if (e.target.value.length <= MAX_CHARS) {
            onChange(e.target.value);
          }
        }}
        placeholder="Digite ou cole o texto que será convertido em áudio..."
        className="min-h-[200px] md:min-h-[280px] font-mono text-sm resize-none"
      />

      <VariableButtons onInsert={insertVariable} />
    </div>
  );
}
