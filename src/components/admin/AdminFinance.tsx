import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Wallet, 
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import existing components
import { ContaCorrente } from '@/components/ContaCorrente';

type FinanceSection = 'menu' | 'conta-corrente';

interface SectionItem {
  id: FinanceSection;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

export function AdminFinance() {
  const [activeSection, setActiveSection] = useState<FinanceSection>('menu');

  const sections: SectionItem[] = [
    {
      id: 'conta-corrente',
      label: 'Conta Corrente',
      description: 'Gerenciar transações e saldos',
      icon: Wallet,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'conta-corrente':
        return <ContaCorrente />;
      default:
        return null;
    }
  };

  const currentSection = sections.find(s => s.id === activeSection);

  // Show submenu
  if (activeSection === 'menu') {
    return (
      <div className="space-y-6 px-4 md:px-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie conta corrente e transações financeiras
          </p>
        </div>

        <div className="grid gap-3">
          {sections.map((section, index) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className="cursor-pointer transition-all hover:shadow-md active:scale-[0.99]"
                onClick={() => setActiveSection(section.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                      section.bgColor
                    )}>
                      <section.icon className={cn("h-6 w-6", section.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{section.label}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {section.description}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // Show section content
  return (
    <div className="space-y-4 px-4 md:px-0">
      {/* Back button */}
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => setActiveSection('menu')}
        className="gap-2 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Financeiro
      </Button>

      {/* Section header */}
      {currentSection && (
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center",
            currentSection.bgColor
          )}>
            <currentSection.icon className={cn("h-5 w-5", currentSection.color)} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold">{currentSection.label}</h1>
            <p className="text-sm text-muted-foreground">{currentSection.description}</p>
          </div>
        </div>
      )}

      {/* Section content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
