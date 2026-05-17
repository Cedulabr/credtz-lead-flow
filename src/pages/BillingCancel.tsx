import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default function BillingCancel() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        <XCircle className="h-16 w-16 text-muted-foreground mx-auto" />
        <h1 className="text-2xl font-bold">Pagamento não concluído</h1>
        <p className="text-muted-foreground">
          Você pode tentar novamente a qualquer momento.
        </p>
        <Button onClick={() => navigate("/marketplace")} className="w-full">
          Ver planos disponíveis
        </Button>
      </Card>
    </div>
  );
}
