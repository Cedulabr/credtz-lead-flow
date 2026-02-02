import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormWizard } from "@/components/ui/form-wizard";
import { Phone, User, ShoppingCart, DollarSign, CheckCircle2, Sparkles, PartyPopper } from "lucide-react";
import { SalesWizardData } from "./types";
import { ClientDataStep } from "./components/ClientDataStep";
import { ProductStep } from "./components/ProductStep";
import { ValuesStep } from "./components/ValuesStep";
import { ConfirmStep } from "./components/ConfirmStep";
import { motion, AnimatePresence } from "framer-motion";

const WIZARD_STEPS = [
  { id: "client", title: "Cliente", icon: User },
  { id: "product", title: "Produto", icon: ShoppingCart },
  { id: "values", title: "Valores", icon: DollarSign },
  { id: "confirm", title: "Confirmar", icon: CheckCircle2 },
];

export function SalesWizard() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStepValid, setIsStepValid] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [wizardData, setWizardData] = useState<Partial<SalesWizardData>>({
    data_venda: new Date().toISOString().split('T')[0],
  });

  const handleUpdate = useCallback((updates: Partial<SalesWizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  }, []);

  const handleValidChange = useCallback((isValid: boolean) => {
    setIsStepValid(isValid);
  }, []);

  const handleComplete = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get user's company
      const { data: userCompanyData } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      const companyId = userCompanyData?.company_id || null;

      // Insert televendas record
      const { error } = await (supabase as any).from("televendas").insert({
        user_id: user.id,
        company_id: companyId,
        nome: wizardData.nome,
        cpf: wizardData.cpf?.replace(/\D/g, ""),
        data_venda: wizardData.data_venda,
        telefone: wizardData.telefone?.replace(/\D/g, ""),
        banco: wizardData.banco,
        parcela: wizardData.parcela || 0,
        troco: wizardData.troco || null,
        saldo_devedor: wizardData.saldo_devedor || null,
        tipo_operacao: wizardData.tipo_operacao,
        observacao: wizardData.observacao || null,
        status: 'solicitar_digitacao',
      });

      if (error) throw error;

      setShowSuccess(true);
      
      toast({
        title: "🎉 Venda cadastrada!",
        description: "A venda foi registrada com sucesso.",
      });

      // Reset after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
        setCurrentStep(0);
        setWizardData({
          data_venda: new Date().toISOString().split('T')[0],
        });
      }, 3000);

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

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
            <Phone className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nova Venda</h1>
            <p className="text-lg text-muted-foreground">Passo a passo guiado</p>
          </div>
          <Badge variant="secondary" className="ml-auto text-sm px-4 py-2">
            <Sparkles className="h-4 w-4 mr-2" />
            Assistente de Vendas
          </Badge>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {showSuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6"
            >
              <PartyPopper className="h-12 w-12 text-primary" />
            </motion.div>
            <h2 className="text-2xl font-bold text-primary mb-2">Venda Cadastrada!</h2>
            <p className="text-muted-foreground">Preparando para nova venda...</p>
          </motion.div>
        ) : (
          <Card className="shadow-xl border-2">
            <CardHeader className="pb-0">
              <CardTitle className="sr-only">Formulário de Venda</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <FormWizard
                steps={WIZARD_STEPS}
                currentStep={currentStep}
                onStepChange={setCurrentStep}
                onComplete={handleComplete}
                isSubmitting={isSubmitting}
                canProceed={isStepValid}
                completeText="Finalizar Venda"
              >
                {[
                  <ClientDataStep key="client" data={wizardData} onUpdate={handleUpdate} onValidChange={handleValidChange} />,
                  <ProductStep key="product" data={wizardData} onUpdate={handleUpdate} onValidChange={handleValidChange} />,
                  <ValuesStep key="values" data={wizardData} onUpdate={handleUpdate} onValidChange={handleValidChange} />,
                  <ConfirmStep key="confirm" data={wizardData} onUpdate={handleUpdate} onValidChange={handleValidChange} />,
                ]}
              </FormWizard>
            </CardContent>
          </Card>
        )}
      </AnimatePresence>
    </div>
  );
}
