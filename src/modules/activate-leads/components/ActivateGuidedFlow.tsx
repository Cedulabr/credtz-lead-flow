import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Zap, 
  Target, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  Info,
  Sparkles,
  Search,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepProps {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  isActive: boolean;
  isCompleted: boolean;
}

const Step = ({ number, title, description, icon, isActive, isCompleted }: StepProps) => (
  <div className={cn(
    "flex items-start gap-4 p-4 rounded-xl transition-all duration-300",
    isActive ? "bg-primary/5 border border-primary/20 shadow-sm" : "opacity-60"
  )}>
    <div className={cn(
      "w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold",
      isCompleted ? "bg-green-500 text-white" : isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
    )}>
      {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : number}
    </div>
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="font-semibold text-base">{title}</h4>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

export const ActivateGuidedFlow = () => {
  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-2xl font-bold flex items-center justify-center md:justify-start gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Bem-vindo ao Ativar Leads!
            </h2>
            <p className="text-muted-foreground">
              Siga os passos abaixo para começar a qualificar seus novos clientes.
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
            Começar Agora <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Step 
            number={1}
            title="Importar Base"
            description="Suba sua lista de contatos via CSV ou Excel para começar."
            icon={<Target className="h-4 w-4 text-primary" />}
            isActive={true}
            isCompleted={false}
          />
          <Step 
            number={2}
            title="Filtrar & Segmentar"
            description="Use os filtros avançados para encontrar os melhores leads."
            icon={<Search className="h-4 w-4 text-blue-500" />}
            isActive={false}
            isCompleted={false}
          />
          <Step 
            number={3}
            title="Iniciar Contatos"
            description="Fale com os clientes via WhatsApp ou Telefone diretamente."
            icon={<MessageSquare className="h-4 w-4 text-green-500" />}
            isActive={false}
            isCompleted={false}
          />
        </div>

        <div className="mt-8 p-4 bg-primary/10 rounded-lg flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium">Dica Pro:</p>
            <p className="text-xs text-muted-foreground">
              Leads com status "Novo" devem ser priorizados nas primeiras 24 horas para maior conversão.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};