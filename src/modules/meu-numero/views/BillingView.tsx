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

  // Fix #4: Plano fields matching API
  const [planoNome, setPlanoNome] = useState("");
  const [planoValorFixo, setPlanoValorFixo] = useState("");
  const [planoValorMovel, setPlanoValorMovel] = useState("");

  // Fix #5: Cliente fields - all 12 required by API
  const [clienteNome, setClienteNome] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");
  const [clienteTelefone, setClienteTelefone] = useState("");
  const [clienteCpfCnpj, setClienteCpfCnpj] = useState("");
  const [clienteCep, setClienteCep] = useState("");
  const [clienteEndereco, setClienteEndereco] = useState("");
  const [clienteNumero, setClienteNumero] = useState("");
  const [clienteComplemento, setClienteComplemento] = useState("");
  const [clienteBairro, setClienteBairro] = useState("");
  const [clienteCidade, setClienteCidade] = useState("");
  const [clienteEstado, setClienteEstado] = useState("");
  const [clienteVencimento, setClienteVencimento] = useState("10");
  const [clienteCorteFatura, setClienteCorteFatura] = useState("5");

  // Fix #6: Vincular fields
  const [vincClienteId, setVincClienteId] = useState("");
  const [vincPlanoId, setVincPlanoId] = useState("");
  const [vincDids, setVincDids] = useState<string[]>([]);

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
    if (!planoNome || !planoValorFixo || !planoValorMovel) {
      toast.error("Preencha todos os campos obrigatórios do plano");
      return;
    }
    const result = await criarPlano({
      NOME: planoNome,
      "VALOR MINUTOS FIXO": parseFloat(planoValorFixo),
      "VALOR MINUTOS MOVEL": parseFloat(planoValorMovel),
    });
    if (result) {
      toast.success("Plano criado!");
      setPlanoNome(""); setPlanoValorFixo(""); setPlanoValorMovel("");
      loadAll();
    }
  };

  const handleCriarCliente = async () => {
    if (!clienteNome || !clienteEmail || !clienteTelefone || !clienteCpfCnpj || 
        !clienteCep || !clienteEndereco || !clienteNumero || !clienteBairro || 
        !clienteCidade || !clienteEstado) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const result = await criarCliente({
      NOME: clienteNome,
      EMAIL: clienteEmail,
      TELEFONE: clienteTelefone,
      "CPF / CNPJ": clienteCpfCnpj,
      CEP: clienteCep,
      ENDERECO: clienteEndereco,
      NUMERO: clienteNumero,
      COMPLEMENTO: clienteComplemento || "",
      BAIRRO: clienteBairro,
      CIDADE: clienteCidade,
      ESTADO: clienteEstado,
      VENCIMENTO: parseInt(clienteVencimento),
      "CORTE FATURA": parseInt(clienteCorteFatura),
    });
    if (result) {
      toast.success("Cliente criado!");
      setClienteNome(""); setClienteEmail(""); setClienteTelefone("");
      setClienteCpfCnpj(""); setClienteCep(""); setClienteEndereco("");
      setClienteNumero(""); setClienteComplemento(""); setClienteBairro("");
      setClienteCidade(""); setClienteEstado("");
      setClienteVencimento("10"); setClienteCorteFatura("5");
      loadAll();
    }
  };

  const handleVincular = async () => {
    if (!vincClienteId || !vincPlanoId || vincDids.length === 0) {
      toast.error("Selecione cliente, plano e pelo menos um DID");
      return;
    }
    // Fix #6: Build LISTA DE DIDS as "CN,NUMERO" format
    const listaDids = vincDids.map(numero => {
      const did = dids.find(d => d.numero === numero);
      return did ? `${did.cn},${did.numero}` : numero;
    }).join(";");

    const result = await montarClientePlanoDids({
      "ID CLIENTE": vincClienteId,
      "ID PLANO": vincPlanoId,
      "LISTA DE DIDS": listaDids,
    });
    if (result) {
      toast.success("DID(s) vinculado(s) ao cliente e plano!");
      setVincDids([]);
    }
  };

  const toggleDidSelection = (numero: string) => {
    setVincDids(prev => 
      prev.includes(numero) ? prev.filter(n => n !== numero) : [...prev, numero]
    );
  };

  const estados = [
    "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
    "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
  ];

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
              <div>
                <Label>Nome do Plano *</Label>
                <Input value={planoNome} onChange={e => setPlanoNome(e.target.value)} placeholder="Ex: Plano Básico" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor Minutos Fixo (R$) *</Label>
                  <Input type="number" step="0.01" value={planoValorFixo} onChange={e => setPlanoValorFixo(e.target.value)} placeholder="0.00" />
                  <p className="text-xs text-muted-foreground mt-1">Custo por minuto para telefone fixo</p>
                </div>
                <div>
                  <Label>Valor Minutos Móvel (R$) *</Label>
                  <Input type="number" step="0.01" value={planoValorMovel} onChange={e => setPlanoValorMovel(e.target.value)} placeholder="0.00" />
                  <p className="text-xs text-muted-foreground mt-1">Custo por minuto para celular</p>
                </div>
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
                      <TableHead>Fixo</TableHead>
                      <TableHead>Móvel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {planos.map((p: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell>{p.ID || p.id}</TableCell>
                        <TableCell>{p.NOME || p.nome}</TableCell>
                        <TableCell>R$ {p["VALOR MINUTOS FIXO"] || p.valor_minutos_fixo || "-"}</TableCell>
                        <TableCell>R$ {p["VALOR MINUTOS MOVEL"] || p.valor_minutos_movel || "-"}</TableCell>
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
                  <Label>Nome *</Label>
                  <Input value={clienteNome} onChange={e => setClienteNome(e.target.value)} placeholder="Nome completo" />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={clienteEmail} onChange={e => setClienteEmail(e.target.value)} placeholder="email@exemplo.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Telefone *</Label>
                  <Input value={clienteTelefone} onChange={e => setClienteTelefone(e.target.value)} placeholder="11999998888" />
                </div>
                <div>
                  <Label>CPF / CNPJ *</Label>
                  <Input value={clienteCpfCnpj} onChange={e => setClienteCpfCnpj(e.target.value)} placeholder="000.000.000-00" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>CEP *</Label>
                  <Input value={clienteCep} onChange={e => setClienteCep(e.target.value)} placeholder="00000-000" />
                </div>
                <div className="col-span-2">
                  <Label>Endereço *</Label>
                  <Input value={clienteEndereco} onChange={e => setClienteEndereco(e.target.value)} placeholder="Rua, Avenida..." />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Número *</Label>
                  <Input value={clienteNumero} onChange={e => setClienteNumero(e.target.value)} placeholder="123" />
                </div>
                <div>
                  <Label>Complemento</Label>
                  <Input value={clienteComplemento} onChange={e => setClienteComplemento(e.target.value)} placeholder="Apto, Sala..." />
                </div>
                <div>
                  <Label>Bairro *</Label>
                  <Input value={clienteBairro} onChange={e => setClienteBairro(e.target.value)} placeholder="Bairro" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Cidade *</Label>
                  <Input value={clienteCidade} onChange={e => setClienteCidade(e.target.value)} placeholder="Cidade" />
                </div>
                <div>
                  <Label>Estado *</Label>
                  <Select value={clienteEstado} onValueChange={setClienteEstado}>
                    <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                    <SelectContent>
                      {estados.map(uf => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Vencimento</Label>
                    <Input type="number" min="1" max="28" value={clienteVencimento} onChange={e => setClienteVencimento(e.target.value)} />
                  </div>
                  <div>
                    <Label>Corte</Label>
                    <Input type="number" min="1" max="28" value={clienteCorteFatura} onChange={e => setClienteCorteFatura(e.target.value)} />
                  </div>
                </div>
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
                      <TableHead>CPF/CNPJ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientes.map((c: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell>{c.ID || c.id}</TableCell>
                        <TableCell>{c.NOME || c.nome}</TableCell>
                        <TableCell>{c.EMAIL || c.email}</TableCell>
                        <TableCell>{c["CPF / CNPJ"] || c.cpf_cnpj || "-"}</TableCell>
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
                <Label>Cliente *</Label>
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
                <Label>Plano *</Label>
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
                <Label>DIDs (Números) * — clique para selecionar</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {dids.map(d => (
                    <Button
                      key={d.id}
                      variant={vincDids.includes(d.numero) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleDidSelection(d.numero)}
                    >
                      {d.numero}
                    </Button>
                  ))}
                  {dids.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum DID ativo disponível</p>
                  )}
                </div>
                {vincDids.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">{vincDids.length} número(s) selecionado(s)</p>
                )}
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
