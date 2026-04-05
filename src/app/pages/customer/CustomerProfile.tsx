import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { User, MapPin, Heart, History, Settings, LogOut, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { clearSession, getSessionUser } from '../../utils/session';
import { toast } from 'sonner';

export function CustomerProfile() {
  const navigate = useNavigate();
  const sessionUser = getSessionUser();

  const menuItems = useMemo(
    () => [
      { icon: User, label: 'Edit Profile', onClick: () => toast.info('Use the new profile page from bottom navigation.') },
      { icon: MapPin, label: 'Saved Addresses', onClick: () => toast.info('Use the new profile page from bottom navigation.') },
      { icon: Heart, label: 'Favorite Partners', onClick: () => toast.info('Use the new profile page from bottom navigation.') },
      { icon: History, label: 'Booking History', onClick: () => navigate('/customer/bookings') },
      { icon: Settings, label: 'Settings', onClick: () => toast.info('Use the new profile page from bottom navigation.') },
    ],
    [navigate],
  );

  const handleLogout = () => {
    clearSession();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-primary to-accent text-white px-6 pt-6 pb-12">
        <h1 className="text-2xl font-bold mb-6">Profile</h1>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl">
            C
          </div>
          <div>
            <h2 className="text-xl font-bold">{sessionUser?.name || 'Customer'}</h2>
            <p className="text-sm text-white/80 mt-1">+91 {sessionUser?.phone || '0000000000'}</p>
            <p className="text-sm text-white/80">
              {sessionUser?.email || `${(sessionUser?.name || 'customer').toLowerCase().replace(/\s+/g, '.')}@example.com`}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-6 mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">12</p>
            <p className="text-xs text-muted-foreground mt-1">Bookings</p>
          </div>
          <div className="text-center border-x">
            <p className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">5</p>
            <p className="text-xs text-muted-foreground mt-1">Favorites</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">INR 8.5k</p>
            <p className="text-xs text-muted-foreground mt-1">Spent</p>
          </div>
        </div>
      </div>

      <div className="px-6 mb-6">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className={`w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors ${
                  index !== menuItems.length - 1 ? 'border-b' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className="flex-1 text-left font-medium">{item.label}</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-6 mb-6">
        <Button onClick={handleLogout} variant="outline" className="w-full h-12 border-red-200 text-red-600 hover:bg-red-50">
          <LogOut className="w-5 h-5 mr-2" />
          Logout
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground pb-6">
        <p>Global Shreni v1.0.0</p>
        <p className="mt-1">2026 All rights reserved</p>
      </div>
    </div>
  );
}
