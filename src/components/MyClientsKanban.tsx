import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Target, 
  Send, 
  CheckCircle, 
  XCircle, 
  GripVertical,
  Phone,
  MessageCircle,
  Pencil,
  History,
  TrendingUp,
  Users,
  Zap,
  DollarSign
} from "lucide-react";

interface Proposta {
  id: number;
  "Nome do cliente": string | null;
  cpf: string | null;
  telefone: string | null;
  whatsapp: string | null;
  convenio: string | null;
  valor_proposta: number | null;
  valor: string | null;
  pipeline_stage: string;
  origem_lead: string;
  status: string | null;
  created_by_id: string | null;
  assigned_to: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface PipelineHistory {
  id: string;
  from_stage: string | null;
  to_stage: string;
  changed_by: string;
  notes: string | null;
  created_at: string;
}

const pipelineStages = [
  { id: "contato_iniciado", label: "Contato Iniciado", icon: Target, color: "bg-blue-500" },
  { id: "proposta_enviada", label: "Proposta Enviada", icon: Send, color: "bg-yellow-500" },
  { id: "aceitou_proposta", label: "Aceitou Proposta", icon: CheckCircle, color: "bg-green-500" },
  { id: "recusou_proposta", label: "Recusou Proposta", icon: XCircle, color: "bg-red-500" },
];

const origemIcons: Record<string, { icon: typeof TrendingUp; color: string; label: string }> = {
  marketing: { icon: TrendingUp, color: "text-purple-500", label: "Marketing" },
  indicacao: { icon: Users, color: "text-blue-500", label: "Indicação" },
  ativo: { icon: Zap, color: "text-orange-500", label: "Ativo" },
};

export function MyClientsKanban() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProposta, setSelectedProposta] = useState<Proposta | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [history, setHistory] = useState<PipelineHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [draggedItem, setDraggedItem] = useState<Proposta | null>(null);

  // Edit form states
  const [editForm, setEditForm] = useState({
    nome: "",
    cpf: "",
    telefone: "",
    whatsapp: "",
    convenio: "",
    valor_proposta: "",
    origem_lead: "",
  });

  useEffect(() => {
    fetchPropostas();
  }, []);

  const fetchPropostas = async () => {
    try {
      let query = supabase
        .from("propostas")
        .select("*")
        .order("created_at", { ascending: false });

      // If not admin, only show user's proposals
      if (!isAdmin) {
        query = query.or(`created_by_id.eq.${user?.id},assigned_to.eq.${user?.id}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPropostas(data || []);
    } catch (error) {
      console.error("Error fetching propostas:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar propostas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (propostaId: number) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("pipeline_history")
        .select("*")
        .eq("proposta_id", propostaId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, proposta: Proposta) => {
    setDraggedItem(proposta);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.pipeline_stage === targetStage) {
      setDraggedItem(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("propostas")
        .update({ pipeline_stage: targetStage })
        .eq("id", draggedItem.id);

      if (error) throw error;

      // Update local state
      setPropostas((prev) =>
        prev.map((p) =>
          p.id === draggedItem.id ? { ...p, pipeline_stage: targetStage } : p
        )
      );

      const targetLabel = pipelineStages.find((s) => s.id === targetStage)?.label;
      toast({
        title: "Sucesso",
        description: `Proposta movida para "${targetLabel}"`,
      });
    } catch (error) {
      console.error("Error updating stage:", error);
      toast({
        title: "Erro",
        description: "Erro ao mover proposta",
        variant: "destructive",
      });
    } finally {
      setDraggedItem(null);
    }
  };

  const handleCardClick = (proposta: Proposta) => {
    setSelectedProposta(proposta);
    setEditForm({
      nome: proposta["Nome do cliente"] || "",
      cpf: proposta.cpf || "",
      telefone: proposta.telefone || "",
      whatsapp: proposta.whatsapp || "",
      convenio: proposta.convenio || "",
      valor_proposta: proposta.valor_proposta?.toString() || proposta.valor || "",
      origem_lead: proposta.origem_lead || "ativo",
    });
    fetchHistory(proposta.id);
    setIsDetailDialogOpen(true);
    setIsEditMode(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedProposta) return;

    try {
      const { error } = await supabase
        .from("propostas")
        .update({
          "Nome do cliente": editForm.nome,
          cpf: editForm.cpf,
          telefone: editForm.telefone,
          whatsapp: editForm.whatsapp,
          convenio: editForm.convenio,
          valor_proposta: parseFloat(editForm.valor_proposta) || null,
          origem_lead: editForm.origem_lead,
        })
        .eq("id", selectedProposta.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Proposta atualizada com sucesso!",
      });

      fetchPropostas();
      setIsEditMode(false);
    } catch (error) {
      console.error("Error updating proposta:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar proposta",
        variant: "destructive",
      });
    }
  };

  const getPropostasByStage = (stageId: string) => {
    return propostas.filter((p) => p.pipeline_stage === stageId);
  };

  const formatCurrency = (value: number | string | null) => {
    if (!value) return "R$ 0,00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
  };

  const getStageLabel = (stageId: string | null) => {
    return pipelineStages.find((s) => s.id === stageId)?.label || stageId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Meus Clientes</h1>
        <p className="text-muted-foreground">Gestão de oportunidades e pipeline de vendas</p>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {pipelineStages.map((stage) => {
          const StageIcon = stage.icon;
          const stagePropostas = getPropostasByStage(stage.id);

          return (
            <div
              key={stage.id}
              className="flex flex-col h-full"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <Card className="flex-1 min-h-[400px]">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${stage.color}`}>
                        <StageIcon className="h-4 w-4 text-white" />
                      </div>
                      <CardTitle className="text-sm font-medium">
                        {stage.label}
                      </CardTitle>
                    </div>
                    <Badge variant="secondary">{stagePropostas.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stagePropostas.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Nenhuma proposta
                    </div>
                  ) : (
                    stagePropostas.map((proposta) => {
                      const origem = origemIcons[proposta.origem_lead] || origemIcons.ativo;
                      const OrigemIcon = origem.icon;

                      return (
                        <div
                          key={proposta.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, proposta)}
                          onClick={() => handleCardClick(proposta)}
                          className="p-3 bg-muted/50 rounded-lg cursor-grab active:cursor-grabbing hover:bg-muted transition-colors border border-transparent hover:border-border"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm truncate max-w-[120px]">
                                {proposta["Nome do cliente"] || "Sem nome"}
                              </span>
                            </div>
                          <span title={origem.label}>
                            <OrigemIcon className={`h-4 w-4 ${origem.color}`} />
                          </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-primary">
                              {formatCurrency(proposta.valor_proposta || proposta.valor)}
                            </span>
                          </div>
                          {proposta.convenio && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              {proposta.convenio}
                            </Badge>
                          )}
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detalhes da Proposta</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditMode(!isEditMode)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                {isEditMode ? "Cancelar" : "Editar"}
              </Button>
            </DialogTitle>
            <DialogDescription>
              Visualize e edite as informações do cliente
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {isEditMode ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome do Cliente</Label>
                    <Input
                      value={editForm.nome}
                      onChange={(e) =>
                        setEditForm({ ...editForm, nome: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>CPF</Label>
                    <Input
                      value={editForm.cpf}
                      onChange={(e) =>
                        setEditForm({ ...editForm, cpf: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={editForm.telefone}
                      onChange={(e) =>
                        setEditForm({ ...editForm, telefone: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>WhatsApp</Label>
                    <Input
                      value={editForm.whatsapp}
                      onChange={(e) =>
                        setEditForm({ ...editForm, whatsapp: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Convênio</Label>
                    <Input
                      value={editForm.convenio}
                      onChange={(e) =>
                        setEditForm({ ...editForm, convenio: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Valor da Proposta</Label>
                    <Input
                      type="number"
                      value={editForm.valor_proposta}
                      onChange={(e) =>
                        setEditForm({ ...editForm, valor_proposta: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Origem do Lead</Label>
                    <Select
                      value={editForm.origem_lead}
                      onValueChange={(value) =>
                        setEditForm({ ...editForm, origem_lead: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="indicacao">Indicação</SelectItem>
                        <SelectItem value="ativo">Ativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Button onClick={handleSaveEdit} className="w-full">
                      Salvar Alterações
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Nome</Label>
                      <p className="font-medium">
                        {selectedProposta?.["Nome do cliente"] || "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">CPF</Label>
                      <p className="font-medium">{selectedProposta?.cpf || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Telefone</Label>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {selectedProposta?.telefone || "N/A"}
                        </p>
                        {selectedProposta?.telefone && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              window.open(`tel:${selectedProposta.telefone}`, "_self")
                            }
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">WhatsApp</Label>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {selectedProposta?.whatsapp || "N/A"}
                        </p>
                        {selectedProposta?.whatsapp && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              window.open(
                                `https://wa.me/55${selectedProposta.whatsapp?.replace(/\D/g, "")}`,
                                "_blank"
                              )
                            }
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Convênio</Label>
                      <p className="font-medium">
                        {selectedProposta?.convenio || "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Valor da Proposta</Label>
                      <p className="font-medium text-primary text-lg">
                        {formatCurrency(
                          selectedProposta?.valor_proposta || selectedProposta?.valor
                        )}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Origem</Label>
                      <Badge variant="outline">
                        {origemIcons[selectedProposta?.origem_lead || "ativo"]?.label}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Etapa Atual</Label>
                      <Badge>
                        {getStageLabel(selectedProposta?.pipeline_stage || null)}
                      </Badge>
                    </div>
                  </div>

                  {/* History Section */}
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <History className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold">Histórico de Movimentações</h3>
                    </div>

                    {loadingHistory ? (
                      <div className="text-center py-4 text-muted-foreground">
                        Carregando histórico...
                      </div>
                    ) : history.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        Nenhuma movimentação registrada
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {history.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="text-sm">
                                <span className="text-muted-foreground">De:</span>{" "}
                                <Badge variant="outline" className="mr-2">
                                  {getStageLabel(entry.from_stage)}
                                </Badge>
                                <span className="text-muted-foreground">Para:</span>{" "}
                                <Badge>{getStageLabel(entry.to_stage)}</Badge>
                              </p>
                              {entry.notes && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {entry.notes}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">
                                {new Date(entry.created_at).toLocaleString("pt-BR")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
