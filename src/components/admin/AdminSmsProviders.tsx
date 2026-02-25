import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, MessageSquare, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SmsProvider {
  id: string;
  name: string;
  display_name: string;
  is_active: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const PROVIDER_INFO: Record<string, { icon: string; description: string; color: string; bgColor: string }> = {
  twilio: {
    icon: '📱',
    description: 'Provedor global de comunicação via SMS com alta confiabilidade.',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  yup_chat: {
    icon: '💬',
    description: 'Provedor brasileiro com API de envio individual e em lote.',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
};

export function AdminSmsProviders() {
  const [providers, setProviders] = useState<SmsProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sms_providers')
      .select('*')
      .order('created_at');
    if (!error && data) setProviders(data as any);
    setLoading(false);
  };

  const handleActivate = async (providerId: string, providerName: string) => {
    setSwitching(providerId);
    try {
      // Deactivate all providers first
      const { error: deactError } = await supabase
        .from('sms_providers')
        .update({ is_active: false, updated_at: new Date().toISOString() } as any)
        .neq('id', providerId);
      if (deactError) {
        console.error('Deactivate error:', deactError);
        throw deactError;
      }
      // Activate selected
      const { error } = await supabase
        .from('sms_providers')
        .update({ is_active: true, updated_at: new Date().toISOString() } as any)
        .eq('id', providerId);
      if (error) {
        console.error('Activate error:', error);
        throw error;
      }
      toast.success(`${providerName} ativado como provedor SMS principal`);
      fetchProviders();
    } catch (e: any) {
      toast.error('Erro ao ativar provedor: ' + (e?.message || 'erro desconhecido'));
    } finally {
      setSwitching(null);
    }
  };

  const handleTestProvider = async (providerName: string) => {
    setTesting(providerName);
    try {
      // Temporarily activate and send test
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: { phone: '0', message: 'test_ping', send_type: 'test' },
      });
      // We don't actually send - just check config
      if (error) throw error;
      toast.info('Teste de configuração verificado. Para testar envio real, envie um SMS pela tela de comunicação.');
    } catch (e: any) {
      toast.error('Erro: ' + (e.message || 'falha na verificação'));
    } finally {
      setTesting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Provedores SMS</h2>
        <Button variant="outline" size="sm" onClick={fetchProviders} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Selecione o provedor ativo para envio de SMS. Apenas um provedor pode estar ativo por vez.
        Todos os envios (manuais, campanhas e automação) usarão o provedor selecionado.
      </p>

      <div className="grid gap-4">
        {providers.map((provider, index) => {
          const info = PROVIDER_INFO[provider.name] || { icon: '📡', description: 'Provedor SMS', color: 'text-primary', bgColor: 'bg-primary/10' };
          return (
            <motion.div
              key={provider.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`transition-all ${provider.is_active ? 'ring-2 ring-primary shadow-md' : 'opacity-80'}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${info.bgColor}`}>
                        {info.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-base">{provider.display_name}</h3>
                          {provider.is_active ? (
                            <Badge className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle className="h-3 w-3" /> Ativo
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <XCircle className="h-3 w-3" /> Inativo
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{info.description}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Atualizado: {new Date(provider.updated_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <Switch
                        checked={provider.is_active}
                        disabled={provider.is_active || switching !== null}
                        onCheckedChange={() => handleActivate(provider.id, provider.display_name)}
                      />
                      {switching === provider.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Como funciona</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>O provedor ativo é usado para <strong>todos</strong> os envios: manuais, campanhas em lote e automação.</li>
                <li>O Yup Chat suporta envio em lote nativo, otimizando campanhas grandes.</li>
                <li>O histórico de envios registra qual provedor foi utilizado em cada SMS.</li>
                <li>As credenciais são gerenciadas via secrets do Supabase (Twilio: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID | Yup Chat: YUP_CHAT_ID, YUP_CHAT_TOKEN).</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
