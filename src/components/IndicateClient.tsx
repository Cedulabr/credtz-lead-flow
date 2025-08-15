import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, 
  Phone, 
  CreditCard, 
  DollarSign, 
  FileText,
  Camera,
  CheckCircle,
  Send
} from "lucide-react";

export function IndicateClient() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    phone: "",
    convenio: "",
    observations: ""
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatCPF = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    return numericValue
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .substring(0, 14);
  };

  const formatPhone = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    return numericValue
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d{1,4})/, "$1-$2")
      .substring(0, 15);
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    const numberValue = parseInt(numericValue) / 100;
    return numberValue.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para indicar clientes.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Salvar no banco de dados na tabela leads
      const { error: insertError } = await supabase
        .from('leads')
        .insert({
          name: formData.name,
          cpf: formData.cpf,
          phone: formData.phone,
          convenio: formData.convenio,
          origem_lead: formData.observations,
          created_by: user.id
        });

      if (insertError) throw insertError;

      // Buscar webhook ativo para indicações
      const { data: webhook } = await supabase
        .from('webhooks')
        .select('url')
        .eq('name', 'client_indication')
        .eq('is_active', true)
        .single();

      // Enviar webhook se configurado
      if (webhook?.url) {
        try {
          await fetch(webhook.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            mode: 'no-cors',
            body: JSON.stringify({
              type: 'client_indication',
              client: {
                name: formData.name,
                cpf: formData.cpf,
                phone: formData.phone,
                convenio: formData.convenio,
                observations: formData.observations
              },
              timestamp: new Date().toISOString()
            })
          });
        } catch (webhookError) {
          console.log('Webhook enviado (modo no-cors)');
        }
      }
      
      toast({
        title: "Cliente indicado com sucesso! 🎉",
        description: "Sua indicação foi enviada para análise. Você receberá atualizações em breve.",
        variant: "default",
      });

      // Reset form
      setFormData({
        name: "",
        cpf: "",
        phone: "",
        convenio: "",
        observations: ""
      });
    } catch (error) {
      console.error('Erro ao enviar indicação:', error);
      toast({
        title: "Erro ao enviar indicação",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefitTypes = [
    { value: "beneficiario_inss", label: "Beneficiário INSS" },
    { value: "credito_trabalhador", label: "Crédito do trabalhador" },
    { value: "saque_fgts", label: "Saque FGTS" },
    { value: "bolsa_familia", label: "Bolsa Família" },
    { value: "servidor_publico", label: "Servidor Público" }
  ];

  const isFormValid = formData.name && formData.cpf && formData.phone && formData.convenio;

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Indicar Cliente
          </h1>
          <p className="text-muted-foreground">
            Preencha os dados do cliente interessado em crédito
          </p>
        </div>

        {/* Form Card */}
        <Card className="bg-gradient-to-br from-card to-muted/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Dados do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Ex: João Silva Santos"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="mt-2"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input
                      id="cpf"
                      type="text"
                      placeholder="000.000.000-00"
                      value={formData.cpf}
                      onChange={(e) => handleInputChange("cpf", formatCPF(e.target.value))}
                      className="mt-2"
                      maxLength={14}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Telefone/WhatsApp *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", formatPhone(e.target.value))}
                      className="mt-2"
                      maxLength={15}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Convenio Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="convenio">Convênio *</Label>
                  <Select
                    value={formData.convenio}
                    onValueChange={(value) => handleInputChange("convenio", value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecione o convênio" />
                    </SelectTrigger>
                    <SelectContent>
                      {benefitTypes.map((benefit) => (
                        <SelectItem key={benefit.value} value={benefit.value}>
                          {benefit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Additional Info */}
              <div>
                <Label htmlFor="observations">Observações (Opcional)</Label>
                <Textarea
                  id="observations"
                  placeholder="Informações adicionais sobre o cliente, urgência, preferências..."
                  value={formData.observations}
                  onChange={(e) => handleInputChange("observations", e.target.value)}
                  className="mt-2 min-h-[100px]"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.observations.length}/500 caracteres
                </p>
              </div>


              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="w-full bg-gradient-to-r from-primary to-success hover:from-primary-dark hover:to-success disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enviando Indicação...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Enviar Indicação
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-success/5 border-success/20">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-6 w-6 text-success mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Sua Renda</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Seu esforço vale ouro! Indique clientes e aumente sua renda.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <FileText className="h-6 w-6 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Acompanhamento</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Receba atualizações sobre o status da proposta
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}