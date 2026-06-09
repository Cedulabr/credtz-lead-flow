import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { History, FileText, CheckCircle, XCircle, AlertCircle, Ban, Undo2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ImportHistoryProps {
  module: 'activate_leads' | 'leads_database' | 'baseoff_clients';
  title?: string;
}

const moduleLabels: Record<string, string> = {
  activate_leads: 'Activate Leads',
  leads_database: 'Leads Premium',
  baseoff_clients: 'Base Off',
};

export function ImportHistory({ module, title }: ImportHistoryProps) {
  const [open, setOpen] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = profile?.role === 'admin';

  // Blacklist Management State
  const [blacklistDialogOpen, setBlacklistDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [blacklistReason, setBlacklistReason] = useState('');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['import-logs', module],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('import_logs')
        .select('*')
        .eq('module', module)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: open && !!user,
  });

  const toggleBlacklistMutation = useMutation({
    mutationFn: async ({ id, is_blacklisted, reason }: { id: string; is_blacklisted: boolean; reason?: string }) => {
      const { error } = await supabase
        .from('import_logs')
        .update({
          is_blacklisted,
          blacklist_reason: reason || null,
          blacklisted_at: is_blacklisted ? new Date().toISOString() : null,
          blacklisted_by: is_blacklisted ? user?.id : null
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-logs', module] });
      toast({
        title: selectedBatch?.is_blacklisted ? "Lote reativado" : "Lote bloqueado",
        description: selectedBatch?.is_blacklisted ? "Os leads deste lote agora estão disponíveis." : "Os leads deste lote foram movidos para a lista negra.",
      });
      setBlacklistDialogOpen(false);
      setSelectedBatch(null);
      setBlacklistReason('');
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar status do lote",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleToggleBlacklist = (log: any) => {
    if (!isAdmin) return;
    
    if (log.is_blacklisted) {
      // Direct removal from blacklist
      setSelectedBatch(log);
      toggleBlacklistMutation.mutate({ id: log.id, is_blacklisted: false });
    } else {
      // Open dialog to provide reason
      setSelectedBatch(log);
      setBlacklistDialogOpen(true);
    }
  };

  const confirmBlacklist = () => {
    if (!selectedBatch) return;
    toggleBlacklistMutation.mutate({
      id: selectedBatch.id,
      is_blacklisted: true,
      reason: blacklistReason
    });
  };

  const getStatusBadge = (status: string, isBlacklisted?: boolean) => {
    if (isBlacklisted) {
      return (
        <Badge variant="destructive" className="bg-red-600">
          <Ban className="w-3 h-3 mr-1" />
          Lista Negra
        </Badge>
      );
    }

    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Concluído
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Falhou
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="secondary">
            <AlertCircle className="w-3 h-3 mr-1" />
            Processando
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <History className="w-4 h-4 mr-2" />
            Histórico de Importações
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-5xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Histórico de Importações - {title || moduleLabels[module]}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[60vh]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : logs && logs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Sucesso</TableHead>
                    <TableHead className="text-center">Erros</TableHead>
                    <TableHead className="text-center">Duplicados</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className={log.is_blacklisted ? "bg-red-50/50 opacity-80" : ""}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={log.file_name}>
                        {log.file_name}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {log.total_records}
                      </TableCell>
                      <TableCell className="text-center text-green-600 font-medium">
                        {log.success_count}
                      </TableCell>
                      <TableCell className="text-center text-red-600 font-medium">
                        {log.error_count}
                      </TableCell>
                      <TableCell className="text-center text-yellow-600 font-medium">
                        {log.duplicate_count}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status, log.is_blacklisted)}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button
                            variant={log.is_blacklisted ? "outline" : "destructive"}
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => handleToggleBlacklist(log)}
                            disabled={toggleBlacklistMutation.isPending && selectedBatch?.id === log.id}
                          >
                            {log.is_blacklisted ? (
                              <>
                                <Undo2 className="h-4 w-4 mr-1" />
                                Reativar
                              </>
                            ) : (
                              <>
                                <Ban className="h-4 w-4 mr-1" />
                                Blacklist
                              </>
                            )}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <History className="w-12 h-12 mb-4 opacity-50" />
                <p>Nenhuma importação registrada ainda.</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Blacklist Confirmation Dialog */}
      <Dialog open={blacklistDialogOpen} onOpenChange={setBlacklistDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Ban className="h-5 w-5" />
              Bloquear Lote (Lista Negra)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Ao adicionar este lote à lista negra, todos os leads vinculados a ele serão bloqueados e não poderão ser solicitados pelos vendedores.
            </p>
            {selectedBatch && (
              <div className="p-3 bg-muted rounded-md text-xs space-y-1 border">
                <p><strong>Arquivo:</strong> {selectedBatch.file_name}</p>
                <p><strong>Total de leads:</strong> {selectedBatch.success_count}</p>
                <p><strong>Importado em:</strong> {format(new Date(selectedBatch.created_at), "dd/MM/yyyy HH:mm")}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo do bloqueio (opcional)</Label>
              <Textarea
                id="reason"
                placeholder="Ex: Baixa qualidade, base antiga, duplicidade detectada..."
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.value)}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlacklistDialogOpen(false)}>Cancelar</Button>
            <Button 
              variant="destructive" 
              onClick={confirmBlacklist}
              disabled={toggleBlacklistMutation.isPending}
            >
              {toggleBlacklistMutation.isPending ? "Processando..." : "Confirmar Bloqueio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

