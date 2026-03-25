import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, TrendingDown, TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVoicerCredits } from '../hooks/useVoicerCredits';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
}

export function CreditsView() {
  const { user } = useAuth();
  const { balance, loading: balanceLoading } = useVoicerCredits();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsed, setTotalUsed] = useState(0);
  const [totalAdded, setTotalAdded] = useState(0);

  useEffect(() => {
    if (user) loadTransactions();
  }, [user]);

  const loadTransactions = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('voicer_credit_transactions' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      const txs = (data as any[] || []) as Transaction[];
      setTransactions(txs);

      const used = txs.filter(t => t.type === 'debit').reduce((s, t) => s + Number(t.amount), 0);
      const added = txs.filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.amount), 0);
      setTotalUsed(used);
      setTotalAdded(added);
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Coins className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Créditos</h2>
          <p className="text-sm text-muted-foreground">Gerencie seu saldo e acompanhe o consumo</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo Atual</p>
                <p className="text-3xl font-bold text-primary">{balanceLoading ? '...' : balance}</p>
              </div>
              <Coins className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Utilizado</p>
                <p className="text-3xl font-bold text-destructive">{totalUsed}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-destructive/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Adicionado</p>
                <p className="text-3xl font-bold text-green-600">{totalAdded}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Histórico de Transações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma transação encontrada</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'debit' ? 'bg-destructive/10' : 'bg-green-500/10'}`}>
                      {tx.type === 'debit' ? (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.description || (tx.type === 'debit' ? 'Geração de áudio' : 'Créditos adicionados')}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(tx.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <Badge variant={tx.type === 'debit' ? 'destructive' : 'default'} className="text-xs">
                    {tx.type === 'debit' ? '-' : '+'}{tx.amount}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
