import { Lock, ShoppingCart, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface BlockedAccessProps {
  message?: string;
  purchaseMode?: boolean;
}

export function BlockedAccess({ 
  message = "Acesso bloqueado pelo administrador",
  purchaseMode = false,
}: BlockedAccessProps) {
  if (purchaseMode) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <Card className="max-w-md w-full border-primary/20 shadow-lg">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-5">
            <div className="p-4 bg-primary/10 rounded-full">
              <Sparkles className="h-12 w-12 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Módulo Premium
              </h2>
              <p className="text-muted-foreground">
                Adquira a licença e aumente seus resultados!
              </p>
            </div>
            <Button
              size="lg"
              className="gap-2"
              onClick={() => window.open("https://easyn.com.br/", "_blank")}
            >
              <ShoppingCart className="h-4 w-4" />
              Comprar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="p-4 bg-destructive/10 rounded-full">
            <Lock className="h-12 w-12 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Acesso Restrito
            </h2>
            <p className="text-muted-foreground">
              {message}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
