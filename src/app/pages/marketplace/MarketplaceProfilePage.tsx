import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, LogOut, Save } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { clearSession } from '../../utils/session';
import { fetchMarketplaceProfile, updateMarketplaceProfile } from '../../api/marketplaceApi';
import { MarketplaceProfile } from '../../types';
import { trackUiAction } from '../../utils/interaction';
import { toast } from 'sonner';
import { useMarketplaceContext } from '../../state/marketplace-context';

export function MarketplaceProfilePage() {
  const navigate = useNavigate();
  const { unreadNotifications, refreshMarketplace } = useMarketplaceContext();
  const [profile, setProfile] = useState<MarketplaceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState('');
  const [skills, setSkills] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchMarketplaceProfile();
      setProfile(response);
      setLocation(response.location);
      setSkills(response.skills.join(', '));
      await refreshMarketplace();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await updateMarketplaceProfile({
        location: location.trim(),
        skills: skills.split(',').map((item) => item.trim()).filter(Boolean),
      });
      setProfile(response);
      trackUiAction('update_profile', 'profile_page');
      toast.success('Profile updated.');
      await refreshMarketplace();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    trackUiAction('logout', 'profile_page');
    clearSession();
    navigate('/auth');
  };

  if (loading) {
    return <div className="p-6">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="p-6">{error || 'Profile unavailable.'}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-r from-primary to-accent text-white px-6 py-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Profile</h1>
            <p className="text-sm text-white/80 mt-1">{profile.role.toUpperCase()} account</p>
          </div>
          <button
            onClick={() => navigate(`${profile.role === 'worker' ? '/partner' : '/customer'}/notifications`)}
            className="relative w-11 h-11 rounded-full bg-white/20 flex items-center justify-center active:scale-95 transition-transform"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 min-w-5 h-5 rounded-full bg-red-500 text-[11px] px-1 flex items-center justify-center">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="font-semibold">{profile.name}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-xs text-muted-foreground">Rank</p>
              <p className="font-semibold">{profile.rankLabel} ({profile.rank})</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-xs text-muted-foreground">Rating</p>
              <p className="font-semibold">{profile.ratings.toFixed(1)} / 5</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-xs text-muted-foreground">Wallet</p>
              <p className="font-semibold">INR {profile.walletBalance.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-xs text-muted-foreground">Completed Jobs</p>
              <p className="font-semibold">{profile.completedJobs}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4 space-y-3">
          <h2 className="font-semibold">Professional Details</h2>
          <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Your location" />
          <Input
            value={skills}
            onChange={(event) => setSkills(event.target.value)}
            placeholder="Skills (comma separated)"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>

        <Button type="button" variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
