import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CheckCircle2, Clock3, Filter, Loader2, RefreshCw, Send } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { MarketplaceApplication, MarketplaceJob } from '../../types';
import {
  applyToJob,
  fetchJobApplications,
  fetchJobs,
  updateApplicationStatus,
  updateMarketplaceJobStatus,
} from '../../api/marketplaceApi';
import { getSessionUser } from '../../utils/session';
import { trackUiAction } from '../../utils/interaction';
import { toast } from 'sonner';

type JobWithScore = MarketplaceJob & { matchScore?: number };

export function JobsBoard() {
  const sessionUser = getSessionUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<JobWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'all' | 'online' | 'offline' | 'hybrid'>('all');
  const [status, setStatus] = useState<'all' | 'open' | 'ongoing' | 'completed'>('open');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [proposal, setProposal] = useState('');
  const [applying, setApplying] = useState(false);
  const [applicationsByJob, setApplicationsByJob] = useState<Record<string, Array<MarketplaceApplication & {
    applicant: {
      user_id: string;
      name: string;
      role: 'worker' | 'client';
      ratings: number;
      rank: number;
    } | null;
  }>>>({});
  const [loadingApplications, setLoadingApplications] = useState<Record<string, boolean>>({});

  const currentApplyJobId = selectedJobId || searchParams.get('apply') || '';

  const loadJobs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchJobs({
        status: status === 'all' ? undefined : status,
        mode: mode === 'all' ? undefined : mode,
        search: search || undefined,
      });
      setJobs(response);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load jobs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
  }, [mode, status]);

  const filteredJobs = useMemo(() => {
    if (!search.trim()) {
      return jobs;
    }
    const needle = search.toLowerCase();
    return jobs.filter((job) => `${job.title} ${job.description} ${job.requiredSkills.join(' ')}`.toLowerCase().includes(needle));
  }, [jobs, search]);

  const handleApply = async () => {
    if (!currentApplyJobId || !proposal.trim()) {
      return;
    }

    setApplying(true);
    try {
      await applyToJob(currentApplyJobId, proposal.trim());
      trackUiAction('apply_to_job', 'jobs_board', { jobId: currentApplyJobId });
      toast.success('Application submitted successfully.');
      setProposal('');
      setSelectedJobId('');
      setSearchParams({}, { replace: true });
      await loadJobs();
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : 'Unable to apply.');
    } finally {
      setApplying(false);
    }
  };

  const handleLoadApplications = async (jobId: string) => {
    setLoadingApplications((previous) => ({ ...previous, [jobId]: true }));
    try {
      const response = await fetchJobApplications(jobId);
      setApplicationsByJob((previous) => ({ ...previous, [jobId]: response }));
      trackUiAction('view_applications', 'jobs_board', { jobId });
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : 'Unable to load applications.');
    } finally {
      setLoadingApplications((previous) => ({ ...previous, [jobId]: false }));
    }
  };

  const handleApplicationStatus = async (
    applicationId: string,
    statusValue: 'shortlisted' | 'accepted' | 'rejected',
    jobId: string,
  ) => {
    try {
      await updateApplicationStatus(applicationId, statusValue);
      trackUiAction('update_application_status', 'jobs_board', { applicationId, status: statusValue });
      toast.success(`Application ${statusValue}.`);
      await handleLoadApplications(jobId);
      await loadJobs();
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : 'Unable to update application.');
    }
  };

  const handleJobStatus = async (jobId: string, statusValue: 'open' | 'ongoing' | 'completed') => {
    try {
      await updateMarketplaceJobStatus(jobId, statusValue);
      trackUiAction('update_job_status', 'jobs_board', { jobId, status: statusValue });
      toast.success(`Job marked ${statusValue}.`);
      await loadJobs();
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : 'Unable to update job status.');
    }
  };

  if (loading) {
    return <div className="p-6">Loading jobs...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-r from-primary to-accent text-white px-6 py-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Jobs</h1>
            <p className="text-sm text-white/80 mt-1">Explore work opportunities and applications</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              trackUiAction('refresh_jobs_board', 'jobs_header');
              void loadJobs();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <Input
            placeholder="Search by title, skill, or description"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="flex gap-2 flex-wrap">
            {(['all', 'online', 'offline', 'hybrid'] as const).map((item) => (
              <button
                key={item}
                onClick={() => {
                  trackUiAction('filter_mode', 'jobs_board', { mode: item });
                  setMode(item);
                }}
                className={`px-3 py-1.5 rounded-full text-xs border active:scale-95 transition-transform ${
                  mode === item ? 'bg-primary text-white border-primary' : 'bg-white text-foreground'
                }`}
              >
                {item.toUpperCase()}
              </button>
            ))}
            {(['all', 'open', 'ongoing', 'completed'] as const).map((item) => (
              <button
                key={item}
                onClick={() => {
                  trackUiAction('filter_status', 'jobs_board', { status: item });
                  setStatus(item);
                }}
                className={`px-3 py-1.5 rounded-full text-xs border active:scale-95 transition-transform ${
                  status === item ? 'bg-primary text-white border-primary' : 'bg-white text-foreground'
                }`}
              >
                {item.toUpperCase()}
              </button>
            ))}
            <button
              onClick={() => {
                trackUiAction('apply_filter_search', 'jobs_board');
                void loadJobs();
              }}
              className="px-3 py-1.5 rounded-full text-xs border bg-white active:scale-95 transition-transform flex items-center gap-1"
            >
              <Filter className="w-3 h-3" />
              Apply Filters
            </button>
          </div>
        </div>

        {currentApplyJobId && (
          <div className="bg-white border rounded-xl p-4 space-y-3">
            <h2 className="font-semibold">Apply to Job</h2>
            <Textarea
              value={proposal}
              onChange={(event) => setProposal(event.target.value)}
              placeholder="Write your proposal with timeline and experience."
              className="min-h-24"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => void handleApply()}
                disabled={applying || !proposal.trim()}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                {applying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Submit Application
              </Button>
              <Button type="button" variant="outline" onClick={() => setSelectedJobId('')}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700 mb-3">{error}</p>
            <Button type="button" variant="outline" onClick={() => void loadJobs()}>
              Retry
            </Button>
          </div>
        )}

        {filteredJobs.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">
            No jobs found for current filters.
          </div>
        ) : (
          filteredJobs.map((job) => {
            const isOwner = job.owner_id === sessionUser?.id;
            const applications = applicationsByJob[job.job_id] || [];
            return (
              <div key={job.job_id} className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{job.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{job.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {job.mode.toUpperCase()} - {job.location} - {job.requiredSkills.join(', ') || 'General'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">INR {job.budget}</p>
                    <p className="text-xs text-muted-foreground mt-1">{job.status.toUpperCase()}</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-3 flex-wrap">
                  {!isOwner && job.status === 'open' && (
                    <Button
                      type="button"
                      size="sm"
                      className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
                    onClick={() => {
                      trackUiAction('start_apply', 'jobs_card', { jobId: job.job_id });
                      setSelectedJobId(job.job_id);
                      setSearchParams({ apply: job.job_id }, { replace: true });
                    }}
                  >
                      Apply
                    </Button>
                  )}

                  {isOwner && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleLoadApplications(job.job_id)}
                        disabled={loadingApplications[job.job_id]}
                      >
                        {loadingApplications[job.job_id] ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Applications ({job.applicationsCount})
                      </Button>
                      {job.status !== 'completed' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void handleJobStatus(job.job_id, job.status === 'open' ? 'ongoing' : 'completed')}
                        >
                          {job.status === 'open' ? (
                            <>
                              <Clock3 className="w-4 h-4 mr-2" />
                              Mark Ongoing
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Mark Completed
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  )}
                </div>

                {applications.length > 0 && (
                  <div className="mt-4 border-t pt-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">APPLICATIONS</p>
                    {applications.map((application) => (
                      <div key={application.application_id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm">{application.applicant?.name || 'Applicant'}</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{application.proposal}</p>
                          </div>
                          <p className="text-xs font-semibold">{application.status.toUpperCase()}</p>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleApplicationStatus(application.application_id, 'shortlisted', job.job_id)}
                          >
                            Shortlist
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void handleApplicationStatus(application.application_id, 'accepted', job.job_id)}
                          >
                            Accept
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleApplicationStatus(application.application_id, 'rejected', job.job_id)}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
