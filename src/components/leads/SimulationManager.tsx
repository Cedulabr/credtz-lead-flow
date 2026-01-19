import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart3,
  Upload,
  Clock,
  CheckCircle,
  FileText,
  User,
  Phone,
  Loader2,
  Eye,
  Send,
  Download,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSimulationNotifications } from "@/hooks/useSimulationNotifications";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SimulationManagerProps {
  onUpdate?: () => void;
}

export function SimulationManager({ onUpdate }: SimulationManagerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    isGestorOrAdmin,
    getPendingSimulations,
    getAwaitingConfirmation,
    completeSimulation,
    confirmSimulation,
  } = useSimulationNotifications();

  const [pendingSimulations, setPendingSimulations] = useState<any[]>([]);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSimulation, setSelectedSimulation] = useState<any>(null);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isGestorOrAdmin) {
        const pending = await getPendingSimulations();
        setPendingSimulations(pending);
      }
      const awaiting = await getAwaitingConfirmation();
      setAwaitingConfirmation(awaiting);
    } catch (error) {
      console.error('Error fetching simulations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isGestorOrAdmin]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Arquivo inválido",
          description: "Envie apenas PDF ou imagem (PNG, JPG)",
          variant: "destructive",
        });
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB",
          variant: "destructive",
        });
        return;
      }
      setUploadedFile(file);
    }
  };

  const handleCompleteSimulation = async () => {
    if (!selectedSimulation || !uploadedFile || !user) return;

    setIsUploading(true);
    try {
      // Upload file to storage
      const fileExt = uploadedFile.name.split('.').pop();
      const fileName = `${selectedSimulation.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('simulations')
        .upload(fileName, uploadedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('simulations')
        .getPublicUrl(fileName);

      // Complete the simulation
      await completeSimulation(
        selectedSimulation.id,
        selectedSimulation.lead_id,
        urlData.publicUrl,
        uploadedFile.name,
        selectedSimulation.requested_by,
        selectedSimulation.leads?.name || 'Cliente'
      );

      toast({
        title: "✅ Simulação Enviada!",
        description: "O usuário foi notificado e pode visualizar a simulação.",
      });

      setIsCompleteModalOpen(false);
      setUploadedFile(null);
      setSelectedSimulation(null);
      fetchData();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error completing simulation:', error);
      toast({
        title: "Erro",
        description: error?.message || "Erro ao enviar simulação",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmReceived = async () => {
    if (!selectedSimulation || !user) return;

    setIsConfirming(true);
    try {
      await confirmSimulation(
        selectedSimulation.id,
        selectedSimulation.lead_id,
        selectedSimulation.completed_by,
        selectedSimulation.leads?.name || 'Cliente'
      );

      toast({
        title: "📬 Recebimento Confirmado!",
        description: "A simulação foi marcada como recebida.",
      });

      setIsViewModalOpen(false);
      setSelectedSimulation(null);
      fetchData();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error confirming simulation:', error);
      toast({
        title: "Erro",
        description: error?.message || "Erro ao confirmar recebimento",
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
      </div>
    );
  }

  const hasPending = pendingSimulations.length > 0;
  const hasAwaiting = awaitingConfirmation.length > 0;

  if (!hasPending && !hasAwaiting) {
    return null;
  }

  return (
    <>
      <div className="space-y-4">
        {/* Pending Simulations (Gestor View) */}
        {isGestorOrAdmin && hasPending && (
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="p-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500"
                >
                  <Clock className="h-4 w-4 text-white" />
                </motion.div>
                Simulações Pendentes
                <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                  {pendingSimulations.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AnimatePresence>
                {pendingSimulations.map((sim, index) => (
                  <motion.div
                    key={sim.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-lg p-4 shadow-sm border border-amber-100"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900 truncate">
                            {sim.leads?.name || 'Cliente'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {formatPhone(sim.leads?.phone)}
                          </span>
                          {sim.leads?.convenio && (
                            <Badge variant="outline" className="text-xs">
                              {sim.leads.convenio}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          Solicitado por {sim.requester?.name || 'Usuário'} em{' '}
                          {format(new Date(sim.requested_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedSimulation(sim);
                          setIsCompleteModalOpen(true);
                        }}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Enviar
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </CardContent>
          </Card>
        )}

        {/* Awaiting Confirmation (User View) */}
        {hasAwaiting && (
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="p-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-500"
                >
                  <Send className="h-4 w-4 text-white" />
                </motion.div>
                Simulações Prontas
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                  {awaitingConfirmation.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AnimatePresence>
                {awaitingConfirmation.map((sim, index) => (
                  <motion.div
                    key={sim.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-lg p-4 shadow-sm border border-emerald-100"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900 truncate">
                            {sim.leads?.name || 'Cliente'}
                          </span>
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <FileText className="h-3 w-3" />
                          <span>{sim.simulation_file_name || 'Simulação'}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          Concluída em{' '}
                          {format(new Date(sim.completed_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (sim.simulation_file_url) {
                              window.open(sim.simulation_file_url, '_blank');
                            }
                          }}
                          className="border-emerald-200 text-emerald-700"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedSimulation(sim);
                            setIsViewModalOpen(true);
                          }}
                          className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Confirmar
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Complete Simulation Modal */}
      <Dialog open={isCompleteModalOpen} onOpenChange={setIsCompleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-amber-600" />
              Enviar Simulação
            </DialogTitle>
            <DialogDescription>
              Anexe o arquivo da simulação para enviar ao usuário
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-amber-50 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-800">
                Cliente: {selectedSimulation?.leads?.name}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Solicitado por: {selectedSimulation?.requester?.name}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Arquivo da Simulação *</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                  transition-colors
                  ${uploadedFile
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-gray-300 hover:border-amber-400 hover:bg-amber-50'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {uploadedFile ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-700">
                    <FileText className="h-5 w-5" />
                    <span className="font-medium">{uploadedFile.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      Clique para selecionar o arquivo
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PDF ou imagem (PNG, JPG) - máx 10MB
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-100 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>O arquivo é obrigatório. Sem ele, não é possível enviar a simulação.</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCompleteModalOpen(false);
                setUploadedFile(null);
              }}
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCompleteSimulation}
              disabled={!uploadedFile || isUploading}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Simulação
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View & Confirm Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              Confirmar Recebimento
            </DialogTitle>
            <DialogDescription>
              Visualize e confirme o recebimento da simulação
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-emerald-50 rounded-lg p-4">
              <p className="text-sm font-medium text-emerald-800">
                Cliente: {selectedSimulation?.leads?.name}
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                Arquivo: {selectedSimulation?.simulation_file_name}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (selectedSimulation?.simulation_file_url) {
                    window.open(selectedSimulation.simulation_file_url, '_blank');
                  }
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (selectedSimulation?.simulation_file_url) {
                    const link = document.createElement('a');
                    link.href = selectedSimulation.simulation_file_url;
                    link.download = selectedSimulation.simulation_file_name || 'simulacao';
                    link.click();
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsViewModalOpen(false)}
              disabled={isConfirming}
            >
              Fechar
            </Button>
            <Button
              onClick={handleConfirmReceived}
              disabled={isConfirming}
              className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
            >
              {isConfirming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirmando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Recebimento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
