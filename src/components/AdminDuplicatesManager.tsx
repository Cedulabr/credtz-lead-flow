import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Trash2, 
  Loader2, 
  AlertTriangle,
  RefreshCw,
  Database,
  HardDrive,
  Users,
  FileSpreadsheet,
  CheckCircle2
} from "lucide-react";

interface TableStats {
  table_name: string;
  total_records: number;
  duplicate_count: number;
  estimated_size: string;
}

export function AdminDuplicatesManager() {
  const { toast } = useToast();
  const [stats, setStats] = useState<TableStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Dialog states
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      // Fetch stats for each table separately since the RPC might be slow
      const [leadsResult, baseoffResult] = await Promise.all([
        fetchLeadsStats(),
        fetchBaseoffStats()
      ]);
      
      setStats([leadsResult, baseoffResult].filter(Boolean) as TableStats[]);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      toast({
        title: "Erro ao carregar estatísticas",
        description: error.message || "Não foi possível carregar as estatísticas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeadsStats = async (): Promise<TableStats | null> => {
    try {
      // Get total count
      const { count: totalCount } = await supabase
        .from('leads_database')
        .select('*', { count: 'exact', head: true });
      
      // Get duplicate count using RPC
      const { data: duplicateCount, error: dupError } = await supabase
        .rpc('count_leads_database_duplicates');
      
      if (dupError) {
        console.error('Error counting leads duplicates:', dupError);
      }
      
      return {
        table_name: 'leads_database',
        total_records: totalCount || 0,
        duplicate_count: duplicateCount || 0,
        estimated_size: 'N/A'
      };
    } catch (error) {
      console.error('Error fetching leads stats:', error);
      return null;
    }
  };

  const fetchBaseoffStats = async (): Promise<TableStats | null> => {
    try {
      // Get total count
      const { count: totalCount } = await supabase
        .from('baseoff_clients')
        .select('*', { count: 'exact', head: true });
      
      // Get duplicate count using RPC
      const { data: duplicateCount, error: dupError } = await supabase
        .rpc('count_baseoff_duplicates');
      
      if (dupError) {
        console.error('Error counting baseoff duplicates:', dupError);
      }
      
      return {
        table_name: 'baseoff_clients',
        total_records: totalCount || 0,
        duplicate_count: duplicateCount || 0,
        estimated_size: 'N/A'
      };
    } catch (error) {
      console.error('Error fetching baseoff stats:', error);
      return null;
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStats();
    setIsRefreshing(false);
    toast({
      title: "Estatísticas atualizadas",
      description: "As informações foram recarregadas com sucesso",
    });
  };

  const openRemoveDialog = (tableName: string) => {
    setSelectedTable(tableName);
    setShowRemoveDialog(true);
  };

  const handleRemoveDuplicates = async () => {
    if (!selectedTable) return;
    
    setIsRemoving(true);
    try {
      let deletedCount = 0;
      
      if (selectedTable === 'leads_database') {
        const { data, error } = await supabase.rpc('remove_leads_database_duplicates');
        if (error) throw error;
        deletedCount = data || 0;
      } else if (selectedTable === 'baseoff_clients') {
        const { data, error } = await supabase.rpc('remove_baseoff_duplicates');
        if (error) throw error;
        deletedCount = data || 0;
      }
      
      toast({
        title: "Duplicatas removidas!",
        description: `${deletedCount.toLocaleString('pt-BR')} registros duplicados foram removidos da tabela ${getTableDisplayName(selectedTable)}`,
      });
      
      setShowRemoveDialog(false);
      setSelectedTable(null);
      
      // Refresh stats
      await fetchStats();
    } catch (error: any) {
      console.error('Error removing duplicates:', error);
      toast({
        title: "Erro ao remover duplicatas",
        description: error.message || "Não foi possível remover as duplicatas",
        variant: "destructive",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  const getTableDisplayName = (tableName: string) => {
    switch (tableName) {
      case 'leads_database':
        return 'Leads Premium';
      case 'baseoff_clients':
        return 'Consulta Base OFF';
      default:
        return tableName;
    }
  };

  const getTableIcon = (tableName: string) => {
    switch (tableName) {
      case 'leads_database':
        return <Users className="h-5 w-5" />;
      case 'baseoff_clients':
        return <FileSpreadsheet className="h-5 w-5" />;
      default:
        return <Database className="h-5 w-5" />;
    }
  };

  const getTableDescription = (tableName: string) => {
    switch (tableName) {
      case 'leads_database':
        return 'Duplicatas identificadas por: Telefone + Nome + Convênio';
      case 'baseoff_clients':
        return 'Duplicatas identificadas por: CPF';
      default:
        return '';
    }
  };

  const formatNumber = (num: number) => num.toLocaleString('pt-BR');

  const getHealthPercentage = (total: number, duplicates: number) => {
    if (total === 0) return 100;
    return Math.round(((total - duplicates) / total) * 100);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Carregando estatísticas do banco...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            Gerenciamento de Duplicatas
          </h2>
          <p className="text-muted-foreground text-sm">
            Otimize o banco de dados removendo registros duplicados
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {stats.map((stat) => {
          const healthPercentage = getHealthPercentage(stat.total_records, stat.duplicate_count);
          const hasDuplicates = stat.duplicate_count > 0;
          
          return (
            <Card key={stat.table_name} className={hasDuplicates ? 'border-amber-200 dark:border-amber-800' : 'border-green-200 dark:border-green-800'}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getTableIcon(stat.table_name)}
                    {getTableDisplayName(stat.table_name)}
                  </CardTitle>
                  {hasDuplicates ? (
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Ação recomendada
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Limpo
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs">
                  {getTableDescription(stat.table_name)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-primary">{formatNumber(stat.total_records)}</p>
                    <p className="text-xs text-muted-foreground">Total de Registros</p>
                  </div>
                  <div className={`p-3 rounded-lg ${hasDuplicates ? 'bg-amber-100/50 dark:bg-amber-900/20' : 'bg-muted/50'}`}>
                    <p className={`text-2xl font-bold ${hasDuplicates ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                      {formatNumber(stat.duplicate_count)}
                    </p>
                    <p className="text-xs text-muted-foreground">Duplicatas</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className={`text-2xl font-bold ${healthPercentage >= 95 ? 'text-green-600' : healthPercentage >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                      {healthPercentage}%
                    </p>
                    <p className="text-xs text-muted-foreground">Saúde</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Registros únicos</span>
                    <span>{formatNumber(stat.total_records - stat.duplicate_count)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className={`h-full transition-all ${hasDuplicates ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${healthPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  variant={hasDuplicates ? "destructive" : "outline"}
                  className="w-full"
                  onClick={() => openRemoveDialog(stat.table_name)}
                  disabled={!hasDuplicates}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {hasDuplicates 
                    ? `Remover ${formatNumber(stat.duplicate_count)} Duplicatas` 
                    : 'Sem duplicatas para remover'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Database className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Como funciona a remoção de duplicatas?
              </p>
              <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                <li><strong>Leads Premium:</strong> Mantém o registro mais recente de cada combinação (Telefone + Nome + Convênio)</li>
                <li><strong>Consulta Base OFF:</strong> Mantém o registro mais recente de cada CPF</li>
                <li>Todas as operações são registradas no log de auditoria</li>
                <li>Esta ação <strong>não pode ser desfeita</strong></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Remoção de Duplicatas
            </DialogTitle>
            <DialogDescription>
              Você está prestes a remover todas as duplicatas da tabela{' '}
              <strong>{selectedTable ? getTableDisplayName(selectedTable) : ''}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm">
                <strong>Atenção:</strong> Esta ação irá remover permanentemente os registros duplicados, 
                mantendo apenas o registro mais recente de cada grupo.
              </p>
            </div>
            
            {selectedTable && (
              <div className="text-center py-2">
                <p className="text-3xl font-bold text-destructive">
                  {formatNumber(stats.find(s => s.table_name === selectedTable)?.duplicate_count || 0)}
                </p>
                <p className="text-sm text-muted-foreground">registros serão removidos</p>
              </div>
            )}
            
            <p className="text-sm text-muted-foreground">
              Esta operação não pode ser desfeita. Certifique-se de que deseja continuar.
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRemoveDialog(false)}
              disabled={isRemoving}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRemoveDuplicates}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removendo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Confirmar Remoção
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
