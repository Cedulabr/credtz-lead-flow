import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function BillingSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const moduleSlug = params.get("module");

  useEffect(() => {
    const t = setTimeout(() => navigate("/marketplace?status=success"), 5000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
        <h1 className="text-2xl font-bold">Assinatura ativada com sucesso!</h1>
        <p className="text-muted-foreground">
          {moduleSlug ? `O módulo ${moduleSlug} já está ativo.` : "Seu plano já está ativo."}
          {" "}Você pode começar a usar todas as funcionalidades.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={() => navigate("/")} className="w-full">Ir para o painel</Button>
          <Button onClick={() => navigate("/marketplace")} variant="outline" className="w-full">
            Ver marketplace
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Redirecionando automaticamente em 5s...</p>
      </Card>
    </div>
  );
}
