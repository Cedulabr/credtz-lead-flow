import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  CheckCircle2,
  XCircle,
  BarChart3,
} from "lucide-react";
import { useNovaVidaCredentials } from "../hooks/useNovaVidaCredentials";
import { useTelefoniaUsage } from "../hooks/useTelefoniaUsage";
import { TokenManagementCard } from "./TokenManagementCard";
import { IntegrationHealthCard } from "./IntegrationHealthCard";
import { toast } from "sonner";

export function ConfiguracoesTab() {
  const {
    creds,
    tokenExpiresAt,
    loading,
    saving,
    save,
    testConnection,
    refreshTokenNow,
    setManualToken,
    companyId,
  } = useNovaVidaCredentials();
  const { stats } = useTelefoniaUsage();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [cliente, setCliente] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (creds) {
      setUsuario(creds.usuario || "");
      setSenha(creds.senha || "");
      setCliente(creds.cliente || "");
    }
  }, [creds]);

  const handleSave = async () => {
    try {
      await save({ usuario, senha, cliente });
      toast.success("Credenciais salvas");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testConnection();
      setTestResult(res);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando...
      </div>
    );
  }

  if (!companyId) {
    return (
      <Card className="p-6 text-sm text-muted-foreground max-w-xl mx-auto">
        Sua conta não está vinculada a uma empresa.
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Credenciais Nova Vida TI</h3>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="usuario">Usuário</Label>
            <Input id="usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senha">Senha</Label>
            <div className="relative">
              <Input
                id="senha"
                type={showSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSenha((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label="Alternar visibilidade"
              >
                {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cliente">Cliente</Label>
            <Input id="cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={saving || !usuario || !senha || !cliente}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar credenciais
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Testar conexão
          </Button>
        </div>
        {testResult && (
          <div
            className={`flex items-center gap-2 text-sm ${
              testResult.ok ? "text-green-600" : "text-destructive"
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <span>
              {testResult.ok ? "✅ " : "❌ Falha: "}
              {testResult.message}
            </span>
          </div>
        )}
      </Card>

      <TokenManagementCard
        tokenExpiresAt={tokenExpiresAt}
        refreshTokenNow={refreshTokenNow}
        setManualToken={setManualToken}
      />

      <IntegrationHealthCard
        companyId={companyId}
        hasCredentials={!!creds}
        tokenExpiresAt={tokenExpiresAt}
      />

      <Card className="p-4 sm:p-6 space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Uso do mês atual</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/40">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Consultas realizadas</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/40">
            <div className="text-2xl font-bold">{stats.cache}</div>
            <div className="text-xs text-muted-foreground">Em cache (sem crédito)</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/40">
            <div className="text-2xl font-bold">{stats.credits}</div>
            <div className="text-xs text-muted-foreground">Créditos consumidos</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
