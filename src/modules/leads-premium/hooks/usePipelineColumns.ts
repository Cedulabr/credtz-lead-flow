import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PipelineColumn {
  id: string;
  module: string;
  column_key: string;
  label: string;
  icon: string;
  color_from: string;
  color_to: string;
  text_color: string;
  bg_color: string;
  border_color: string;
  dot_color: string;
  sort_order: number;
  is_active: boolean;
}

const FALLBACK_COLUMNS: PipelineColumn[] = [
  { id: '1', module: 'leads_premium', column_key: 'new_lead', label: 'Novos', icon: 'Sparkles', color_from: 'from-blue-500', color_to: 'to-blue-600', text_color: 'text-blue-700', bg_color: 'bg-blue-50', border_color: 'border-blue-200', dot_color: 'bg-blue-500', sort_order: 1, is_active: true },
  { id: '2', module: 'leads_premium', column_key: 'autolead', label: 'Auto Leads', icon: 'Bot', color_from: 'from-teal-500', color_to: 'to-cyan-500', text_color: 'text-teal-700', bg_color: 'bg-teal-50', border_color: 'border-teal-200', dot_color: 'bg-teal-500', sort_order: 2, is_active: true },
  { id: '3', module: 'leads_premium', column_key: 'aguardando_retorno', label: 'Aguard. Retorno', icon: 'Clock', color_from: 'from-purple-500', color_to: 'to-fuchsia-500', text_color: 'text-purple-700', bg_color: 'bg-purple-50', border_color: 'border-purple-200', dot_color: 'bg-purple-500', sort_order: 3, is_active: true },
  { id: '4', module: 'leads_premium', column_key: 'agendamento', label: 'Agendamento', icon: 'Calendar', color_from: 'from-cyan-500', color_to: 'to-teal-500', text_color: 'text-cyan-700', bg_color: 'bg-cyan-50', border_color: 'border-cyan-200', dot_color: 'bg-cyan-500', sort_order: 4, is_active: true },
  { id: '5', module: 'leads_premium', column_key: 'cliente_fechado', label: 'Fechados', icon: 'CheckCircle', color_from: 'from-emerald-500', color_to: 'to-green-500', text_color: 'text-emerald-700', bg_color: 'bg-emerald-50', border_color: 'border-emerald-200', dot_color: 'bg-emerald-500', sort_order: 5, is_active: true },
  { id: '6', module: 'leads_premium', column_key: 'recusou_oferta', label: 'Recusados', icon: 'XCircle', color_from: 'from-rose-500', color_to: 'to-red-500', text_color: 'text-rose-700', bg_color: 'bg-rose-50', border_color: 'border-rose-200', dot_color: 'bg-rose-500', sort_order: 6, is_active: true },
  { id: '7', module: 'leads_premium', column_key: 'sem_possibilidade', label: 'Sem Possibilidade', icon: 'MinusCircle', color_from: 'from-stone-500', color_to: 'to-stone-700', text_color: 'text-stone-700', bg_color: 'bg-stone-50', border_color: 'border-stone-300', dot_color: 'bg-stone-500', sort_order: 7, is_active: true },
];

export function usePipelineColumns() {
  const queryClient = useQueryClient();

  const { data: columns = FALLBACK_COLUMNS, isLoading } = useQuery({
    queryKey: ['pipeline-columns', 'leads_premium'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_columns')
        .select('*')
        .eq('module', 'leads_premium')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error || !data || data.length === 0) {
        console.warn('Falling back to hardcoded pipeline columns', error);
        return FALLBACK_COLUMNS;
      }
      return data as PipelineColumn[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const addColumn = useMutation({
    mutationFn: async (col: Omit<PipelineColumn, 'id' | 'module' | 'is_active'>) => {
      const { error } = await supabase
        .from('pipeline_columns')
        .insert({ ...col, module: 'leads_premium', is_active: true });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-columns'] });
      toast.success('Coluna adicionada com sucesso');
    },
    onError: (e: any) => toast.error('Erro ao adicionar coluna: ' + e.message),
  });

  const updateColumn = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PipelineColumn> & { id: string }) => {
      const { error } = await supabase
        .from('pipeline_columns')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-columns'] });
      toast.success('Coluna atualizada');
    },
    onError: (e: any) => toast.error('Erro ao atualizar: ' + e.message),
  });

  const removeColumn = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pipeline_columns')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-columns'] });
      toast.success('Coluna removida');
    },
    onError: (e: any) => toast.error('Erro ao remover: ' + e.message),
  });

  const reorderColumns = useMutation({
    mutationFn: async (orderedIds: { id: string; sort_order: number }[]) => {
      for (const item of orderedIds) {
        const { error } = await supabase
          .from('pipeline_columns')
          .update({ sort_order: item.sort_order })
          .eq('id', item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-columns'] });
    },
    onError: (e: any) => toast.error('Erro ao reordenar: ' + e.message),
  });

  return {
    columns,
    isLoading,
    addColumn,
    updateColumn,
    removeColumn,
    reorderColumns,
  };
}
