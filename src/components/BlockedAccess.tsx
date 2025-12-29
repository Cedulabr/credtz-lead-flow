import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface BlockedAccessProps {
  message?: string;
}

export function BlockedAccess({ message = "Acesso bloqueado pelo administrador" }: BlockedAccessProps) {
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
