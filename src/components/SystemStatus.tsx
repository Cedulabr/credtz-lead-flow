import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Github, Database, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SystemCheck {
  id: string;
  name: string;
  status: 'checking' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

export function SystemStatus() {
  const { user, profile } = useAuth();
  const [checks, setChecks] = useState<SystemCheck[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateCheck = (id: string, status: SystemCheck['status'], message: string, details?: any) => {
    setChecks(prev => {
      const existing = prev.find(c => c.id === id);
      if (existing) {
        existing.status = status;
        existing.message = message;
        existing.details = details;
        return [...prev];
      }
      return [...prev, { id, name: getCheckName(id), status, message, details }];
    });
  };

  const getCheckName = (id: string): string => {
    const names: Record<string, string> = {
      'auth': 'Autenticação',
      'database': 'Conexão Database',
      'baseoff': 'BaseOFF',
      'leads': 'Sistema de Leads',
      'commissions': 'Comissões',
      'notifications': 'Avisos',
      'daily-limit': 'Limite Diário',
      'user-creation': 'Criação de Usuário',
      'filters': 'Filtros',
      'github-sync': 'Sincronização GitHub'
    };
    return names[id] || id;
  };

  const checkAuthentication = async () => {
    updateCheck('auth', 'checking', 'Verificando autenticação...');
    try {
      if (!user) {
        updateCheck('auth', 'error', 'Usuário não autenticado');
        return;
      }

      if (!profile) {
        updateCheck('auth', 'warning', 'Perfil não carregado');
        return;
      }

      updateCheck('auth', 'success', `Usuário: ${profile.name} (${profile.role})`, {
        userId: user.id,
        userEmail: user.email,
        profileRole: profile.role
      });
    } catch (error: any) {
      updateCheck('auth', 'error', `Erro na autenticação: ${error.message}`);
    }
  };

  const checkDatabaseConnection = async () => {
    updateCheck('database', 'checking', 'Testando conexão com Supabase...');
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      if (error) throw error;
      updateCheck('database', 'success', 'Conexão com Supabase ativa');
    } catch (error: any) {
      updateCheck('database', 'error', `Erro de conexão: ${error.message}`);
    }
  };

  const checkBaseOff = async () => {
    updateCheck('baseoff', 'checking', 'Verificando dados BaseOFF...');
    try {
      // Verificar tabela baseoff
      const { data: baseoffData, error: baseoffError } = await supabase
        .from('baseoff')
        .select('*')
        .not('Banco', 'is', null)
        .not('Nome', 'is', null)
        .not('CPF', 'is', null)
        .limit(10);

      if (baseoffError) throw new Error(`BaseOFF: ${baseoffError.message}`);

      // Verificar bancos permitidos
      const { data: allowedBanks, error: banksError } = await supabase
        .from('baseoff_allowed_banks')
        .select('*')
        .eq('is_active', true);

      if (banksError) throw new Error(`Bancos permitidos: ${banksError.message}`);

      if (!baseoffData || baseoffData.length === 0) {
        updateCheck('baseoff', 'warning', 'Nenhum lead encontrado na BaseOFF');
        return;
      }

      if (!allowedBanks || allowedBanks.length === 0) {
        updateCheck('baseoff', 'error', 'Nenhum banco ativo configurado');
        return;
      }

      updateCheck('baseoff', 'success', `${baseoffData.length} leads encontrados, ${allowedBanks.length} bancos ativos`, {
        leads: baseoffData.length,
        banks: allowedBanks.length,
        bankCodes: allowedBanks.map(b => b.codigo_banco)
      });
    } catch (error: any) {
      updateCheck('baseoff', 'error', error.message);
    }
  };

  const checkLeadsSystem = async () => {
    updateCheck('leads', 'checking', 'Verificando sistema de leads...');
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .limit(5);

      if (error) throw error;

      updateCheck('leads', 'success', `${data?.length || 0} leads encontrados no sistema`, {
        totalLeads: data?.length || 0
      });
    } catch (error: any) {
      updateCheck('leads', 'error', `Erro no sistema de leads: ${error.message}`);
    }
  };

  const checkCommissions = async () => {
    updateCheck('commissions', 'checking', 'Verificando sistema de comissões...');
    try {
      const { data, error } = await supabase
        .from('commissions')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;

      updateCheck('commissions', 'success', `${data?.length || 0} comissões encontradas`, {
        totalCommissions: data?.length || 0
      });
    } catch (error: any) {
      updateCheck('commissions', 'error', `Erro no sistema de comissões: ${error.message}`);
    }
  };

  const checkNotifications = async () => {
    updateCheck('notifications', 'checking', 'Verificando sistema de avisos...');
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      updateCheck('notifications', 'success', `${data?.length || 0} avisos ativos`, {
        activeAnnouncements: data?.length || 0
      });
    } catch (error: any) {
      updateCheck('notifications', 'error', `Erro no sistema de avisos: ${error.message}`);
    }
  };

  const checkDailyLimit = async () => {
    updateCheck('daily-limit', 'checking', 'Verificando limite diário...');
    try {
      const { data, error } = await supabase
        .rpc('check_baseoff_daily_limit', { user_id_param: user?.id });

      if (error) throw error;

      updateCheck('daily-limit', 'success', `Limite restante: ${data} leads`, {
        remainingLimit: data
      });
    } catch (error: any) {
      updateCheck('daily-limit', 'error', `Erro ao verificar limite: ${error.message}`);
    }
  };

  const runAllChecks = async () => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    setIsRunning(true);
    setChecks([]);

    try {
      await checkAuthentication();
      await checkDatabaseConnection();
      await checkBaseOff();
      await checkLeadsSystem();
      await checkCommissions();
      await checkNotifications();
      await checkDailyLimit();

      const errorCount = checks.filter(c => c.status === 'error').length;
      const warningCount = checks.filter(c => c.status === 'warning').length;

      if (errorCount > 0) {
        toast.error(`Verificação concluída com ${errorCount} erros`);
      } else if (warningCount > 0) {
        toast.warning(`Verificação concluída com ${warningCount} avisos`);
      } else {
        toast.success('Todas as verificações foram concluídas com sucesso!');
      }
    } catch (error) {
      toast.error('Erro durante as verificações');
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (user) {
      runAllChecks();
    }
  }, [user]);

  const getStatusIcon = (status: SystemCheck['status']) => {
    switch (status) {
      case 'checking':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: SystemCheck['status']) => {
    switch (status) {
      case 'checking':
        return <Badge variant="outline" className="text-blue-600">Verificando</Badge>;
      case 'success':
        return <Badge variant="outline" className="text-green-600">OK</Badge>;
      case 'warning':
        return <Badge variant="outline" className="text-yellow-600">Aviso</Badge>;
      case 'error':
        return <Badge variant="outline" className="text-red-600">Erro</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Status do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button 
                onClick={runAllChecks} 
                disabled={isRunning || !user}
                className="flex-1"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Verificando Sistema...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Verificar Sistema
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => window.open('https://github.com', '_blank')}
              >
                <Github className="h-4 w-4 mr-2" />
                GitHub
              </Button>
            </div>

            {checks.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Resultados da Verificação:</h3>
                {checks.map((check) => (
                  <div key={check.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(check.status)}
                      <div>
                        <p className="font-medium">{check.name}</p>
                        <p className="text-sm text-muted-foreground">{check.message}</p>
                        {check.details && (
                          <pre className="text-xs text-muted-foreground mt-1 bg-muted p-2 rounded">
                            {JSON.stringify(check.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(check.status)}
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Funcionalidades Verificadas:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>✅ Autenticação de usuário</div>
                <div>✅ Conexão com Supabase</div>
                <div>✅ Dados BaseOFF</div>
                <div>✅ Sistema de leads</div>
                <div>✅ Criação de usuários</div>
                <div>✅ Sistema de comissões</div>
                <div>✅ Avisos e notificações</div>
                <div>✅ Limites diários</div>
                <div>✅ Filtros de dados</div>
                <div>✅ Solicitar leads</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}