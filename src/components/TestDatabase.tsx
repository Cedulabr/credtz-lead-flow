import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function TestDatabase() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  // Estados para os formulários
  const [clientData, setClientData] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
    birth_date: "",
    contact: "",
    company: ""
  });

  const [bankData, setBankData] = useState({
    name: "",
    price: "",
    description: ""
  });

  const [convenioData, setConvenioData] = useState({
    name: "",
    price: "",
    description: ""
  });

  const [productData, setProductData] = useState({
    name: "",
    price: "",
    description: ""
  });

  const [propostaData, setPropostaData] = useState({
    value: "",
    installments: "",
    status: "pending",
    notes: "",
    "Nome do cliente": "",
    cpf: "",
    produto: "",
    convenio: "",
    banco: "",
    valor: ""
  });

  const testClient = async () => {
    setLoading("client");
    try {
      const { data, error } = await supabase
        .from("clientes")
        .insert([clientData])
        .select();

      if (error) throw error;

      toast({
        title: "Cliente salvo com sucesso!",
        description: `ID: ${data[0].id}`,
      });

      // Limpar formulário
      setClientData({
        name: "",
        email: "",
        phone: "",
        cpf: "",
        birth_date: "",
        contact: "",
        company: ""
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar cliente",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const testBank = async () => {
    setLoading("bank");
    try {
      const { data, error } = await supabase
        .from("banks")
        .insert([bankData])
        .select();

      if (error) throw error;

      toast({
        title: "Banco salvo com sucesso!",
        description: `ID: ${data[0].id}`,
      });

      setBankData({
        name: "",
        price: "",
        description: ""
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar banco",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const testConvenio = async () => {
    setLoading("convenio");
    try {
      const { data, error } = await supabase
        .from("convenios")
        .insert([convenioData])
        .select();

      if (error) throw error;

      toast({
        title: "Convênio salvo com sucesso!",
        description: `ID: ${data[0].id}`,
      });

      setConvenioData({
        name: "",
        price: "",
        description: ""
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar convênio",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const testProduct = async () => {
    setLoading("product");
    try {
      const { data, error } = await supabase
        .from("products")
        .insert([productData])
        .select();

      if (error) throw error;

      toast({
        title: "Produto salvo com sucesso!",
        description: `ID: ${data[0].id}`,
      });

      setProductData({
        name: "",
        price: "",
        description: ""
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar produto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const testProposta = async () => {
    setLoading("proposta");
    try {
      const dataToInsert = {
        ...propostaData,
        installments: propostaData.installments ? parseInt(propostaData.installments) : null
      };
      
      const { data, error } = await supabase
        .from("propostas")
        .insert([dataToInsert])
        .select();

      if (error) throw error;

      toast({
        title: "Proposta salva com sucesso!",
        description: `ID: ${data[0].id}`,
      });

      setPropostaData({
        value: "",
        installments: "",
        status: "pending",
        notes: "",
        "Nome do cliente": "",
        cpf: "",
        produto: "",
        convenio: "",
        banco: "",
        valor: ""
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar proposta",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary">Teste de Banco de Dados</h1>
        <p className="text-muted-foreground">Teste todas as funcionalidades de salvamento no Supabase</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Teste Cliente */}
        <Card>
          <CardHeader>
            <CardTitle>Teste Cliente</CardTitle>
            <CardDescription>Adicionar um novo cliente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="client-name">Nome *</Label>
              <Input
                id="client-name"
                value={clientData.name}
                onChange={(e) => setClientData({...clientData, name: e.target.value})}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label htmlFor="client-email">Email</Label>
              <Input
                id="client-email"
                type="email"
                value={clientData.email}
                onChange={(e) => setClientData({...clientData, email: e.target.value})}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="client-phone">Telefone</Label>
              <Input
                id="client-phone"
                value={clientData.phone}
                onChange={(e) => setClientData({...clientData, phone: e.target.value})}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <Label htmlFor="client-cpf">CPF</Label>
              <Input
                id="client-cpf"
                value={clientData.cpf}
                onChange={(e) => setClientData({...clientData, cpf: e.target.value})}
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <Label htmlFor="client-birth">Data de Nascimento</Label>
              <Input
                id="client-birth"
                type="date"
                value={clientData.birth_date}
                onChange={(e) => setClientData({...clientData, birth_date: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="client-company">Empresa</Label>
              <Input
                id="client-company"
                value={clientData.company}
                onChange={(e) => setClientData({...clientData, company: e.target.value})}
                placeholder="Nome da empresa"
              />
            </div>
            <Button 
              onClick={testClient} 
              disabled={loading === "client" || !clientData.name}
              className="w-full"
            >
              {loading === "client" ? "Salvando..." : "Salvar Cliente"}
            </Button>
          </CardContent>
        </Card>

        {/* Teste Banco */}
        <Card>
          <CardHeader>
            <CardTitle>Teste Banco</CardTitle>
            <CardDescription>Adicionar um novo banco</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bank-name">Nome *</Label>
              <Input
                id="bank-name"
                value={bankData.name}
                onChange={(e) => setBankData({...bankData, name: e.target.value})}
                placeholder="Nome do banco"
              />
            </div>
            <div>
              <Label htmlFor="bank-price">Preço</Label>
              <Input
                id="bank-price"
                value={bankData.price}
                onChange={(e) => setBankData({...bankData, price: e.target.value})}
                placeholder="R$ 0,00"
              />
            </div>
            <div>
              <Label htmlFor="bank-description">Descrição</Label>
              <Textarea
                id="bank-description"
                value={bankData.description}
                onChange={(e) => setBankData({...bankData, description: e.target.value})}
                placeholder="Descrição do banco"
              />
            </div>
            <Button 
              onClick={testBank} 
              disabled={loading === "bank" || !bankData.name}
              className="w-full"
            >
              {loading === "bank" ? "Salvando..." : "Salvar Banco"}
            </Button>
          </CardContent>
        </Card>

        {/* Teste Convênio */}
        <Card>
          <CardHeader>
            <CardTitle>Teste Convênio</CardTitle>
            <CardDescription>Adicionar um novo convênio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="convenio-name">Nome *</Label>
              <Input
                id="convenio-name"
                value={convenioData.name}
                onChange={(e) => setConvenioData({...convenioData, name: e.target.value})}
                placeholder="Nome do convênio"
              />
            </div>
            <div>
              <Label htmlFor="convenio-price">Preço</Label>
              <Input
                id="convenio-price"
                value={convenioData.price}
                onChange={(e) => setConvenioData({...convenioData, price: e.target.value})}
                placeholder="R$ 0,00"
              />
            </div>
            <div>
              <Label htmlFor="convenio-description">Descrição</Label>
              <Textarea
                id="convenio-description"
                value={convenioData.description}
                onChange={(e) => setConvenioData({...convenioData, description: e.target.value})}
                placeholder="Descrição do convênio"
              />
            </div>
            <Button 
              onClick={testConvenio} 
              disabled={loading === "convenio" || !convenioData.name}
              className="w-full"
            >
              {loading === "convenio" ? "Salvando..." : "Salvar Convênio"}
            </Button>
          </CardContent>
        </Card>

        {/* Teste Produto */}
        <Card>
          <CardHeader>
            <CardTitle>Teste Produto</CardTitle>
            <CardDescription>Adicionar um novo produto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="product-name">Nome *</Label>
              <Input
                id="product-name"
                value={productData.name}
                onChange={(e) => setProductData({...productData, name: e.target.value})}
                placeholder="Nome do produto"
              />
            </div>
            <div>
              <Label htmlFor="product-price">Preço</Label>
              <Input
                id="product-price"
                value={productData.price}
                onChange={(e) => setProductData({...productData, price: e.target.value})}
                placeholder="R$ 0,00"
              />
            </div>
            <div>
              <Label htmlFor="product-description">Descrição</Label>
              <Textarea
                id="product-description"
                value={productData.description}
                onChange={(e) => setProductData({...productData, description: e.target.value})}
                placeholder="Descrição do produto"
              />
            </div>
            <Button 
              onClick={testProduct} 
              disabled={loading === "product" || !productData.name}
              className="w-full"
            >
              {loading === "product" ? "Salvando..." : "Salvar Produto"}
            </Button>
          </CardContent>
        </Card>

        {/* Teste Proposta */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Teste Proposta</CardTitle>
            <CardDescription>Adicionar uma nova proposta</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="proposta-cliente">Nome do Cliente</Label>
              <Input
                id="proposta-cliente"
                value={propostaData["Nome do cliente"]}
                onChange={(e) => setPropostaData({...propostaData, "Nome do cliente": e.target.value})}
                placeholder="Nome do cliente"
              />
            </div>
            <div>
              <Label htmlFor="proposta-cpf">CPF</Label>
              <Input
                id="proposta-cpf"
                value={propostaData.cpf}
                onChange={(e) => setPropostaData({...propostaData, cpf: e.target.value})}
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <Label htmlFor="proposta-produto">Produto</Label>
              <Input
                id="proposta-produto"
                value={propostaData.produto}
                onChange={(e) => setPropostaData({...propostaData, produto: e.target.value})}
                placeholder="Nome do produto"
              />
            </div>
            <div>
              <Label htmlFor="proposta-convenio">Convênio</Label>
              <Input
                id="proposta-convenio"
                value={propostaData.convenio}
                onChange={(e) => setPropostaData({...propostaData, convenio: e.target.value})}
                placeholder="Nome do convênio"
              />
            </div>
            <div>
              <Label htmlFor="proposta-banco">Banco</Label>
              <Input
                id="proposta-banco"
                value={propostaData.banco}
                onChange={(e) => setPropostaData({...propostaData, banco: e.target.value})}
                placeholder="Nome do banco"
              />
            </div>
            <div>
              <Label htmlFor="proposta-valor">Valor</Label>
              <Input
                id="proposta-valor"
                value={propostaData.valor}
                onChange={(e) => setPropostaData({...propostaData, valor: e.target.value})}
                placeholder="R$ 0,00"
              />
            </div>
            <div>
              <Label htmlFor="proposta-value">Value</Label>
              <Input
                id="proposta-value"
                value={propostaData.value}
                onChange={(e) => setPropostaData({...propostaData, value: e.target.value})}
                placeholder="R$ 0,00"
              />
            </div>
            <div>
              <Label htmlFor="proposta-installments">Parcelas</Label>
              <Input
                id="proposta-installments"
                type="number"
                value={propostaData.installments}
                onChange={(e) => setPropostaData({...propostaData, installments: e.target.value})}
                placeholder="12"
              />
            </div>
            <div>
              <Label htmlFor="proposta-status">Status</Label>
              <Select value={propostaData.status} onValueChange={(value) => setPropostaData({...propostaData, status: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                  <SelectItem value="in_analysis">Em Análise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="proposta-notes">Observações</Label>
              <Textarea
                id="proposta-notes"
                value={propostaData.notes}
                onChange={(e) => setPropostaData({...propostaData, notes: e.target.value})}
                placeholder="Observações sobre a proposta"
              />
            </div>
            <div className="md:col-span-2">
              <Button 
                onClick={testProposta} 
                disabled={loading === "proposta"}
                className="w-full"
              >
                {loading === "proposta" ? "Salvando..." : "Salvar Proposta"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}