import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Coins, TrendingDown, TrendingUp, Calendar, BarChart3, HelpCircle, AlertTriangle, ShoppingCart } from 'lucide-react';
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
  const [rechargeAmount, setRechargeAmount] = useState('');

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

      {/* Zero balance banner */}
      {!balanceLoading && balance === 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-6 flex flex-col sm:flex-row items-center gap-4">
            <AlertTriangle className="h-8 w-8 text-destructive shrink-0" />
            <div className="flex-1 text-center sm:text-left">
              <p className="font-semibold text-destructive">Seus créditos acabaram!</p>
              <p className="text-sm text-muted-foreground">Adquira mais créditos para continuar gerando áudios.</p>
            </div>
            <Button className="gap-2 shrink-0" onClick={() => window.open('https://easyn.com.br/', '_blank')}>
              <ShoppingCart className="h-4 w-4" /> Comprar Créditos
            </Button>
          </CardContent>
        </Card>
      )}

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
            <div className="mt-3">
              <BillingInfoDialog />
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

      {/* Recharge placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Recarga de Créditos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Escolha o valor que deseja recarregar. Em breve você poderá comprar diretamente na plataforma.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="number"
              placeholder="Ex: 100"
              value={rechargeAmount}
              onChange={(e) => setRechargeAmount(e.target.value)}
              className="max-w-[200px]"
            />
            <Button disabled className="gap-2 opacity-60">
              <Coins className="h-4 w-4" /> Recarregar com PIX (em breve)
            </Button>
          </div>
        </CardContent>
      </Card>

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

function BillingInfoDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground hover:text-primary p-0 h-auto">
          <HelpCircle className="h-3.5 w-3.5" />
          Entenda como cobramos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Como funciona a cobrança?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p>O Easyn Voicer cobra por caractere convertido em áudio.</p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span><strong>1 crédito = 100 caracteres</strong> de texto</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Variáveis de fala <code className="bg-muted px-1 rounded text-xs">{`{{...}}`}</code> <strong>NÃO</strong> são cobradas</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Espaços e pontuação são contados</span>
            </li>
          </ul>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="font-medium text-xs mb-1">Exemplo:</p>
            <p className="text-xs text-muted-foreground">Um texto de 450 caracteres custa <strong>5 créditos</strong>.</p>
          </div>
          <div>
            <p className="font-medium text-sm mb-2">💡 Dicas para economizar:</p>
            <ol className="space-y-1 text-xs text-muted-foreground list-decimal list-inside">
              <li>Use variáveis de fala — elas controlam tom e emoção sem custo extra</li>
              <li>Escreva textos objetivos e diretos</li>
              <li>Teste com textos curtos antes de gerar a versão final</li>
              <li>Use o Gerador de Variações para criar múltiplas versões</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
