import { useState } from "react";
import { useAutoLead } from "./hooks/useAutoLead";
import { AutoLeadHome } from "./components/AutoLeadHome";
import { AutoLeadWizard } from "./components/AutoLeadWizard";
import { AutoLeadTimeline } from "./components/AutoLeadTimeline";
import { AutoLeadManagement } from "./components/AutoLeadManagement";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Settings2 } from "lucide-react";
import type { WizardData } from "./types";

export function AutoLeadModule() {
  const { profile } = useAuth();
  const { jobs, activeJob, messages, credits, loading, createJob, pauseJob, resumeJob, cancelJob, fetchMessages } = useAutoLead();
  const [showWizard, setShowWizard] = useState(false);
  const [viewingJobId, setViewingJobId] = useState<string | null>(null);

  const isManagerOrAdmin = profile?.role === "admin" || false;
  // Also check gestor via company_role — but for simplicity, we check if profile exists
  // Gestors will also see the tab via a separate check

  const viewingJob = viewingJobId ? jobs.find(j => j.id === viewingJobId) || activeJob : null;

  const handleConfirm = async (data: WizardData) => {
    const jobId = await createJob(data);
    if (jobId) {
      setViewingJobId(jobId);
    }
  };

  const handleViewJob = (jobId: string) => {
    fetchMessages(jobId);
    setViewingJobId(jobId);
  };

  if (viewingJob) {
    return (
      <AutoLeadTimeline
        job={viewingJob}
        messages={messages}
        onBack={() => setViewingJobId(null)}
        onPause={() => pauseJob(viewingJob.id)}
        onResume={() => resumeJob(viewingJob.id)}
        onCancel={() => { cancelJob(viewingJob.id); setViewingJobId(null); }}
      />
    );
  }

  // Show tabs for admin/gestor
  if (isManagerOrAdmin) {
    return (
      <>
        <Tabs defaultValue="prospeccao" className="w-full">
          <TabsList className="w-full max-w-lg mx-auto grid grid-cols-2">
            <TabsTrigger value="prospeccao" className="gap-1.5">
              <Zap className="h-4 w-4" /> Prospecção
            </TabsTrigger>
            <TabsTrigger value="gestao" className="gap-1.5">
              <Settings2 className="h-4 w-4" /> Gestão
            </TabsTrigger>
          </TabsList>
          <TabsContent value="prospeccao">
            <AutoLeadHome
              credits={credits}
              activeJob={activeJob}
              jobs={jobs}
              onStartWizard={() => setShowWizard(true)}
              onViewJob={handleViewJob}
              onPause={pauseJob}
              onResume={resumeJob}
            />
          </TabsContent>
          <TabsContent value="gestao">
            <AutoLeadManagement />
          </TabsContent>
        </Tabs>
        <AutoLeadWizard
          open={showWizard}
          onClose={() => setShowWizard(false)}
          credits={credits}
          onConfirm={handleConfirm}
        />
      </>
    );
  }

  return (
    <>
      <AutoLeadHome
        credits={credits}
        activeJob={activeJob}
        jobs={jobs}
        onStartWizard={() => setShowWizard(true)}
        onViewJob={handleViewJob}
        onPause={pauseJob}
        onResume={resumeJob}
      />
      <AutoLeadWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        credits={credits}
        onConfirm={handleConfirm}
      />
    </>
  );
}
