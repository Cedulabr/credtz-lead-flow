import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Phone, 
  User, 
  CreditCard, 
  Building2, 
  Calendar, 
  DollarSign,
  FileText,
  Send,
  Sparkles,
  CheckCircle2
} from "lucide-react";

interface TelevendasBank {
  id: string;
  name: string;
  code: string | null;
}

const formSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  cpf: z.string().min(11, "CPF deve ter 11 dígitos"),
  data_venda: z.string().min(1, "Data da venda é obrigatória"),
  telefone: z.string().min(10, "Telefone inválido"),
  banco: z.string().min(1, "Banco é obrigatório"),
  parcela: z.string().min(1, "Parcela é obrigatória"),
  troco: z.string().optional(),
  saldo_devedor: z.string().optional(),
  tipo_operacao: z.enum(["Portabilidade", "Novo empréstimo", "Refinanciamento", "Cartão"]),
  observacao: z.string().optional(),
});

export const TelevendasForm = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [banks, setBanks] = useState<TelevendasBank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [successMessage, setSuccessMessage] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      cpf: "",
      data_venda: new Date().toISOString().split('T')[0],
      telefone: "",
      banco: "",
      parcela: "",
      troco: "",
      saldo_devedor: "",
      tipo_operacao: "Novo empréstimo",
      observacao: "",
    },
  });

  // Watch tipo_operacao para mostrar/esconder campo saldo_devedor
  const tipoOperacao = form.watch("tipo_operacao");

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      const { data, error } = await supabase
        .from("televendas_banks")
        .select("id, name, code")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setBanks(data || []);
    } catch (error) {
      console.error("Error fetching banks:", error);
    } finally {
      setLoadingBanks(false);
    }
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (!numbers) return "";
    const amount = parseInt(numbers) / 100;
    return amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado",
          variant: "destructive",
        });
        return;
      }

      // Converter valores de centavos para reais (dividir por 100)
      // Os valores são armazenados como centavos pela máscara de moeda
      const parcelaValue = values.parcela ? parseInt(values.parcela) / 100 : 0;
      const trocoValue = values.troco ? parseInt(values.troco) / 100 : null;
      const saldoDevedorValue = values.saldo_devedor ? parseInt(values.saldo_devedor) / 100 : null;

      const { error } = await (supabase as any).from("televendas").insert({
        user_id: user.id,
        nome: values.nome,
        cpf: values.cpf.replace(/\D/g, ""),
        data_venda: values.data_venda,
        telefone: values.telefone.replace(/\D/g, ""),
        banco: values.banco,
        parcela: parcelaValue,
        troco: trocoValue,
        saldo_devedor: saldoDevedorValue,
        tipo_operacao: values.tipo_operacao,
        observacao: values.observacao || null,
      });

      if (error) throw error;

      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 3000);

      toast({
        title: "Venda cadastrada!",
        description: "A venda foi registrada com sucesso no sistema.",
      });

      form.reset({
        nome: "",
        cpf: "",
        data_venda: new Date().toISOString().split('T')[0],
        telefone: "",
        banco: "",
        parcela: "",
        troco: "",
        saldo_devedor: "",
        tipo_operacao: "Novo empréstimo",
        observacao: "",
      });
    } catch (error) {
      console.error("Error creating televendas:", error);
      toast({
        title: "Erro",
        description: "Erro ao cadastrar venda. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const tipoOperacaoOptions = [
    { value: "Portabilidade", label: "Portabilidade", color: "bg-blue-500" },
    { value: "Novo empréstimo", label: "Novo Empréstimo", color: "bg-green-500" },
    { value: "Refinanciamento", label: "Refinanciamento", color: "bg-orange-500" },
    { value: "Cartão", label: "Cartão", color: "bg-purple-500" },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
            <Phone className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cadastrar Venda</h1>
            <p className="text-lg text-muted-foreground">Televendas</p>
          </div>
          <Badge variant="secondary" className="ml-auto text-sm px-4 py-2">
            <Sparkles className="h-4 w-4 mr-2" />
            Nova Venda
          </Badge>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <Card className="mb-6 border-green-500/50 bg-green-500/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              <span className="text-lg font-medium text-green-600">
                Venda cadastrada com sucesso!
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-xl border-2">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Dados da Venda
          </CardTitle>
          <CardDescription className="text-base">
            Preencha as informações abaixo para registrar uma nova venda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Dados do Cliente */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Dados do Cliente</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">
                          Nome Completo *
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Digite o nome do cliente"
                            className="h-12 text-base"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">
                          CPF *
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input 
                              {...field}
                              value={formatCPF(field.value)}
                              onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 11))}
                              placeholder="000.000.000-00"
                              className="h-12 text-base pl-10"
                              maxLength={14}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">
                          Telefone *
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input 
                              {...field}
                              value={formatPhone(field.value)}
                              onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 11))}
                              placeholder="(00) 00000-0000"
                              className="h-12 text-base pl-10"
                              maxLength={15}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="data_venda"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">
                          Data da Venda *
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input 
                              type="date" 
                              {...field} 
                              className="h-12 text-base pl-10"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Dados da Operação */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Dados da Operação</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="banco"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">
                          Banco *
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 text-base">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                                <SelectValue placeholder={loadingBanks ? "Carregando..." : "Selecione o banco"} />
                              </div>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {banks.length === 0 && !loadingBanks ? (
                              <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                                Nenhum banco cadastrado
                              </div>
                            ) : (
                              banks.map((bank) => (
                                <SelectItem key={bank.id} value={bank.name} className="text-base py-3">
                                  <span className="font-medium">{bank.name}</span>
                                  {bank.code && (
                                    <span className="text-muted-foreground ml-2">({bank.code})</span>
                                  )}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tipo_operacao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">
                          Tipo de Operação *
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 text-base">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tipoOperacaoOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value} className="text-base py-3">
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${option.color}`} />
                                  {option.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="parcela"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">
                          Valor da Parcela *
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                              R$
                            </span>
                            <Input 
                              {...field}
                              value={formatCurrency(field.value)}
                              onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                              placeholder="0,00"
                              className="h-12 text-base pl-10 text-right font-semibold"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="troco"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">
                          Troco <span className="text-muted-foreground">(opcional)</span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                              R$
                            </span>
                            <Input 
                              {...field}
                              value={field.value ? formatCurrency(field.value) : ""}
                              onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                              placeholder="0,00"
                              className="h-12 text-base pl-10 text-right font-semibold"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Campo Saldo Devedor - Apenas para Portabilidade */}
                  {tipoOperacao === "Portabilidade" && (
                    <FormField
                      control={form.control}
                      name="saldo_devedor"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-base font-medium flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-blue-500" />
                            Saldo Devedor
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              Portabilidade
                            </span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                                R$
                              </span>
                              <Input 
                                {...field}
                                value={field.value ? formatCurrency(field.value) : ""}
                                onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                                placeholder="0,00"
                                className="h-12 text-base pl-10 text-right font-semibold border-blue-200 focus:border-blue-500"
                              />
                            </div>
                          </FormControl>
                          <p className="text-xs text-muted-foreground mt-1">
                            Informe o saldo devedor do contrato a ser portado
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>

              <Separator />

              {/* Observações */}
              <div>
                <FormField
                  control={form.control}
                  name="observacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        Observações <span className="text-muted-foreground">(opcional)</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Adicione informações adicionais sobre a venda..."
                          className="min-h-[120px] text-base resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  size="lg"
                  className="w-full h-14 text-lg font-semibold gap-3 shadow-lg hover:shadow-xl transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      Cadastrando...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Cadastrar Venda
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
