import { AdminPanelNew } from "@/components/admin";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

export default function Admin() {
  const { isAdmin, loading, profile, profileLoading, refreshProfile } = useAuth();
  
  if (loading) return null;
  
  // If profile is null (network error), show retry option
  if (profile === null && !profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Erro de Conectividade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Não foi possível carregar seu perfil devido a problemas de conectividade.</p>
            <Button 
              onClick={refreshProfile} 
              className="w-full"
              disabled={profileLoading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${profileLoading ? 'animate-spin' : ''}`} />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!isAdmin) return <div className="p-6">Acesso restrito ao administrador.</div>;
  return <AdminPanelNew />;
}
