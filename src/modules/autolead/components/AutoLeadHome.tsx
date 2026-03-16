import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Zap, Play, History, Pause, RotateCcw, MessageSquare, AlertTriangle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { AutoLeadJob } from "../types";

interface AutoLeadHomeProps {
  credits: number;
  activeJob: AutoLeadJob | null;
  jobs: AutoLeadJob[];
  onStartWizard: () => void;
  onViewJob: (jobId: string) => void;
  onPause: (jobId: string) => void;
  onResume: (jobId: string) => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  running: { label: "Em execução", color: "bg-green-500" },
  paused: { label: "Pausado", color: "bg-yellow-500" },
  completed: { label: "Concluído", color: "bg-blue-500" },
  cancelled: { label: "Cancelado", color: "bg-destructive" },
  draft: { label: "Rascunho", color: "bg-muted" },
};

export function AutoLeadHome({ credits, activeJob, jobs, onStartWizard, onViewJob, onPause, onResume }: AutoLeadHomeProps) {
  const { user } = useAuth();
  const [smsCredits, setSmsCredits] = useState<number | null>(null);
  const [isGestor, setIsGestor] = useState(false);

  const { profile } = useAuth();
  const fetchSmsAndRole = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Admin: busca direto na sms_credits com próprio user_id
      if (profile?.role === 'admin') {
        const { data: creditData } = await supabase
          .from("sms_credits")
          .select("credits_balance")
          .eq("user_id", user.id)
          .maybeSingle();
        setSmsCredits(creditData?.credits_balance ?? 0);
        setIsGestor(true);
        return;
      }

      const { data: ucData } = await supabase
        .from("user_companies")
        .select("company_id, company_role")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!ucData?.company_id) { setSmsCredits(0); return; }

      const userIsGestor = ucData.company_role === 'gestor';
      setIsGestor(userIsGestor);

      let gestorId = user.id;
      if (!userIsGestor) {
        const { data: gestorData } = await supabase
          .from("user_companies")
          .select("user_id")
          .eq("company_id", ucData.company_id)
          .eq("company_role", "gestor")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        if (gestorData?.user_id) gestorId = gestorData.user_id;
      }

      const { data: creditData } = await supabase
        .from("sms_credits")
        .select("credits_balance")
        .eq("user_id", gestorId)
        .maybeSingle();

      setSmsCredits(creditData?.credits_balance ?? 0);
    } catch {
      setSmsCredits(0);
    }
  }, [user?.id, profile?.role]);

  useEffect(() => { fetchSmsAndRole(); }, [fetchSmsAndRole]);

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
          <Zap className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">AutoLead</h1>
        <p className="text-muted-foreground text-sm">
          Prospecção automática de clientes via WhatsApp
        </p>
      </motion.div>

      {/* Credits Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-primary/20">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">Créditos disponíveis</p>
            <p className="text-4xl font-bold text-primary">{credits}</p>
            <p className="text-xs text-muted-foreground">leads</p>
            <Button
              onClick={onStartWizard}
              disabled={credits <= 0 || !!activeJob}
              className="w-full h-12 text-base font-semibold gap-2"
              size="lg"
            >
              <Play className="h-5 w-5" />
              {activeJob ? "Prospecção em andamento" : "Iniciar Prospecção"}
            </Button>
            {credits <= 0 && (
              <p className="text-xs text-destructive">
                {isGestor
                  ? "Adquira créditos para iniciar a prospecção"
                  : "Solicite créditos ao seu gestor"}
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* SMS Upsell Banner */}
      {smsCredits !== null && smsCredits <= 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-amber-500/10 shrink-0">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    ⚠️ Você está utilizando apenas WhatsApp
                  </p>
                  <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                    Adicionar créditos de SMS pode aumentar sua taxa de resposta em até <span className="font-bold">40%</span>.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  {isGestor
                    ? "Adquira créditos SMS para potencializar seus resultados."
                    : "Solicite créditos SMS ao seu gestor para melhores resultados."}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Active Job */}
      {activeJob && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}>
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Execução ativa</h3>
                <Badge variant="outline" className="gap-1">
                  <span className={`w-2 h-2 rounded-full ${statusConfig[activeJob.status]?.color || 'bg-muted'} animate-pulse`} />
                  {statusConfig[activeJob.status]?.label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-background rounded-lg">
                  <p className="text-lg font-bold text-foreground">{activeJob.leads_sent}/{activeJob.total_leads}</p>
                  <p className="text-xs text-muted-foreground">Enviados</p>
                </div>
                <div className="text-center p-2 bg-background rounded-lg">
                  <p className="text-lg font-bold text-destructive">{activeJob.leads_failed}</p>
                  <p className="text-xs text-muted-foreground">Falhas</p>
                </div>
              </div>

              <div className="flex gap-2">
                {activeJob.status === "running" && (
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => onPause(activeJob.id)}>
                    <Pause className="h-4 w-4" /> Pausar
                  </Button>
                )}
                {activeJob.status === "paused" && (
                  <Button size="sm" className="flex-1 gap-1" onClick={() => onResume(activeJob.id)}>
                    <RotateCcw className="h-4 w-4" /> Retomar
                  </Button>
                )}
                <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => onViewJob(activeJob.id)}>
                  <History className="h-4 w-4" /> Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Job History */}
      {jobs.filter(j => j.id !== activeJob?.id).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <History className="h-4 w-4" /> Histórico
          </h3>
          {jobs.filter(j => j.id !== activeJob?.id).slice(0, 5).map((job) => (
            <Card
              key={job.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onViewJob(job.id)}
            >
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{job.total_leads} leads</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(job.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {statusConfig[job.status]?.label || job.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
