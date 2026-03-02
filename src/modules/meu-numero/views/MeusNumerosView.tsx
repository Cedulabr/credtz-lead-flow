import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Phone, Trash2, RefreshCw, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBrDid } from "../hooks/useBrDid";
import { toast } from "sonner";
import type { UserDid } from "../types";

export function MeusNumerosView() {
  const { user } = useAuth();
  const { loading, cancelarDid, consultarDid } = useBrDid();
  const [dids, setDids] = useState<UserDid[]>([]);
  const [loadingDids, setLoadingDids] = useState(true);
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) loadDids();
  }, [user?.id]);

  const loadDids = async () => {
    setLoadingDids(true);
    const { data, error } = await supabase
      .from("user_dids")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    if (!error && data) setDids(data as unknown as UserDid[]);
    setLoadingDids(false);
  };

  const handleCancel = async (did: UserDid) => {
    setCancelling(did.id);
    try {
      const result = await cancelarDid(did.numero);
      if (result) {
        await supabase
          .from("user_dids")
          .update({ status: "cancelled" } as any)
          .eq("id", did.id);
        toast.success(`Número ${did.numero} cancelado`);
        loadDids();
      }
    } finally {
      setCancelling(null);
    }
  };

  const toggleCredentials = (id: string) => {
    setShowCredentials(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formatCurrency = (val: number | null) =>
    val ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val) : "-";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Meus Números
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadDids} disabled={loadingDids}>
            <RefreshCw className={`h-4 w-4 ${loadingDids ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {dids.length === 0 && !loadingDids ? (
            <p className="text-muted-foreground text-center py-8">Nenhum número contratado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Localidade</TableHead>
                  <TableHead>Mensal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Credenciais SIP</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dids.map((did) => (
                  <TableRow key={did.id}>
                    <TableCell className="font-mono font-medium">{did.numero}</TableCell>
                    <TableCell>{did.area_local || "-"}</TableCell>
                    <TableCell>{formatCurrency(did.valor_mensal)}</TableCell>
                    <TableCell>
                      <Badge variant={did.status === "active" ? "default" : "secondary"}>
                        {did.status === "active" ? "Ativo" : "Cancelado"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {did.sip_usuario ? (
                        <div className="space-y-1 text-xs">
                          <Button variant="ghost" size="sm" onClick={() => toggleCredentials(did.id)}>
                            {showCredentials[did.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            <span className="ml-1">{showCredentials[did.id] ? "Ocultar" : "Ver"}</span>
                          </Button>
                          {showCredentials[did.id] && (
                            <div className="bg-muted p-2 rounded text-xs space-y-1">
                              <div><strong>Usuário:</strong> {did.sip_usuario}</div>
                              <div><strong>Senha:</strong> {did.sip_senha}</div>
                              <div><strong>Domínio:</strong> {did.sip_dominio}</div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {did.status === "active" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={cancelling === did.id}>
                              {cancelling === did.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancelar número {did.numero}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação irá cancelar o DID permanentemente. Não será possível recuperá-lo.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Não</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleCancel(did)}>Sim, cancelar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
