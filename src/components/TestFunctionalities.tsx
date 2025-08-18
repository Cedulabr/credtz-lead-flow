import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, RefreshCw, Database, Users } from 'lucide-react';
import { toast } from 'sonner';

interface TestResult {
  name: string;
  status: 'loading' | 'success' | 'error';
  message?: string;
  data?: any;
}

export function TestFunctionalities() {
  const { user } = useAuth();
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTest = (name: string, status: TestResult['status'], message?: string, data?: any) => {
    setTests(prev => {
      const existing = prev.find(t => t.name === name);
      if (existing) {
        existing.status = status;
        existing.message = message;
        existing.data = data;
        return [...prev];
      }
      return [...prev, { name, status, message, data }];
    });
  };

  const testSupabaseConnection = async () => {
    updateTest('Conexão Supabase', 'loading');
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      if (error) throw error;
      updateTest('Conexão Supabase', 'success', 'Conexão estabelecida com sucesso');
    } catch (error: any) {
      updateTest('Conexão Supabase', 'error', error.message);
    }
  };

  const testBaseOffData = async () => {
    updateTest('Dados BaseOff', 'loading');
    try {
      const { data, error } = await supabase
        .from('baseoff')
        .select('*')
        .not('Banco', 'is', null)
        .not('Nome', 'is', null)
        .not('CPF', 'is', null)
        .limit(5);
      
      if (error) throw error;
      updateTest('Dados BaseOff', 'success', `${data?.length || 0} registros encontrados`, data);
    } catch (error: any) {
      updateTest('Dados BaseOff', 'error', error.message);
    }
  };

  const testLeadsCreation = async () => {
    updateTest('Criação de Leads', 'loading');
    try {
      const testLead = {
        name: 'Teste Lead Automatizado',
        cpf: '123.456.789-00',
        phone: '(11) 99999-9999',
        convenio: 'INSS',
        banco_operacao: 'C6',
        created_by: user?.id,
        assigned_to: user?.id,
        origem_lead: 'Teste Automatizado'
      };

      const { data, error } = await supabase
        .from('leads')
        .insert(testLead)
        .select()
        .single();

      if (error) throw error;
      
      // Limpar o lead de teste
      await supabase.from('leads').delete().eq('id', data.id);
      
      updateTest('Criação de Leads', 'success', 'Lead criado e removido com sucesso');
    } catch (error: any) {
      updateTest('Criação de Leads', 'error', error.message);
    }
  };

  const testIndicateClient = async () => {
    updateTest('Indicação de Cliente', 'loading');
    try {
      const testClient = {
        name: 'Cliente Teste',
        cpf: '987.654.321-00',
        phone: '(11) 88888-8888',
        convenio: 'INSS',
        created_by: user?.id,
        origem_lead: 'Sistema - Solicitação'
      };

      const { data, error } = await supabase
        .from('leads')
        .insert(testClient)
        .select()
        .single();

      if (error) throw error;
      
      // Limpar o cliente de teste
      await supabase.from('leads').delete().eq('id', data.id);
      
      updateTest('Indicação de Cliente', 'success', 'Cliente indicado e removido com sucesso');
    } catch (error: any) {
      updateTest('Indicação de Cliente', 'error', error.message);
    }
  };

  const testCommissionData = async () => {
    updateTest('Dados de Comissão', 'loading');
    try {
      const { data, error } = await supabase
        .from('commissions')
        .select('*')
        .eq('user_id', user?.id)
        .limit(5);
      
      if (error) throw error;
      updateTest('Dados de Comissão', 'success', `${data?.length || 0} comissões encontradas`, data);
    } catch (error: any) {
      updateTest('Dados de Comissão', 'error', error.message);
    }
  };

  const testNotifications = async () => {
    updateTest('Avisos/Notificações', 'loading');
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .limit(5);
      
      if (error) throw error;
      updateTest('Avisos/Notificações', 'success', `${data?.length || 0} avisos ativos encontrados`, data);
    } catch (error: any) {
      updateTest('Avisos/Notificações', 'error', error.message);
    }
  };

  const testDailyLimit = async () => {
    updateTest('Limite Diário', 'loading');
    try {
      const { data, error } = await supabase
        .rpc('check_baseoff_daily_limit', { user_id_param: user?.id });
      
      if (error) throw error;
      updateTest('Limite Diário', 'success', `Limite restante: ${data} leads`);
    } catch (error: any) {
      updateTest('Limite Diário', 'error', error.message);
    }
  };

  const runAllTests = async () => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    setIsRunning(true);
    setTests([]);

    try {
      await testSupabaseConnection();
      await testBaseOffData();
      await testLeadsCreation();
      await testIndicateClient();
      await testCommissionData();
      await testNotifications();
      await testDailyLimit();
      
      toast.success('Todos os testes concluídos!');
    } catch (error) {
      toast.error('Erro durante os testes');
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'loading':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'loading':
        return <Badge variant="outline" className="text-blue-600">Testando</Badge>;
      case 'success':
        return <Badge variant="outline" className="text-green-600">Sucesso</Badge>;
      case 'error':
        return <Badge variant="outline" className="text-red-600">Erro</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Teste de Funcionalidades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={runAllTests} 
              disabled={isRunning || !user}
              className="w-full"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Executando Testes...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Executar Todos os Testes
                </>
              )}
            </Button>

            {tests.length > 0 && (
              <div className="space-y-3">
                {tests.map((test, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(test.status)}
                      <div>
                        <p className="font-medium">{test.name}</p>
                        {test.message && (
                          <p className="text-sm text-muted-foreground">{test.message}</p>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(test.status)}
                  </div>
                ))}
              </div>
            )}

            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Testes incluídos:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Conexão com Supabase</li>
                <li>Carregamento de dados BaseOff</li>
                <li>Criação e gerenciamento de leads</li>
                <li>Sistema de indicação de clientes</li>
                <li>Dados de comissões</li>
                <li>Sistema de avisos/notificações</li>
                <li>Verificação de limite diário</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}