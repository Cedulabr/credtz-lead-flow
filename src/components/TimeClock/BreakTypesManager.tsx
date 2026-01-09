import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Coffee, Plus, Pencil, Trash2, Loader2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TimeClockBreakType } from './types';

export function BreakTypesManager() {
  const [loading, setLoading] = useState(false);
  const [breakTypes, setBreakTypes] = useState<TimeClockBreakType[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<TimeClockBreakType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_paid: true,
    max_duration_minutes: 15,
    is_active: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadBreakTypes();
  }, []);

  const loadBreakTypes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('time_clock_break_types')
      .select('*')
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error('Erro ao carregar tipos de pausa:', error);
    } else {
      setBreakTypes((data as TimeClockBreakType[]) || []);
    }
    setLoading(false);
  };

  const handleOpenDialog = (breakType?: TimeClockBreakType) => {
    if (breakType) {
      setEditingType(breakType);
      setFormData({
        name: breakType.name,
        description: breakType.description || '',
        is_paid: breakType.is_paid,
        max_duration_minutes: breakType.max_duration_minutes || 15,
        is_active: breakType.is_active,
      });
    } else {
      setEditingType(null);
      setFormData({
        name: '',
        description: '',
        is_paid: true,
        max_duration_minutes: 15,
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome do tipo de pausa é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      if (editingType) {
        const { error } = await supabase
          .from('time_clock_break_types')
          .update({
            name: formData.name,
            description: formData.description || null,
            is_paid: formData.is_paid,
            max_duration_minutes: formData.max_duration_minutes,
            is_active: formData.is_active,
          })
          .eq('id', editingType.id);
        
        if (error) throw error;
        toast({ title: 'Tipo de pausa atualizado!' });
      } else {
        const maxOrder = breakTypes.length > 0 
          ? Math.max(...breakTypes.map(bt => bt.display_order)) + 1 
          : 1;
        
        const { error } = await supabase
          .from('time_clock_break_types')
          .insert({
            name: formData.name,
            description: formData.description || null,
            is_paid: formData.is_paid,
            max_duration_minutes: formData.max_duration_minutes,
            is_active: formData.is_active,
            display_order: maxOrder,
          });
        
        if (error) throw error;
        toast({ title: 'Tipo de pausa criado!' });
      }
      
      setDialogOpen(false);
      loadBreakTypes();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (breakType: TimeClockBreakType) => {
    const { error } = await supabase
      .from('time_clock_break_types')
      .update({ is_active: !breakType.is_active })
      .eq('id', breakType.id);
    
    if (error) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      loadBreakTypes();
    }
  };

  const handleDelete = async (breakType: TimeClockBreakType) => {
    if (!confirm(`Deseja excluir o tipo de pausa "${breakType.name}"?`)) return;
    
    const { error } = await supabase
      .from('time_clock_break_types')
      .delete()
      .eq('id', breakType.id);
    
    if (error) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Tipo de pausa excluído!' });
      loadBreakTypes();
    }
  };

  if (loading && breakTypes.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Coffee className="h-5 w-5" />
              Tipos de Pausa
            </CardTitle>
            <CardDescription>
              Configure os tipos de pausas disponíveis para os colaboradores
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Pausa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingType ? 'Editar Tipo de Pausa' : 'Novo Tipo de Pausa'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Almoço, Banheiro, Café..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição opcional da pausa"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="max_duration">Duração Máxima (minutos)</Label>
                  <Input
                    id="max_duration"
                    type="number"
                    min="1"
                    max="480"
                    value={formData.max_duration_minutes}
                    onChange={(e) => setFormData({ ...formData, max_duration_minutes: parseInt(e.target.value) || 15 })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Pausa Remunerada</Label>
                    <p className="text-sm text-muted-foreground">
                      O tempo dessa pausa é contabilizado nas horas trabalhadas
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_paid}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_paid: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Ativo</Label>
                    <p className="text-sm text-muted-foreground">
                      Disponível para os colaboradores usarem
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
                
                <Button onClick={handleSave} className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editingType ? 'Salvar Alterações' : 'Criar Tipo de Pausa'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {breakTypes.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum tipo de pausa configurado.
          </p>
        ) : (
          <div className="space-y-3">
            {breakTypes.map((breakType) => (
              <div
                key={breakType.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  breakType.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{breakType.name}</span>
                      {breakType.is_paid ? (
                        <Badge variant="secondary" className="text-xs">Remunerada</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Não Remunerada</Badge>
                      )}
                      {!breakType.is_active && (
                        <Badge variant="destructive" className="text-xs">Inativo</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {breakType.description || 'Sem descrição'} • Max: {breakType.max_duration_minutes} min
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleActive(breakType)}
                    title={breakType.is_active ? 'Desativar' : 'Ativar'}
                  >
                    <Switch checked={breakType.is_active} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(breakType)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(breakType)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
