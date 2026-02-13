import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Database,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  Wifi,
  WifiOff,
  Zap,
  Shield,
  AlertTriangle,
  Server,
  Clock,
} from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  resetSupabaseConfig,
  getDefaultConfig,
  testSupabaseConnection,
  type SupabaseConfig,
} from '@/lib/supabaseConfig';

interface TestResult {
  success: boolean;
  latencyMs: number;
  error?: string;
  details?: {
    authWorking: boolean;
    databaseWorking: boolean;
    projectRef: string;
  };
}

export function AdminDatabase() {
  const [config, setConfig] = useState<SupabaseConfig>(getSupabaseConfig());
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [showServiceKey, setShowServiceKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [liveStatus, setLiveStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Check live connection on mount
  useEffect(() => {
    const current = getSupabaseConfig();
    testSupabaseConnection(current.url, current.anonKey).then((result) => {
      setLiveStatus(result.success ? 'online' : 'offline');
    });
  }, []);

  const updateField = (field: keyof SupabaseConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!config.url || !config.anonKey) {
      toast.error('Preencha URL e Anon Key para testar');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const result = await testSupabaseConnection(config.url, config.anonKey);
      setTestResult(result);

      if (result.success) {
        toast.success(`Conexão bem-sucedida! Latência: ${result.latencyMs}ms`);
      } else {
        toast.error(`Falha na conexão: ${result.error}`);
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        latencyMs: 0,
        error: error.message || 'Erro inesperado',
      });
      toast.error('Erro ao testar conexão');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!testResult?.success) {
      toast.error('Teste a conexão antes de salvar');
      return;
    }

    setSaving(true);
    try {
      saveSupabaseConfig({
        ...config,
        lastTested: new Date().toISOString(),
      });

      setHasChanges(false);
      toast.success('Configuração salva! Recarregue a página para aplicar.', {
        action: {
          label: 'Recarregar',
          onClick: () => window.location.reload(),
        },
        duration: 10000,
      });
    } catch (error) {
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const defaults = getDefaultConfig();
    setConfig(defaults);
    resetSupabaseConfig();
    setHasChanges(false);
    setTestResult(null);
    toast.success('Configuração restaurada para os valores padrão');
  };

  const maskKey = (key: string) => {
    if (!key || key.length < 20) return key;
    return key.slice(0, 10) + '•'.repeat(20) + key.slice(-10);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Banco de Dados
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configuração e gerenciamento da conexão Supabase
          </p>
        </div>

        {/* Live Status Indicator */}
        <div className="flex items-center gap-2">
          {liveStatus === 'checking' && (
            <Badge variant="outline" className="gap-1.5 animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" />
              Verificando...
            </Badge>
          )}
          {liveStatus === 'online' && (
            <Badge className="gap-1.5 bg-emerald-500/15 text-emerald-700 border-emerald-300 hover:bg-emerald-500/20">
              <Wifi className="h-3 w-3" />
              Conexão Ativa
            </Badge>
          )}
          {liveStatus === 'offline' && (
            <Badge variant="destructive" className="gap-1.5">
              <WifiOff className="h-3 w-3" />
              Desconectado
            </Badge>
          )}
        </div>
      </div>

      {/* Security Warning */}
      <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-400">
              Aviso de Segurança
            </p>
            <p className="text-amber-700 dark:text-amber-500 mt-1">
              As credenciais são armazenadas localmente neste navegador. A Service Role Key tem acesso total ao banco
              e deve ser usada apenas em ambiente seguro. Nunca compartilhe estas credenciais.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="h-5 w-5" />
              Credenciais Supabase
            </CardTitle>
            <CardDescription>Configure a conexão com o projeto Supabase</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* URL */}
            <div className="space-y-2">
              <Label htmlFor="supabase-url">URL do Projeto</Label>
              <Input
                id="supabase-url"
                placeholder="https://xxxxx.supabase.co"
                value={config.url}
                onChange={(e) => updateField('url', e.target.value.trim())}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Encontre em: Supabase Dashboard → Settings → API
              </p>
            </div>

            {/* Anon Key */}
            <div className="space-y-2">
              <Label htmlFor="anon-key">Anon Public Key</Label>
              <div className="relative">
                <Input
                  id="anon-key"
                  type={showAnonKey ? 'text' : 'password'}
                  placeholder="eyJhbGciOiJIUzI1NiIs..."
                  value={config.anonKey}
                  onChange={(e) => updateField('anonKey', e.target.value.trim())}
                  className="font-mono text-sm pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowAnonKey(!showAnonKey)}
                >
                  {showAnonKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Service Role Key */}
            <div className="space-y-2">
              <Label htmlFor="service-key" className="flex items-center gap-2">
                Service Role Key
                <Badge variant="outline" className="text-xs">Opcional</Badge>
              </Label>
              <div className="relative">
                <Input
                  id="service-key"
                  type={showServiceKey ? 'text' : 'password'}
                  placeholder="eyJhbGciOiJIUzI1NiIs..."
                  value={config.serviceRoleKey || ''}
                  onChange={(e) => updateField('serviceRoleKey', e.target.value.trim())}
                  className="font-mono text-sm pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowServiceKey(!showServiceKey)}
                >
                  {showServiceKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Acesso total ao banco. Use com cautela.
              </p>
            </div>

            {/* Environment */}
            <div className="space-y-2">
              <Label>Ambiente</Label>
              <Select
                value={config.environment}
                onValueChange={(v) => updateField('environment', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">🟢 Produção</SelectItem>
                  <SelectItem value="test">🟡 Teste</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                onClick={handleTest}
                disabled={testing || !config.url || !config.anonKey}
                variant="outline"
                className="flex-1"
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Testar Conexão
              </Button>

              <Button
                onClick={handleSave}
                disabled={saving || !testResult?.success || !hasChanges}
                className="flex-1"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar
              </Button>

              {config.isCustom && (
                <Button variant="ghost" onClick={handleReset} className="shrink-0">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restaurar Padrão
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Test Results & Info */}
        <div className="space-y-6">
          {/* Test Result Card */}
          {testResult && (
            <Card
              className={
                testResult.success
                  ? 'border-emerald-300 dark:border-emerald-800'
                  : 'border-destructive/50'
              }
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  {testResult.success ? 'Conexão OK' : 'Falha na Conexão'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Latência
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      testResult.latencyMs < 200
                        ? 'text-emerald-600'
                        : testResult.latencyMs < 500
                        ? 'text-amber-600'
                        : 'text-destructive'
                    }
                  >
                    {testResult.latencyMs}ms
                  </Badge>
                </div>

                {testResult.details && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Projeto</span>
                      <code className="text-xs bg-muted px-2 py-0.5 rounded">
                        {testResult.details.projectRef}
                      </code>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Auth</span>
                      {testResult.details.authWorking ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300">
                          Funcionando
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Erro</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Database</span>
                      {testResult.details.databaseWorking ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300">
                          Funcionando
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Erro</Badge>
                      )}
                    </div>
                  </>
                )}

                {testResult.error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                    {testResult.error}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Current Config Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Configuração Atual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tipo</span>
                <Badge variant={config.isCustom ? 'default' : 'secondary'}>
                  {config.isCustom ? 'Personalizada' : 'Padrão'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Ambiente</span>
                <Badge variant="outline">
                  {config.environment === 'production' ? '🟢 Produção' : '🟡 Teste'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">URL</span>
                <code className="text-xs bg-muted px-2 py-0.5 rounded max-w-[200px] truncate">
                  {config.url}
                </code>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Anon Key</span>
                <code className="text-xs bg-muted px-2 py-0.5 rounded">
                  {maskKey(config.anonKey)}
                </code>
              </div>
              {config.lastTested && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Último teste</span>
                  <span className="text-xs">
                    {new Date(config.lastTested).toLocaleString('pt-BR')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
