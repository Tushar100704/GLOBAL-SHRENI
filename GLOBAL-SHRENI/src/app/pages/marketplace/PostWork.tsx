import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Upload } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { postJob } from '../../api/marketplaceApi';
import { getSessionUser } from '../../utils/session';
import { trackUiAction } from '../../utils/interaction';
import { toast } from 'sonner';

function getBasePath(): '/customer' | '/partner' {
  return getSessionUser()?.role === 'partner' ? '/partner' : '/customer';
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read file.'));
    reader.readAsDataURL(file);
  });
}

export function PostWork() {
  const navigate = useNavigate();
  const basePath = getBasePath();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState('');
  const [mode, setMode] = useState<'online' | 'offline' | 'hybrid'>('online');
  const [skills, setSkills] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAttachmentChange = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const limited = Array.from(files).slice(0, 3);
    try {
      const encoded = await Promise.all(limited.map((file) => fileToDataUrl(file)));
      setAttachments(encoded);
      trackUiAction('add_attachments', 'post_work', { count: encoded.length });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to attach files.');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !budget.trim() || !location.trim()) {
      setError('Please fill all required fields.');
      return;
    }

    const parsedBudget = Number(budget);
    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      setError('Budget must be a valid positive number.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await postJob({
        title: title.trim(),
        description: description.trim(),
        budget: parsedBudget,
        location: location.trim(),
        mode,
        requiredSkills: skills.split(',').map((item) => item.trim()).filter(Boolean),
        attachments,
      });
      trackUiAction('post_job_submit', 'post_work', { mode });
      toast.success('Job posted successfully.');
      navigate(`${basePath}/jobs`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to post job.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-r from-primary to-accent text-white px-6 py-5 shadow-lg">
        <h1 className="text-2xl font-bold">Post Work</h1>
        <p className="text-sm text-white/80 mt-1">Create a job for online or offline services</p>
      </div>

      <div className="px-6 py-5 space-y-4">
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Job title*" />
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe scope, deliverables and timeline*"
            className="min-h-24"
          />
          <Input value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="Budget in INR*" />
          <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Location / City*" />
          <Input
            value={skills}
            onChange={(event) => setSkills(event.target.value)}
            placeholder="Required skills (comma separated)"
          />

          <div className="flex gap-2">
            {(['online', 'offline', 'hybrid'] as const).map((item) => (
              <button
                key={item}
                onClick={() => {
                  trackUiAction('select_mode', 'post_work', { mode: item });
                  setMode(item);
                }}
                className={`px-3 py-2 rounded-lg border text-sm active:scale-95 transition-transform ${
                  mode === item ? 'bg-primary text-white border-primary' : 'bg-white'
                }`}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="text-sm text-muted-foreground">Attachments (max 3)</span>
            <input
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              multiple
              className="mt-2 block w-full text-sm"
              onChange={(event) => void handleAttachmentChange(event.target.files)}
            />
          </label>

          {attachments.length > 0 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Upload className="w-3 h-3" />
              {attachments.length} attachment(s) ready
            </p>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            {submitting ? 'Posting...' : 'Post Job'}
          </Button>
        </div>
      </div>
    </div>
  );
}
