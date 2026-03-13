import { useState } from "react";
import { useAutoLead } from "./hooks/useAutoLead";
import { AutoLeadHome } from "./components/AutoLeadHome";
import { AutoLeadWizard } from "./components/AutoLeadWizard";
import { AutoLeadTimeline } from "./components/AutoLeadTimeline";
import type { WizardData } from "./types";

export function AutoLeadModule() {
  const { jobs, activeJob, messages, credits, loading, createJob, pauseJob, resumeJob, cancelJob, fetchMessages } = useAutoLead();
  const [showWizard, setShowWizard] = useState(false);
  const [viewingJobId, setViewingJobId] = useState<string | null>(null);

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
