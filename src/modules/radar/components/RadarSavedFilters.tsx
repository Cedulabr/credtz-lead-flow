import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Bookmark, Trash2, Save } from 'lucide-react';
import { RadarFilters, SavedFilter } from '../types';
import { toast } from 'sonner';

interface Props {
  currentFilters: RadarFilters;
  onApplyFilter: (filters: RadarFilters) => void;
}

export function RadarSavedFilters({ currentFilters, onApplyFilter }: Props) {
  const { user } = useAuth();
  const [filters, setFilters] = useState<SavedFilter[]>([]);
  const [showSave, setShowSave] = useState(false);
  const [name, setName] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('radar_saved_filters')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setFilters((data || []) as any);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!user?.id || !name.trim()) return;
    const { error } = await supabase
      .from('radar_saved_filters')
      .insert({ user_id: user.id, name: name.trim(), filters: currentFilters as any });
    if (error) { toast.error('Erro ao salvar filtro'); return; }
    toast.success('Filtro salvo!');
    setShowSave(false);
    setName('');
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('radar_saved_filters').delete().eq('id', id);
    load();
  };

  const hasFilters = Object.keys(currentFilters).length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Bookmark className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Meus filtros:</span>
        {filters.map(f => (
          <div key={f.id} className="flex items-center gap-1">
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-primary/10"
              onClick={() => onApplyFilter(f.filters)}
            >
              {f.name}
            </Badge>
            <button onClick={() => handleDelete(f.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {hasFilters && (
          <Button size="sm" variant="ghost" className="gap-1 text-xs h-7" onClick={() => setShowSave(true)}>
            <Save className="h-3 w-3" />
            Salvar filtro
          </Button>
        )}
      </div>

      <Dialog open={showSave} onOpenChange={setShowSave}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Filtro</DialogTitle>
          </DialogHeader>
          <Input placeholder="Nome do filtro" value={name} onChange={e => setName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSave(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!name.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
