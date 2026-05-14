import { useModuleAccess } from "@/modules/marketplace/hooks/useMarketplace";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  slug: string;
  moduleName?: string;
  children: React.ReactNode;
}

export function ModuleGate({ slug, moduleName, children }: Props) {
  const { hasAccess, loading, status } = useModuleAccess(slug);
  const navigate = useNavigate();

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (hasAccess) return <>{children}</>;

  return (
    <div className="container mx-auto p-6">
      <Card className="p-8 max-w-md mx-auto text-center space-y-4">
        <div className="h-14 w-14 rounded-full bg-muted mx-auto flex items-center justify-center">
          <Lock className="h-7 w-7 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Módulo não contratado</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {status === "past_due"
              ? "Assinatura com pagamento pendente."
              : status === "canceled"
              ? "Assinatura cancelada."
              : `Contrate ${moduleName || "este módulo"} no Marketplace para continuar.`}
          </p>
        </div>
        <Button onClick={() => navigate("/marketplace")}>Ir ao Marketplace</Button>
      </Card>
    </div>
  );
}
