import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { MarketplaceNotification } from '../../types';
import { fetchNotifications, markNotificationRead } from '../../api/marketplaceApi';
import { trackUiAction } from '../../utils/interaction';
import { useMarketplaceContext } from '../../state/marketplace-context';

export function NotificationsPanel() {
  const { refreshMarketplace } = useMarketplaceContext();
  const [notifications, setNotifications] = useState<MarketplaceNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchNotifications();
      setNotifications(response);
      await refreshMarketplace();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  const handleRead = async (notificationId: string) => {
    try {
      await markNotificationRead(notificationId);
      trackUiAction('mark_notification_read', 'notifications_panel', { notificationId });
      await loadNotifications();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update notification.');
    }
  };

  if (loading) {
    return <div className="p-6">Loading notifications...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-r from-primary to-accent text-white px-6 py-5 shadow-lg">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-white/80 mt-1">Application, message, and system updates</p>
      </div>

      <div className="px-6 py-5 space-y-3">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700 mb-2">{error}</p>
            <Button type="button" variant="outline" onClick={() => void loadNotifications()}>
              Retry
            </Button>
          </div>
        )}

        {notifications.length === 0 ? (
          <div className="bg-white border rounded-xl p-5 text-center text-sm text-muted-foreground">
            No notifications available.
          </div>
        ) : (
          notifications.map((item) => (
            <div key={item.notification_id} className="bg-white border rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${item.isRead ? 'bg-gray-100' : 'bg-blue-100'}`}>
                  <BellRing className={`w-4 h-4 ${item.isRead ? 'text-gray-500' : 'text-primary'}`} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{item.body}</p>
                  <p className="text-[11px] text-muted-foreground mt-2">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
              </div>
              {!item.isRead && (
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void handleRead(item.notification_id)}>
                  Mark as read
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
