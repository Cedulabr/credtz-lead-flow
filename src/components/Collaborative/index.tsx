import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BlockedAccess } from "@/components/BlockedAccess";
import { Key, Link2, Server, FileText, FolderOpen, Users } from "lucide-react";
import { PasswordsManager } from "./PasswordsManager";
import { LinksManager } from "./LinksManager";
import { SystemsManager } from "./SystemsManager";
import { ProcessesManager } from "./ProcessesManager";
import { DocumentsManager } from "./DocumentsManager";

export function Collaborative() {
  const { user, profile, isAdmin } = useAuth();
  const [isGestor, setIsGestor] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      // Check if user is gestor
      const { data } = await supabase
        .from("user_companies")
        .select("company_role")
        .eq("user_id", user.id)
        .eq("company_role", "gestor")
        .eq("is_active", true)
        .limit(1);

      setIsGestor(data && data.length > 0);
      setLoading(false);
    };

    checkAccess();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // All authenticated users have access to this module
  if (!user) {
    return <BlockedAccess message="Você precisa estar logado para acessar esta seção" />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7" />
            Colaborativo
          </h1>
          <p className="text-muted-foreground">
            Central de Acessos, Links e Informações Internas
          </p>
        </div>
      </div>

      <Tabs defaultValue="passwords" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="passwords" className="flex items-center gap-2 py-2">
            <Key className="h-4 w-4" />
            <span className="hidden md:inline">Acessos & Senhas</span>
            <span className="md:hidden">Senhas</span>
          </TabsTrigger>
          <TabsTrigger value="links" className="flex items-center gap-2 py-2">
            <Link2 className="h-4 w-4" />
            <span className="hidden md:inline">Links Importantes</span>
            <span className="md:hidden">Links</span>
          </TabsTrigger>
          <TabsTrigger value="systems" className="flex items-center gap-2 py-2">
            <Server className="h-4 w-4" />
            <span className="hidden md:inline">Sistemas & Portais</span>
            <span className="md:hidden">Sistemas</span>
          </TabsTrigger>
          <TabsTrigger value="processes" className="flex items-center gap-2 py-2">
            <FileText className="h-4 w-4" />
            <span className="hidden md:inline">Processos Internos</span>
            <span className="md:hidden">Processos</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2 py-2">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden md:inline">Documentação</span>
            <span className="md:hidden">Docs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="passwords" className="mt-6">
          <PasswordsManager />
        </TabsContent>

        <TabsContent value="links" className="mt-6">
          <LinksManager />
        </TabsContent>

        <TabsContent value="systems" className="mt-6">
          <SystemsManager />
        </TabsContent>

        <TabsContent value="processes" className="mt-6">
          <ProcessesManager />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
