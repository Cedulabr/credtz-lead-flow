import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Server, ExternalLink, Search } from "lucide-react";
import { CollaborativeSystem } from "./types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ENVIRONMENTS = [
  { value: "production", label: "Produção" },
  { value: "staging", label: "Homologação" },
  { value: "development", label: "Desenvolvimento" },
];

export function SystemsManager() {
  const { user } = useAuth();
  const [systems, setSystems] = useState<CollaborativeSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<CollaborativeSystem | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    purpose: "",
    main_url: "",
    environment: "production",
    integrations: "",
    technical_notes: "",
  });

  useEffect(() => {
    fetchSystems();
  }, []);

  const fetchSystems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("collaborative_systems")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Erro ao carregar sistemas");
      console.error(error);
    } else {
      setSystems(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error("Nome é obrigatório");
      return;
    }

    const integrationsArray = formData.integrations
      ? formData.integrations.split(",").map((s) => s.trim()).filter(Boolean)
      : null;

    if (editingSystem) {
      const { error } = await supabase
        .from("collaborative_systems")
        .update({
          name: formData.name,
          purpose: formData.purpose || null,
          main_url: formData.main_url || null,
          environment: formData.environment,
          integrations: integrationsArray,
          technical_notes: formData.technical_notes || null,
          updated_by: user?.id,
        })
        .eq("id", editingSystem.id);

      if (error) {
        toast.error("Erro ao atualizar sistema");
        console.error(error);
      } else {
        toast.success("Sistema atualizado com sucesso");
        fetchSystems();
        closeDialog();
      }
    } else {
      const { error } = await supabase
        .from("collaborative_systems")
        .insert({
          name: formData.name,
          purpose: formData.purpose || null,
          main_url: formData.main_url || null,
          environment: formData.environment,
          integrations: integrationsArray,
          technical_notes: formData.technical_notes || null,
          created_by: user?.id,
          updated_by: user?.id,
        });

      if (error) {
        toast.error("Erro ao criar sistema");
        console.error(error);
      } else {
        toast.success("Sistema criado com sucesso");
        fetchSystems();
        closeDialog();
      }
    }
  };

  const handleDelete = async (system: CollaborativeSystem) => {
    const { error } = await supabase
      .from("collaborative_systems")
      .delete()
      .eq("id", system.id);

    if (error) {
      toast.error("Erro ao excluir sistema");
      console.error(error);
    } else {
      toast.success("Sistema excluído com sucesso");
      fetchSystems();
    }
  };

  const openEditDialog = (system: CollaborativeSystem) => {
    setEditingSystem(system);
    setFormData({
      name: system.name,
      purpose: system.purpose || "",
      main_url: system.main_url || "",
      environment: system.environment,
      integrations: system.integrations?.join(", ") || "",
      technical_notes: system.technical_notes || "",
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingSystem(null);
    setFormData({
      name: "",
      purpose: "",
      main_url: "",
      environment: "production",
      integrations: "",
      technical_notes: "",
    });
  };

  const filteredSystems = systems.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.technical_notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEnvironmentBadge = (env: string) => {
    const colors: Record<string, string> = {
      production: "bg-green-500/10 text-green-500",
      staging: "bg-yellow-500/10 text-yellow-500",
      development: "bg-blue-500/10 text-blue-500",
    };
    const label = ENVIRONMENTS.find((e) => e.value === env)?.label || env;
    return <Badge className={colors[env] || "bg-gray-500/10 text-gray-500"}>{label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Sistemas & Portais
            </CardTitle>
            <CardDescription>Cadastre todos os sistemas utilizados pela empresa</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => closeDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Sistema
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingSystem ? "Editar Sistema" : "Novo Sistema"}</DialogTitle>
                <DialogDescription>Preencha os dados do sistema</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: CRM Principal"
                  />
                </div>
                <div>
                  <Label>Finalidade</Label>
                  <Input
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    placeholder="Para que serve este sistema?"
                  />
                </div>
                <div>
                  <Label>URL Principal</Label>
                  <Input
                    value={formData.main_url}
                    onChange={(e) => setFormData({ ...formData, main_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>Ambiente</Label>
                  <Select
                    value={formData.environment}
                    onValueChange={(value) => setFormData({ ...formData, environment: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENVIRONMENTS.map((env) => (
                        <SelectItem key={env.value} value={env.value}>
                          {env.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Integrações (separar por vírgula)</Label>
                  <Input
                    value={formData.integrations}
                    onChange={(e) => setFormData({ ...formData, integrations: e.target.value })}
                    placeholder="API, Webhook, etc"
                  />
                </div>
                <div>
                  <Label>Notas Técnicas</Label>
                  <Textarea
                    value={formData.technical_notes}
                    onChange={(e) => setFormData({ ...formData, technical_notes: e.target.value })}
                    placeholder="Observações técnicas..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit}>{editingSystem ? "Salvar" : "Criar"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar sistemas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filteredSystems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "Nenhum resultado encontrado" : "Nenhum sistema cadastrado"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sistema</TableHead>
                  <TableHead>Finalidade</TableHead>
                  <TableHead>Ambiente</TableHead>
                  <TableHead>Integrações</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSystems.map((system) => (
                  <TableRow key={system.id}>
                    <TableCell>
                      <div className="font-medium">{system.name}</div>
                      {system.main_url && (
                        <a
                          href={system.main_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Acessar
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{system.purpose || "-"}</TableCell>
                    <TableCell>{getEnvironmentBadge(system.environment)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {system.integrations?.map((int, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {int}
                          </Badge>
                        )) || "-"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(system)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir sistema?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Essa ação não pode ser desfeita. O sistema "{system.name}" será removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(system)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
