import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Database, ArrowLeft, RefreshCw, Users } from "lucide-react";
import { ImportHistory } from "@/components/ImportHistory";
import { LeadsDatabase } from "@/components/LeadsDatabase";
import { ImportWizard } from "@/components/leads/ImportWizard";
import { UpdateDataWizard } from "@/components/leads/UpdateDataWizard";

interface ImportBaseProps {
  onBack: () => void;
}

export function ImportBase({ onBack }: ImportBaseProps) {
  const { profile } = useAuth();
  const [importOpen, setImportOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCompleted = () => setRefreshKey(k => k + 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Gestão da Base de Leads</h1>
            <p className="text-sm text-muted-foreground">
              Importe novas bases ou atualize informações de leads existentes.
            </p>
          </div>
        </div>
      </div>

      <ImportHistory key={`hist-${refreshKey}`} module="leads_database" title="Leads Premium" />

      <Tabs defaultValue="import" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="import" className="gap-2">
            <Upload className="h-4 w-4" /> Importar / Atualizar
          </TabsTrigger>
          <TabsTrigger value="manage" className="gap-2">
            <Database className="h-4 w-4" /> Base de Leads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4 mt-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/40" onClick={() => setImportOpen(true)}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Importar nova base</CardTitle>
                    <CardDescription>INSS, SIAPE ou Servidor Público</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Wizard guiado em até 6 passos: convênio, vínculo, estado, upload, mapeamento e confirmação.
                </p>
                <Button className="mt-4 w-full">Iniciar importação</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/40" onClick={() => setUpdateOpen(true)}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <CardTitle>Atualizar Dados</CardTitle>
                    <CardDescription>Telefone, margem, parcelas, etc.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Atualize um ou mais campos dos leads existentes via planilha (match por CPF).
                </p>
                <Button variant="outline" className="mt-4 w-full">Iniciar atualização</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="manage" className="mt-6">
          <LeadsDatabase key={`db-${refreshKey}`} />
        </TabsContent>
      </Tabs>

      <ImportWizard open={importOpen} onOpenChange={setImportOpen} onCompleted={handleCompleted} />
      <UpdateDataWizard open={updateOpen} onOpenChange={setUpdateOpen} onCompleted={handleCompleted} />
    </div>
  );
}
