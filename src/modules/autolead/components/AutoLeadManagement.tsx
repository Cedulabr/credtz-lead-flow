import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pause, Play, X, RefreshCw, Loader2, Users, Zap } from "lucide-react";
import { toast } from "sonner";
import type { AutoLeadJob } from "../types";

const statusConfig: Record<string, { label: string; color: string }> = {
  running: { label: "Em execução", color: "bg-green-500" },
  paused: { label: "Pausado", color: "bg-yellow-500" },
  completed: { label: "Concluído", color: "bg-blue-500" },
  cancelled: { label: "Cancelado", color: "bg-destructive" },
  draft: { label: "Rascunho", color: "bg-muted" },
};

export function AutoLeadManagement() {
  const { user, profile } = useAuth();
  const [jobs, setJobs] = useState<(AutoLeadJob & { user_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllJobs = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    let query = (supabase as any)
      .from("autolead_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    // Gestor: only company jobs
    if (profile?.role !== "admin") {
      const { data: ucData } = await supabase
        .from("user_companies")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (ucData?.company_id) {
        query = query.eq("company_id", ucData.company_id);
      } else {
        query = query.eq("user_id", user.id);
      }
    }

    const { data } = await query;
    const jobsList = (data || []) as AutoLeadJob[];

    // Fetch user names
    const userIds = [...new Set(jobsList.map(j => j.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email")
      .in("id", userIds);

    const profileMap = new Map(
      (profiles || []).map(p => [p.id, p.name || p.email?.split("@")[0] || "Usuário"])
    );

    setJobs(
      jobsList.map(j => ({ ...j, user_name: profileMap.get(j.user_id) || "Usuário" }))
    );
    setLoading(false);
  }, [user?.id, profile?.role]);

  useEffect(() => { fetchAllJobs(); }, [fetchAllJobs]);

  const pauseJob = async (jobId: string) => {
    await (supabase as any)
      .from("autolead_jobs")
      .update({ status: "paused", paused_at: new Date().toISOString() })
      .eq("id", jobId);
    toast.info("Prospecção pausada");
    fetchAllJobs();
  };

  const resumeJob = async (jobId: string) => {
    await (supabase as any)
      .from("autolead_jobs")
      .update({ status: "running", paused_at: null })
      .eq("id", jobId);
    toast.success("Prospecção retomada");
    fetchAllJobs();
  };

  const cancelJob = async (jobId: string) => {
    await (supabase as any)
      .from("autolead_messages")
      .update({ status: "cancelled" })
      .eq("job_id", jobId)
      .eq("status", "scheduled");
    await (supabase as any)
      .from("autolead_jobs")
      .update({ status: "cancelled", finished_at: new Date().toISOString() })
      .eq("id", jobId);
    toast.info("Prospecção cancelada");
    fetchAllJobs();
  };

  const activeCount = jobs.filter(j => j.status === "running" || j.status === "paused").length;

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Gestão de Prospecções</h2>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAllJobs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{activeCount}</p>
            <p className="text-xs text-muted-foreground">Ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{jobs.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">
              {jobs.reduce((sum, j) => sum + j.leads_sent, 0)}
            </p>
            <p className="text-xs text-muted-foreground">Enviados</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma prospecção encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {jobs.map(job => (
            <Card key={job.id} className={job.status === "running" ? "border-green-500/30" : ""}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{job.user_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(job.created_at).toLocaleDateString("pt-BR")} •{" "}
                      {job.total_leads} leads
                    </p>
                  </div>
                  <Badge variant="outline" className="gap-1 text-xs">
                    <span className={`w-2 h-2 rounded-full ${statusConfig[job.status]?.color || "bg-muted"} ${job.status === "running" ? "animate-pulse" : ""}`} />
                    {statusConfig[job.status]?.label || job.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <p className="font-semibold text-foreground">{job.leads_sent}</p>
                    <p className="text-muted-foreground">WA Enviados</p>
                  </div>
                  <div>
                    <p className="font-semibold text-destructive">{job.leads_failed}</p>
                    <p className="text-muted-foreground">WA Falhas</p>
                  </div>
                  <div>
                    <p className="font-semibold text-primary">{job.sms_sent}</p>
                    <p className="text-muted-foreground">SMS OK</p>
                  </div>
                  <div>
                    <p className="font-semibold text-destructive">{job.sms_failed}</p>
                    <p className="text-muted-foreground">SMS Falha</p>
                  </div>
                </div>

                {(job.status === "running" || job.status === "paused") && (
                  <div className="flex gap-2 pt-1">
                    {job.status === "running" && (
                      <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => pauseJob(job.id)}>
                        <Pause className="h-3 w-3" /> Pausar
                      </Button>
                    )}
                    {job.status === "paused" && (
                      <Button size="sm" className="flex-1 gap-1 text-xs" onClick={() => resumeJob(job.id)}>
                        <Play className="h-3 w-3" /> Retomar
                      </Button>
                    )}
                    <Button variant="destructive" size="sm" className="gap-1 text-xs" onClick={() => cancelJob(job.id)}>
                      <X className="h-3 w-3" /> Cancelar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
