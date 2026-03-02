import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Users, Link2, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBrDid } from "../hooks/useBrDid";
import { toast } from "sonner";
import type { UserDid } from "../types";

export function BillingView() {
  const { user } = useAuth();
  const { loading, criarPlano, criarCliente, montarClientePlanoDids, listarClientes, listarPlanos } = useBrDid();
  const [planos, setPlanos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [dids, setDids] = useState<UserDid[]>([]);

  // Form states
  const [planoNome, setPlanoNome] = useState("");
  const [planoValor, setPlanoValor] = useState("");
  const [planoDescricao, setPlanoDescricao] = useState("");

  const [clienteNome, setClienteNome] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");
  const [clienteCpfCnpj, setClienteCpfCnpj] = useState("");

  const [vincClienteId, setVincClienteId] = useState("");
  const [vincPlanoId, setVincPlanoId] = useState("");
  const [vincDidNumero, setVincDidNumero] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const [planosData, clientesData] = await Promise.all([
      listarPlanos(),
      listarClientes(),
    ]);
    if (planosData && Array.isArray(planosData)) setPlanos(planosData);
    if (clientesData && Array.isArray(clientesData)) setClientes(clientesData);

    if (user?.id) {
      const { data } = await supabase
        .from("user_dids")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active");
      if (data) setDids(data as unknown as UserDid[]);
    }
  };

  const handleCriarPlano = async () => {
    if (!planoNome || !planoValor) return;
    const result = await criarPlano({ NOME: planoNome, VALOR: parseFloat(planoValor), DESCRICAO: planoDescricao });
    if (result) {
      toast.success("Plano criado!");
      setPlanoNome(""); setPlanoValor(""); setPlanoDescricao("");
      loadAll();
    }
  };

  const handleCriarCliente = async () => {
    if (!clienteNome || !clienteEmail) return;
    const result = await criarCliente({ NOME: clienteNome, EMAIL: clienteEmail, CPF_CNPJ: clienteCpfCnpj });
    if (result) {
      toast.success("Cliente criado!");
      setClienteNome(""); setClienteEmail(""); setClienteCpfCnpj("");
      loadAll();
    }
  };

  const handleVincular = async () => {
    if (!vincClienteId || !vincPlanoId || !vincDidNumero) return;
    const result = await montarClientePlanoDids({
      CLIENTE_ID: vincClienteId,
      PLANO_ID: vincPlanoId,
      DID_NUMERO: vincDidNumero,
    });
    if (result) {
      toast.success("DID vinculado ao cliente e plano!");
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="planos">
        <TabsList className="w-full">
          <TabsTrigger value="planos" className="flex-1">Planos</TabsTrigger>
          <TabsTrigger value="clientes" className="flex-1">Clientes</TabsTrigger>
          <TabsTrigger value="vincular" className="flex-1">Vincular</TabsTrigger>
        </TabsList>

        <TabsContent value="planos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" /> Criar Plano
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nome</Label>
                  <Input value={planoNome} onChange={e => setPlanoNome(e.target.value)} placeholder="Nome do plano" />
                </div>
                <div>
                  <Label>Valor (R$)</Label>
                  <Input type="number" value={planoValor} onChange={e => setPlanoValor(e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={planoDescricao} onChange={e => setPlanoDescricao(e.target.value)} placeholder="Descrição" />
              </div>
              <Button onClick={handleCriarPlano} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Criar Plano
              </Button>
            </CardContent>
          </Card>

          {planos.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Planos cadastrados</CardTitle>
                <Button variant="ghost" size="sm" onClick={loadAll}><RefreshCw className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {planos.map((p: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell>{p.ID || p.id}</TableCell>
                        <TableCell>{p.NOME || p.nome}</TableCell>
                        <TableCell>R$ {p.VALOR || p.valor}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="clientes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" /> Criar Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nome</Label>
                  <Input value={clienteNome} onChange={e => setClienteNome(e.target.value)} placeholder="Nome" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={clienteEmail} onChange={e => setClienteEmail(e.target.value)} placeholder="email@..." />
                </div>
              </div>
              <div>
                <Label>CPF/CNPJ</Label>
                <Input value={clienteCpfCnpj} onChange={e => setClienteCpfCnpj(e.target.value)} placeholder="000.000.000-00" />
              </div>
              <Button onClick={handleCriarCliente} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Criar Cliente
              </Button>
            </CardContent>
          </Card>

          {clientes.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Clientes cadastrados</CardTitle>
                <Button variant="ghost" size="sm" onClick={loadAll}><RefreshCw className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientes.map((c: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell>{c.ID || c.id}</TableCell>
                        <TableCell>{c.NOME || c.nome}</TableCell>
                        <TableCell>{c.EMAIL || c.email}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="vincular">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 className="h-4 w-4" /> Vincular DID + Plano + Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Cliente</Label>
                <Select value={vincClienteId} onValueChange={setVincClienteId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {clientes.map((c: any, i: number) => (
                      <SelectItem key={i} value={String(c.ID || c.id)}>{c.NOME || c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Plano</Label>
                <Select value={vincPlanoId} onValueChange={setVincPlanoId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {planos.map((p: any, i: number) => (
                      <SelectItem key={i} value={String(p.ID || p.id)}>{p.NOME || p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>DID (Número)</Label>
                <Select value={vincDidNumero} onValueChange={setVincDidNumero}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {dids.map(d => (
                      <SelectItem key={d.id} value={d.numero}>{d.numero}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleVincular} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Link2 className="h-4 w-4 mr-1" />}
                Vincular
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
