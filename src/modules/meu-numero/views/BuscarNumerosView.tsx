import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ShoppingCart, Star, Diamond, Loader2 } from "lucide-react";
import { useBrDid } from "../hooks/useBrDid";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Did, Localidade } from "../types";

export function BuscarNumerosView() {
  const { loading, buscarLocalidades, buscarNumeros, adquirirDid } = useBrDid();
  const { user } = useAuth();
  const [localidades, setLocalidades] = useState<Localidade[]>([]);
  const [selectedArea, setSelectedArea] = useState("");
  const [numeros, setNumeros] = useState<Did[]>([]);
  const [contracting, setContracting] = useState<string | null>(null);

  useEffect(() => {
    loadLocalidades();
  }, []);

  const loadLocalidades = async () => {
    const data = await buscarLocalidades();
    if (data && Array.isArray(data)) {
      setLocalidades(data);
    }
  };

  const handleSearch = async () => {
    if (!selectedArea) return;
    const data = await buscarNumeros(selectedArea);
    if (data && Array.isArray(data)) {
      setNumeros(data);
    } else {
      setNumeros([]);
    }
  };

  // Fix #2: Send CN + NUMERO instead of CODIGO
  const handleContratar = async (did: Did) => {
    if (!user?.id) return;
    setContracting(did.NUMERO);
    try {
      const result = await adquirirDid(did.CN, did.NUMERO);
      if (result) {
        await supabase.from("user_dids").insert({
          user_id: user.id,
          numero: did.NUMERO,
          cn: did.CN,
          area_local: selectedArea,
          codigo: did.CODIGO,
          status: "active",
          sip_usuario: String(result.USUARIO || ""),
          sip_senha: result.SENHA || "",
          sip_dominio: result.DOMINIO || "",
          valor_mensal: did.VALOR_MENSAL,
          valor_instalacao: did.VALOR_INSTALACAO,
        } as any);
        toast.success(`Número ${did.NUMERO} contratado com sucesso!`);
        setNumeros(prev => prev.filter(n => n.NUMERO !== did.NUMERO));
      }
    } finally {
      setContracting(null);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Números Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Localidade (DDD)</label>
              <Select value={selectedArea} onValueChange={setSelectedArea}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a localidade..." />
                </SelectTrigger>
                <SelectContent>
                  {localidades.map((loc) => (
                    <SelectItem key={String(loc.AREA_LOCAL)} value={String(loc.AREA_LOCAL)}>
                      {loc.AREA_LOCAL} - {loc.LOCALIDADE} ({loc.UF})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch} disabled={!selectedArea || loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2">Buscar</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {numeros.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{numeros.length} números disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Mensal</TableHead>
                  <TableHead>Instalação</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {numeros.map((did) => (
                  <TableRow key={did.CODIGO}>
                    <TableCell className="font-mono font-medium">{did.NUMERO}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {did.DIAMANTE && <Badge className="bg-purple-600"><Diamond className="h-3 w-3 mr-1" />Diamante</Badge>}
                        {did.SUPER_GOLD && <Badge className="bg-yellow-600"><Star className="h-3 w-3 mr-1" />Super Gold</Badge>}
                        {did.GOLD && <Badge className="bg-yellow-500"><Star className="h-3 w-3 mr-1" />Gold</Badge>}
                        {!did.GOLD && !did.SUPER_GOLD && !did.DIAMANTE && <Badge variant="secondary">Padrão</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-primary">{formatCurrency(did.VALOR_MENSAL)}</TableCell>
                    <TableCell>{formatCurrency(did.VALOR_INSTALACAO)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleContratar(did)}
                        disabled={contracting === did.NUMERO}
                      >
                        {contracting === did.NUMERO ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ShoppingCart className="h-4 w-4" />
                        )}
                        <span className="ml-1">Contratar</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {loading && numeros.length === 0 && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
