import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { History, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const { user } = useAuth();

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

  const getStatusBadge = (status: string) => {
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="w-4 h-4 mr-2" />
          Histórico de Importações
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
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
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
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
  );
}
