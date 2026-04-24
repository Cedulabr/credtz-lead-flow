import { useEffect, useState } from "react";
import { Tag, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { AvailableOption } from "../types";

interface Props {
  selected: string[];
  onChange: (tags: string[]) => void;
}

export function TagsField({ selected, onChange }: Props) {
  const [tags, setTags] = useState<AvailableOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.rpc('get_available_tags');
        if (!mounted) return;
        setTags((data || []).map((t: any) => ({ value: t.tag, count: Number(t.available_count) })));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const toggle = (tag: string) => {
    onChange(selected.includes(tag) ? selected.filter(t => t !== tag) : [...selected, tag]);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        Tags
        <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
        {selected.length > 0 && (
          <Badge variant="default" className="ml-auto text-xs">{selected.length}</Badge>
        )}
      </Label>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(t => (
            <Badge key={t} variant="default" className="text-xs cursor-pointer" onClick={() => toggle(t)}>
              {t} <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando tags...</p>
      ) : tags.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma tag disponível</p>
      ) : (
        <ScrollArea className="h-24 rounded-lg border p-2">
          <div className="flex flex-wrap gap-1.5">
            {tags.map(t => (
              <Badge
                key={t.value}
                variant={selected.includes(t.value) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => toggle(t.value)}
              >
                {t.value}<span className="ml-1 opacity-60">({t.count})</span>
              </Badge>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
