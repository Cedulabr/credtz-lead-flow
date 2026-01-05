import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { History, User, FileText, CheckCircle, XCircle, Edit } from 'lucide-react';
import { UserDataHistory } from './types';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HistoryLogProps {
  userDataId: string | null;
}

export function HistoryLog({ userDataId }: HistoryLogProps) {
  const [history, setHistory] = useState<(UserDataHistory & { user_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userDataId) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('user_data_history')
        .select('*')
        .eq('user_data_id', userDataId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Get user names for each entry
        const enrichedHistory = await Promise.all(
          data.map(async (entry) => {
            if (entry.changed_by) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', entry.changed_by)
                .single();
              return { ...entry, user_name: profile?.name || 'Usuário' };
            }
            return { ...entry, user_name: 'Sistema' };
          })
        );
        setHistory(enrichedHistory);
      }
      setLoading(false);
    };

    fetchHistory();
  }, [userDataId]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'updated':
        return <Edit className="h-4 w-4 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <History className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      created: 'Cadastro criado',
      updated: 'Dados atualizados',
      approved: 'Cadastro aprovado',
      rejected: 'Cadastro reprovado',
    };
    return labels[action] || action;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando histórico...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de Alterações
        </CardTitle>
        <CardDescription>Registro de todas as alterações no cadastro</CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma alteração registrada</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-4">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className="mt-0.5">{getActionIcon(entry.action)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{getActionLabel(entry.action)}</span>
                      <Badge variant="outline" className="text-xs">
                        <User className="h-3 w-3 mr-1" />
                        {entry.user_name}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    {entry.changes && Object.keys(entry.changes).length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span className="font-medium">Campos alterados: </span>
                        {Object.keys(entry.changes).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
