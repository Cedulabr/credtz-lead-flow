import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { KeyRound, RefreshCw, Clipboard, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface Props {
  tokenExpiresAt: string | null;
  refreshTokenNow: () => Promise<{ ok: boolean; message: string }>;
  setManualToken: (t: string) => Promise<{ ok: boolean; message: string }>;
}

function formatRemaining(expiresAt: string): { label: string; level: "ok" | "warn" | "expired" } {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return { label: "Expirado", level: "expired" };
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  const label = h > 0 ? `${h}h ${m}min restantes` : `${m}min restantes`;
  return { label, level: h < 2 ? "warn" : "ok" };
}

export function TokenManagementCard({ tokenExpiresAt, refreshTokenNow, setManualToken }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState("");
  const [savingManual, setSavingManual] = useState(false);

  const valid = tokenExpiresAt && new Date(tokenExpiresAt) > new Date();
  const remaining = tokenExpiresAt ? formatRemaining(tokenExpiresAt) : null;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await refreshTokenNow();
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveManual = async () => {
    if (manual.trim().length < 20) {
      toast.error("Token muito curto");
      return;
    }
    setSavingManual(true);
    try {
      const res = await setManualToken(manual.trim());
      if (res.ok) {
        toast.success(res.message);
        setManual("");
        setManualOpen(false);
      } else {
        toast.error(res.message);
      }
    } finally {
      setSavingManual(false);
    }
  };

  return (
    <>
      <Card className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Token de acesso (24h)</h3>
        </div>

        <div className="rounded-lg bg-muted/40 p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {valid ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            )}
            <div className="min-w-0">
              <div className="text-sm font-medium">
                {valid ? "Token válido" : "Sem token ativo"}
              </div>
              {tokenExpiresAt && (
                <div className="text-xs text-muted-foreground truncate">
                  Expira em {new Date(tokenExpiresAt).toLocaleString("pt-BR")}
                </div>
              )}
            </div>
          </div>
          {remaining && (
            <Badge
              variant={remaining.level === "ok" ? "default" : "destructive"}
              className="gap-1"
            >
              <Clock className="h-3 w-3" />
              {remaining.label}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw
              className={"h-4 w-4 mr-2 " + (refreshing ? "animate-spin" : "")}
            />
            Renovar agora
          </Button>
          <Button variant="outline" onClick={() => setManualOpen(true)}>
            <Clipboard className="h-4 w-4 mr-2" />
            Colar token manual
          </Button>
        </div>

        <div className="text-xs text-muted-foreground border-t pt-3 space-y-0.5">
          <div>
            🔄 <b>Renovação automática:</b> diariamente às 03:00 (BRT)
          </div>
          <div>
            ℹ️ O sistema gera e armazena o token automaticamente. Use "Colar token manual"
            apenas se você gerou um token diretamente no portal Nova Vida TI.
          </div>
        </div>
      </Card>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Colar token manual</DialogTitle>
            <DialogDescription>
              Cole abaixo o token gerado manualmente no portal Nova Vida TI. Ele será válido
              por 24h.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Cole o token aqui..."
            rows={5}
            className="font-mono text-xs"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveManual} disabled={savingManual || manual.length < 20}>
              Salvar token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
