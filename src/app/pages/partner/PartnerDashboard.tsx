import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { TrendingUp, Calendar, DollarSign, Star, Bell } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Job, PartnerStats } from '../../types';
import { fetchPartnerDashboard } from '../../api/marketplaceApi';
import { getPartnerId } from '../../utils/session';
import { trackUiAction } from '../../utils/interaction';

export function PartnerDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [todayJobs, setTodayJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchPartnerDashboard(getPartnerId())
      .then((response) => {
        if (!active) {
          return;
        }

        setStats(response.stats);
        setTodayJobs(response.todayJobs);
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load dashboard.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  if (!stats) {
    return <div className="p-6">{error || 'Dashboard unavailable.'}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-primary to-accent text-white px-6 py-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-white/80 mt-1">Welcome back, Partner!</p>
          </div>
          <button
            onClick={() => {
              trackUiAction('open_notifications', 'partner_dashboard');
              navigate('/partner/notifications');
            }}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center relative active:scale-95 transition-transform"
          >
            <Bell className="w-5 h-5" />
            <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <Calendar className="w-8 h-8 mb-2" />
            <p className="text-3xl font-bold">{stats.todayJobs}</p>
            <p className="text-sm text-white/80">Today's Jobs</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <DollarSign className="w-8 h-8 mb-2" />
            <p className="text-3xl font-bold">INR {stats.todayEarnings.toLocaleString()}</p>
            <p className="text-sm text-white/80">Today's Earnings</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Performance Overview
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
              <p className="text-2xl font-bold text-primary">{stats.totalRating}</p>
              <p className="text-xs text-muted-foreground mt-1">Rating</p>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
              <p className="text-2xl font-bold text-primary">{stats.totalReviews}</p>
              <p className="text-xs text-muted-foreground mt-1">Reviews</p>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
              <p className="text-2xl font-bold text-primary">{stats.completionRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">Complete</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Earnings</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/partner/service/earnings')}>
              View All
            </Button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
              <span className="text-sm text-muted-foreground">This Week</span>
              <span className="font-semibold text-primary">INR {stats.weeklyEarnings.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
              <span className="text-sm text-muted-foreground">This Month</span>
              <span className="font-semibold text-primary">INR {stats.monthlyEarnings.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Today's Jobs</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/partner/service/tasks')}>
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {todayJobs.length > 0 ? (
              todayJobs.map((job) => (
                <div
                  key={job.id}
                  className="border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate('/partner/service/tasks')}
                >
                  <div className="flex gap-3">
                    <img src={job.customerImage} alt={job.customerName} className="w-12 h-12 rounded-full object-cover" />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <h3 className="font-semibold text-sm">{job.customerName}</h3>
                          <p className="text-xs text-muted-foreground">{job.service}</p>
                        </div>
                        <Badge variant={job.status === 'pending' ? 'secondary' : 'default'} className="text-xs">
                          {job.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">{job.time}</span>
                        <span className="text-sm font-semibold text-primary">INR {job.price}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No jobs scheduled for today.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/partner/service/availability')}
            className="bg-white border rounded-xl p-4 hover:shadow-md transition-all"
          >
            <Calendar className="w-8 h-8 text-primary mb-2" />
            <p className="font-semibold text-sm">Manage Availability</p>
          </button>
          <button
            onClick={() => navigate('/partner/service/reviews')}
            className="bg-white border rounded-xl p-4 hover:shadow-md transition-all"
          >
            <Star className="w-8 h-8 text-primary mb-2" />
            <p className="font-semibold text-sm">View Reviews</p>
          </button>
        </div>

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
      </div>
    </div>
  );
}
