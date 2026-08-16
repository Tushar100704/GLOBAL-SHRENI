import { useCallback, useEffect, useState } from 'react';
import { MapPin, Phone, MessageSquare, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Job } from '../../types';
import { fetchPartnerJobs, rejectPartnerJob, updatePartnerJobStatus } from '../../api/marketplaceApi';
import { getPartnerId } from '../../utils/session';
import { toast } from 'sonner';
import { callContact, messageContact } from '../../utils/contact';

export function TaskManager() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadJobs = useCallback(async () => {
    try {
      const response = await fetchPartnerJobs(getPartnerId());
      setJobs(response);
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load jobs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const handleAccept = async (jobId: string) => {
    try {
      await updatePartnerJobStatus(jobId, 'accepted');
      toast.success('Job accepted successfully.');
      await loadJobs();
    } catch {
      toast.error('Unable to accept job.');
    }
  };

  const handleReject = async (jobId: string) => {
    try {
      await rejectPartnerJob(jobId);
      toast.error('Job rejected.');
      await loadJobs();
    } catch {
      toast.error('Unable to reject job.');
    }
  };

  const handleUpdateStatus = async (jobId: string, status: 'on-the-way' | 'in-progress' | 'completed') => {
    try {
      await updatePartnerJobStatus(jobId, status);
      toast.success('Status updated successfully.');
      await loadJobs();
    } catch {
      toast.error('Unable to update status.');
    }
  };

  const pendingJobs = jobs.filter((job) => job.status === 'pending');
  const activeJobs = jobs.filter((job) => ['accepted', 'on-the-way', 'in-progress'].includes(job.status));
  const completedJobs = jobs.filter((job) => job.status === 'completed');

  const renderJobCard = (job: Job, type: 'pending' | 'active' | 'completed') => (
    <div key={job.id} className="bg-white border rounded-xl p-4 mb-3">
      <div className="flex gap-3 mb-3">
        <img src={job.customerImage} alt={job.customerName} className="w-14 h-14 rounded-full object-cover" />
        <div className="flex-1">
          <h3 className="font-semibold">{job.customerName}</h3>
          <p className="text-sm text-muted-foreground">{job.service}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{job.time}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{job.distance} km</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-primary">INR {job.price}</p>
          <Badge variant="outline" className="mt-1 text-xs">
            {job.status}
          </Badge>
        </div>
      </div>

      <div className="border-t pt-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <MapPin className="w-4 h-4" />
          <span className="line-clamp-1">{job.address}</span>
        </div>

        {type === 'pending' && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleReject(job.id)}
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Reject
            </Button>
            <Button
              size="sm"
              onClick={() => void handleAccept(job.id)}
              className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Accept
            </Button>
          </div>
        )}

        {type === 'active' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => callContact(job.customerName)}
              >
                <Phone className="w-4 h-4 mr-1" />
                Call
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => messageContact(job.customerName)}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                Message
              </Button>
            </div>
            <div className="flex gap-2">
              {job.status === 'accepted' && (
                <Button
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  onClick={() => void handleUpdateStatus(job.id, 'on-the-way')}
                >
                  Start Journey
                </Button>
              )}
              {job.status === 'on-the-way' && (
                <Button
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  onClick={() => void handleUpdateStatus(job.id, 'in-progress')}
                >
                  Start Service
                </Button>
              )}
              {job.status === 'in-progress' && (
                <Button
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  onClick={() => void handleUpdateStatus(job.id, 'completed')}
                >
                  Mark Complete
                </Button>
              )}
            </div>
          </div>
        )}

        {type === 'completed' && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-green-600 font-medium">Completed</span>
            <span className="text-muted-foreground">Payment received</span>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return <div className="p-6">Loading tasks...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-primary to-accent text-white px-6 py-6 shadow-lg">
        <h1 className="text-2xl font-bold">Task Manager</h1>
        <p className="text-sm text-white/80 mt-1">Manage your service requests</p>
      </div>

      <div className="px-6 py-6">
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <Tabs defaultValue="pending">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="pending">Pending ({pendingJobs.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({activeJobs.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedJobs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pendingJobs.length > 0 ? (
              pendingJobs.map((job) => renderJobCard(job, 'pending'))
            ) : (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-muted-foreground mb-2">No pending requests</h3>
                <p className="text-sm text-muted-foreground">New job requests will appear here</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="active">
            {activeJobs.length > 0 ? (
              activeJobs.map((job) => renderJobCard(job, 'active'))
            ) : (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-muted-foreground mb-2">No active jobs</h3>
                <p className="text-sm text-muted-foreground">Accept pending requests to start working</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {completedJobs.length > 0 ? (
              completedJobs.map((job) => renderJobCard(job, 'completed'))
            ) : (
              <div className="text-center py-12">
                <CheckCircle2 className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-muted-foreground mb-2">No completed jobs</h3>
                <p className="text-sm text-muted-foreground">Completed jobs will appear here</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
