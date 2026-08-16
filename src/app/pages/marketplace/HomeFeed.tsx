import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, BriefcaseBusiness, MessageSquare, PlusSquare, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { MarketplaceJob } from '../../types';
import { fetchRecommendations } from '../../api/marketplaceApi';
import { getSessionUser } from '../../utils/session';
import { trackUiAction } from '../../utils/interaction';
import { useMarketplaceContext } from '../../state/marketplace-context';

function getBasePath(): '/customer' | '/partner' {
  return getSessionUser()?.role === 'partner' ? '/partner' : '/customer';
}

export function HomeFeed() {
  const navigate = useNavigate();
  const basePath = getBasePath();
  const { unreadNotifications, refreshMarketplace } = useMarketplaceContext();
  const [jobs, setJobs] = useState<Array<MarketplaceJob & { matchScore: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchRecommendations();
      setJobs(response.jobs);
      await refreshMarketplace();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load recommendations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  if (loading) {
    return <div className="p-6">Loading home feed...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-r from-primary to-accent text-white px-6 py-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              Global Shreni
            </h1>
            <p className="text-sm text-white/80 mt-1">AI-powered service marketplace</p>
          </div>
          <button
            onClick={() => {
              trackUiAction('open_notifications', 'home_header');
              navigate(`${basePath}/notifications`);
            }}
            className="relative w-11 h-11 rounded-full bg-white/20 flex items-center justify-center active:scale-95 transition-transform"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 min-w-5 h-5 rounded-full bg-red-500 text-[11px] flex items-center justify-center px-1">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => {
              trackUiAction('navigate_jobs', 'home_quick_action');
              navigate(`${basePath}/jobs`);
            }}
            className="bg-white border rounded-xl p-4 text-left shadow-sm active:scale-[0.98] transition-transform"
          >
            <BriefcaseBusiness className="w-6 h-6 text-primary mb-2" />
            <p className="text-sm font-semibold">Jobs</p>
          </button>
          <button
            onClick={() => {
              trackUiAction('navigate_post_work', 'home_quick_action');
              navigate(`${basePath}/post-work`);
            }}
            className="bg-white border rounded-xl p-4 text-left shadow-sm active:scale-[0.98] transition-transform"
          >
            <PlusSquare className="w-6 h-6 text-primary mb-2" />
            <p className="text-sm font-semibold">Post Work</p>
          </button>
          <button
            onClick={() => {
              trackUiAction('navigate_messages', 'home_quick_action');
              navigate(`${basePath}/messages`);
            }}
            className="bg-white border rounded-xl p-4 text-left shadow-sm active:scale-[0.98] transition-transform"
          >
            <MessageSquare className="w-6 h-6 text-primary mb-2" />
            <p className="text-sm font-semibold">Messages</p>
          </button>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recommended Jobs</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              trackUiAction('refresh_home_feed', 'home_recommendations');
              void loadData();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700 mb-3">{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadData()}>
              Retry
            </Button>
          </div>
        )}

        {jobs.length === 0 ? (
          <div className="rounded-xl border bg-white p-5 text-center text-sm text-muted-foreground">
            No recommendations yet. Explore jobs and update your profile skills.
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div key={job.job_id} className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{job.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{job.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {job.mode.toUpperCase()} - {job.location} - Match {job.matchScore}%
                    </p>
                  </div>
                  <span className="text-sm font-bold text-primary">INR {job.budget}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      trackUiAction('open_jobs_tab', 'home_job_card', { jobId: job.job_id });
                      navigate(`${basePath}/jobs?jobId=${job.job_id}`);
                    }}
                  >
                    View
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                    onClick={() => {
                      trackUiAction('apply_from_home', 'home_job_card', { jobId: job.job_id });
                      navigate(`${basePath}/jobs?apply=${job.job_id}`);
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
