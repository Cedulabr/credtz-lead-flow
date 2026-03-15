import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Landmark, 
  FileText, 
  Loader2,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useJoinBankAPI } from '@/modules/baseoff/hooks/useJoinBankAPI';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function AdminBankingAPI() {
  const api = useJoinBankAPI();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);

  const checkConnection = async () => {
    setIsConnected(null);
    const result = await api.testConnection();
    setIsConnected(result);
    if (result) toast.success('API bancária conectada!');
    else toast.error('Falha na conexão com a API');
  };

  const loadProducts = async () => {
    const data = await api.listProducts();
    if (data?.items || Array.isArray(data)) {
      setProducts(data?.items || data);
    }
  };

  const loadRules = async () => {
    const data = await api.listRules();
    if (data?.items || Array.isArray(data)) {
      setRules(data?.items || data);
    }
  };

  const loadProposals = async () => {
    setLoadingProposals(true);
    try {
      const { data, error } = await supabase
        .from('joinbank_proposals' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error && data) setProposals(data as any[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProposals(false);
    }
  };

  useEffect(() => {
    checkConnection();
    loadProposals();
  }, []);

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isConnected === null ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : isConnected ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-destructive" />
              )}
              <div>
                <p className="font-semibold">JoinBank API</p>
                <p className="text-xs text-muted-foreground">api.ajin.io/v3</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? 'default' : isConnected === false ? 'destructive' : 'secondary'}>
                {isConnected === null ? 'Verificando...' : isConnected ? 'Conectada' : 'Desconectada'}
              </Badge>
              <Button variant="ghost" size="sm" onClick={checkConnection} disabled={api.loading}>
                <RefreshCw className={`w-4 h-4 ${api.loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="products">
        <TabsList className="w-full">
          <TabsTrigger value="products" className="flex-1">Produtos</TabsTrigger>
          <TabsTrigger value="rules" className="flex-1">Tabelas</TabsTrigger>
          <TabsTrigger value="proposals" className="flex-1">Propostas</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-3">
          <Button onClick={loadProducts} disabled={api.loading} size="sm" className="gap-2">
            {api.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Landmark className="w-4 h-4" />}
            Carregar Produtos
          </Button>
          {products.length > 0 ? (
            <div className="grid gap-2">
              {products.map((p: any, i: number) => (
                <Card key={p.id || i}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{p.name || 'Produto ' + (i + 1)}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.operation?.name || ''} · {p.lender?.name || ''} · Cód: {p.code || ''}
                      </p>
                    </div>
                    <Badge variant="secondary">{p.type?.name || 'INSS'}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              Clique para carregar os produtos disponíveis
            </p>
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-3">
          <Button onClick={loadRules} disabled={api.loading} size="sm" className="gap-2">
            {api.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Carregar Tabelas
          </Button>
          {rules.length > 0 ? (
            <div className="grid gap-2 max-h-[400px] overflow-auto">
              {rules.map((r: any, i: number) => (
                <Card key={r.id || i}>
                  <CardContent className="p-3">
                    <p className="font-medium text-sm">{r.name || r.product?.name || 'Tabela ' + (i + 1)}</p>
                    <p className="text-xs text-muted-foreground">
                      ID: {r.id?.slice(0, 8)}... · {r.lender?.name || ''}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              Clique para carregar as tabelas de operação
            </p>
          )}
        </TabsContent>

        <TabsContent value="proposals" className="space-y-3">
          <Button onClick={loadProposals} disabled={loadingProposals} size="sm" className="gap-2">
            {loadingProposals ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Atualizar
          </Button>
          {proposals.length > 0 ? (
            <div className="grid gap-2 max-h-[400px] overflow-auto">
              {proposals.map((p: any) => (
                <Card key={p.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{p.client_name}</p>
                      <p className="text-xs text-muted-foreground">
                        CPF: {p.client_cpf} · {p.operation_type} · {new Date(p.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Badge variant={p.status === 'enviada' ? 'default' : 'secondary'}>
                      {p.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma proposta digitada ainda
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
