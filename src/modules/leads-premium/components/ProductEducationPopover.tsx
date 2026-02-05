import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { HelpCircle, Lightbulb, ArrowRight, DollarSign, RefreshCw, PlusCircle, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductInfo {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  benefits: string[];
  tip: string;
  color: string;
}

const PRODUCTS_INFO: ProductInfo[] = [
  {
    id: "portabilidade",
    name: "Portabilidade com Troco",
    icon: RefreshCw,
    description: "Transferência de um empréstimo de outro banco para um novo, com possibilidade de liberar valor adicional (troco).",
    benefits: [
      "Cliente pode reduzir a taxa de juros",
      "Libera dinheiro extra na conta",
      "Mantém ou reduz o valor da parcela",
      "Ideal para quem já tem empréstimo ativo"
    ],
    tip: "Pergunte ao cliente se ele já tem empréstimo em outro banco e qual o valor da parcela atual. O troco é o diferencial!",
    color: "from-blue-500 to-cyan-500"
  },
  {
    id: "refinanciamento",
    name: "Refinanciamento",
    icon: DollarSign,
    description: "Renegociação de um contrato existente NO MESMO BANCO para liberar novo valor ou melhorar condições.",
    benefits: [
      "Libera novo valor na conta",
      "Pode reduzir taxa se as condições melhoraram",
      "Processo mais rápido (mesmo banco)",
      "Cliente já conhece o banco"
    ],
    tip: "Ideal para clientes que já têm contrato há alguns meses. Verifique se já pagou parcelas suficientes para refinanciar.",
    color: "from-emerald-500 to-green-500"
  },
  {
    id: "novo",
    name: "Novo Empréstimo",
    icon: PlusCircle,
    description: "Contratação de um novo empréstimo para cliente que não possui contrato ativo ou tem margem disponível.",
    benefits: [
      "Valor liberado diretamente na conta",
      "Cliente escolhe o prazo",
      "Parcela descontada diretamente",
      "Taxas competitivas"
    ],
    tip: "Verifique a margem consignável disponível. Cliente sem empréstimo = oportunidade de novo!",
    color: "from-violet-500 to-purple-500"
  },
  {
    id: "cartao",
    name: "Cartão Consignado",
    icon: CreditCard,
    description: "Cartão de crédito com desconto em folha. Limite baseado na margem consignável disponível.",
    benefits: [
      "Limite alto com taxas baixas",
      "Saque de até 70% do limite",
      "Parcela fixa descontada em folha",
      "Sem análise de crédito tradicional"
    ],
    tip: "Ótima opção para clientes que precisam de crédito rotativo ou saque rápido. Verifique margem de cartão!",
    color: "from-amber-500 to-orange-500"
  }
];

interface ProductEducationPopoverProps {
  productId: string;
  children?: React.ReactNode;
  showTrigger?: boolean;
}

export function ProductEducationPopover({ productId, children, showTrigger = true }: ProductEducationPopoverProps) {
  const product = PRODUCTS_INFO.find(p => p.id === productId);
  
  if (!product) return children || null;
  
  const Icon = product.icon;
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        {showTrigger ? (
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary">
            <HelpCircle className="h-4 w-4" />
          </Button>
        ) : (
          children
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className={cn("p-3 rounded-t-lg bg-gradient-to-r text-white", product.color)}>
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <h4 className="font-semibold">{product.name}</h4>
          </div>
        </div>
        
        <div className="p-4 space-y-3">
          <p className="text-sm text-muted-foreground">{product.description}</p>
          
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">Vantagens para o cliente:</p>
            <ul className="space-y-1">
              {product.benefits.map((benefit, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <ArrowRight className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">Dica de Venda</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">{product.tip}</p>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Componente para exibir cards de seleção de produto com educação integrada
interface ProductSelectCardProps {
  productId: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function ProductSelectCard({ productId, isSelected, onSelect }: ProductSelectCardProps) {
  const product = PRODUCTS_INFO.find(p => p.id === productId);
  
  if (!product) return null;
  
  const Icon = product.icon;
  
  return (
    <div 
      className={cn(
        "relative p-4 rounded-xl border-2 cursor-pointer transition-all",
        "hover:shadow-md hover:border-primary/50",
        isSelected 
          ? "border-primary bg-primary/5 shadow-md" 
          : "border-muted bg-card"
      )}
      onClick={() => onSelect(product.id)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg bg-gradient-to-r text-white",
            product.color
          )}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-sm">{product.name}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
          </div>
        </div>
        <ProductEducationPopover productId={productId} />
      </div>
      
      {isSelected && (
        <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-primary" />
      )}
    </div>
  );
}

export { PRODUCTS_INFO };
