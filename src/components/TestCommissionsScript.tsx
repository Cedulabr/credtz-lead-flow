import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Play, Trash2, CheckCircle } from "lucide-react";

export function TestCommissionsScript() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  if (!isAdmin) {
    return null;
  }

  const createTestCommissions = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      // Buscar todos os usuários partner
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('role', 'partner')
        .eq('is_active', true);
      
      if (usersError) throw usersError;
      
      if (!users || users.length === 0) {
        toast({
          title: "Aviso",
          description: "Nenhum usuário partner encontrado",
          variant: "default",
        });
        setLoading(false);
        return;
      }

      const newResults: string[] = [];
      
      // Criar 2 comissões pagas para cada usuário
      for (const user of users) {
        // Comissão 1 - Banco Picpay
        const commission1 = {
          user_id: user.id,
          client_name: `Cliente Teste ${user.name.split(' ')[0]} A`,
          cpf: '111.222.333-44',
          bank_name: 'Picpay',
          product_type: 'Empréstimo Pessoal',
          credit_value: 5000.00,
          commission_percentage: 3.5,
          commission_amount: 175.00,
          proposal_number: `TESTE-${Date.now()}-1`,
          proposal_date: new Date().toISOString().split('T')[0],
          payment_date: new Date().toISOString().split('T')[0],
          status: 'paid'
        };

        // Comissão 2 - Banco Itaú
        const commission2 = {
          user_id: user.id,
          client_name: `Cliente Teste ${user.name.split(' ')[0]} B`,
          cpf: '555.666.777-88',
          bank_name: 'Itaú',
          product_type: 'Consignado INSS',
          credit_value: 10000.00,
          commission_percentage: 4.0,
          commission_amount: 400.00,
          proposal_number: `TESTE-${Date.now()}-2`,
          proposal_date: new Date().toISOString().split('T')[0],
          payment_date: new Date().toISOString().split('T')[0],
          status: 'paid'
        };

        const { error: error1 } = await supabase
          .from('commissions')
          .insert(commission1);
        
        const { error: error2 } = await supabase
          .from('commissions')
          .insert(commission2);

        if (error1 || error2) {
          newResults.push(`❌ Erro ao criar comissões para ${user.name}`);
        } else {
          newResults.push(`✅ 2 comissões PAGAS criadas para ${user.name} (R$ 175,00 + R$ 400,00 = R$ 575,00)`);
        }
      }

      setResults(newResults);
      toast({
        title: "Teste Concluído",
        description: `Comissões de teste criadas para ${users.length} usuários`,
      });

    } catch (error) {
      console.error('Erro ao criar comissões de teste:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar comissões de teste",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteTestCommissions = async () => {
    setLoading(true);
    
    try {
      // Deletar todas as comissões que começam com "Cliente Teste"
      const { error } = await supabase
        .from('commissions')
        .delete()
        .like('client_name', 'Cliente Teste%');
      
      if (error) throw error;

      setResults([]);
      toast({
        title: "Sucesso",
        description: "Todas as comissões de teste foram removidas",
      });

    } catch (error) {
      console.error('Erro ao deletar comissões de teste:', error);
      toast({
        title: "Erro",
        description: "Erro ao deletar comissões de teste",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Teste de Comissões - Script Administrativo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={createTestCommissions} 
            disabled={loading}
            className="flex-1"
          >
            <Play className="h-4 w-4 mr-2" />
            Criar Comissões de Teste (Todas PAGAS)
          </Button>
          
          <Button 
            onClick={deleteTestCommissions} 
            disabled={loading}
            variant="destructive"
            className="flex-1"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Comissões de Teste
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold">Resultados:</h4>
            {results.map((result, index) => (
              <p key={index} className="text-sm">{result}</p>
            ))}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Este script cria 2 comissões PAGAS para cada usuário partner ativo</p>
          <p>• As comissões são criadas com status "paid" e payment_date de hoje</p>
          <p>• Clientes de teste terão nome começando com "Cliente Teste"</p>
          <p>• Use o botão "Limpar" para remover todas as comissões de teste</p>
        </div>
      </CardContent>
    </Card>
  );
}
