import { motion } from "framer-motion";
import { ArrowLeft, Pause, Play, XCircle, CheckCircle, Clock, AlertCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { AutoLeadJob, AutoLeadMessage } from "../types";

interface AutoLeadTimelineProps {
  job: AutoLeadJob;
  messages: AutoLeadMessage[];
  onBack: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

const statusIcons: Record<string, any> = {
  sent: { icon: CheckCircle, color: "text-green-500" },
  scheduled: { icon: Clock, color: "text-muted-foreground" },
  sending: { icon: Send, color: "text-blue-500" },
  failed: { icon: AlertCircle, color: "text-destructive" },
  cancelled: { icon: XCircle, color: "text-muted-foreground" },
};

export function AutoLeadTimeline({ job, messages, onBack, onPause, onResume, onCancel }: AutoLeadTimelineProps) {
  const progress = job.total_leads > 0 ? ((job.leads_sent + job.leads_failed) / job.total_leads) * 100 : 0;
  const nextScheduled = messages.find(m => m.status === "scheduled");

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="font-semibold">Execução AutoLead</h2>
          <p className="text-xs text-muted-foreground">
            {new Date(job.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <Badge variant={job.status === "running" ? "default" : "secondary"}>
          {job.status === "running" ? "Em execução" : job.status === "paused" ? "Pausado" : job.status === "completed" ? "Concluído" : "Cancelado"}
        </Badge>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-semibold">{job.leads_sent + job.leads_failed}/{job.total_leads}</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="text-lg font-bold text-green-500">{job.leads_sent}</p>
              <p className="text-muted-foreground">Enviados</p>
            </div>
            <div>
              <p className="text-lg font-bold text-destructive">{job.leads_failed}</p>
              <p className="text-muted-foreground">Falhas</p>
            </div>
            <div>
              <p className="text-lg font-bold text-muted-foreground">{messages.filter(m => m.status === "scheduled").length}</p>
              <p className="text-muted-foreground">Agendados</p>
            </div>
          </div>

          {nextScheduled && job.status === "running" && (
            <div className="text-center text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
              Próximo envio em{" "}
              {(() => {
                const diff = Math.max(0, Math.round((new Date(nextScheduled.scheduled_at).getTime() - Date.now()) / 60000));
                return diff > 0 ? `${diff} min` : "breve";
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {(job.status === "running" || job.status === "paused") && (
        <div className="flex gap-2">
          {job.status === "running" ? (
            <Button variant="outline" className="flex-1 gap-1" onClick={onPause}>
              <Pause className="h-4 w-4" /> Pausar
            </Button>
          ) : (
            <Button className="flex-1 gap-1" onClick={onResume}>
              <Play className="h-4 w-4" /> Retomar
            </Button>
          )}
          <Button variant="destructive" size="icon" onClick={onCancel}>
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-muted-foreground">Timeline</h3>
        {messages.map((msg, idx) => {
          const config = statusIcons[msg.status] || statusIcons.scheduled;
          const Icon = config.icon;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(idx * 0.02, 0.5) }}
            >
              <Card className="border-0 shadow-none bg-transparent">
                <CardContent className="p-2 flex items-center gap-3">
                  <Icon className={`h-4 w-4 flex-shrink-0 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{msg.lead_name || msg.phone}</p>
                    {msg.error_message && (
                      <p className="text-xs text-destructive truncate">{msg.error_message}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {msg.sent_at
                      ? new Date(msg.sent_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                      : new Date(msg.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
