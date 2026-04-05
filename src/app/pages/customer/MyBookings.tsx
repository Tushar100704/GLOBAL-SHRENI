import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Calendar, Clock, Star } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Booking } from '../../types';
import { fetchCustomerBookings } from '../../api/marketplaceApi';
import { getCustomerId } from '../../utils/session';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  assigned: 'bg-blue-100 text-blue-800',
  'on-the-way': 'bg-purple-100 text-purple-800',
  'in-progress': 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export function MyBookings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchCustomerBookings(getCustomerId())
      .then((response) => {
        if (active) {
          setBookings(response);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load bookings.');
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

  const upcomingBookings = useMemo(
    () => bookings.filter((booking) => booking.status !== 'completed' && booking.status !== 'cancelled'),
    [bookings],
  );

  const completedBookings = useMemo(
    () => bookings.filter((booking) => booking.status === 'completed'),
    [bookings],
  );

  const renderBookingCard = (booking: Booking) => (
    <div key={booking.id} className="bg-white border rounded-xl p-4 mb-3 hover:shadow-md transition-shadow">
      <div className="flex gap-3 mb-3">
        <img src={booking.partnerImage} alt={booking.partnerName} className="w-16 h-16 rounded-xl object-cover" />
        <div className="flex-1">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="font-semibold">{booking.partnerName}</h3>
              <p className="text-sm text-muted-foreground">{booking.service}</p>
            </div>
            <Badge className={statusColors[booking.status] || 'bg-gray-100 text-gray-700'}>
              {booking.status.replace('-', ' ')}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{booking.date}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{booking.time}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t">
        <span className="font-semibold text-primary">INR {booking.price}</span>
        <div className="flex gap-2">
          {booking.status === 'assigned' || booking.status === 'on-the-way' || booking.status === 'in-progress' ? (
            <Button
              size="sm"
              onClick={() => navigate(`/customer/tracking/${booking.id}`)}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              Track
            </Button>
          ) : booking.status === 'completed' ? (
            <>
              <Button size="sm" variant="outline" onClick={() => navigate(`/customer/partner/${booking.partnerId}`)}>
                Rebook
              </Button>
              <Button
                size="sm"
                onClick={() => navigate(`/customer/partner/${booking.partnerId}`)}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                <Star className="w-4 h-4 mr-1" />
                Review
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => navigate(`/customer/partner/${booking.partnerId}`)}>
              View Details
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <div className="p-6">Loading bookings...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-primary to-accent text-white px-6 py-6 shadow-lg">
        <h1 className="text-2xl font-bold">My Bookings</h1>
        <p className="text-sm text-white/80 mt-1">Track and manage your services</p>
      </div>

      <div className="px-6 py-6">
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="upcoming">Upcoming ({upcomingBookings.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedBookings.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {upcomingBookings.length > 0 ? (
              upcomingBookings.map(renderBookingCard)
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-muted-foreground mb-2">No upcoming bookings</h3>
                <p className="text-sm text-muted-foreground mb-4">Book a service to get started</p>
                <Button onClick={() => navigate('/customer')} className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                  Explore Services
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {completedBookings.length > 0 ? (
              completedBookings.map(renderBookingCard)
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-muted-foreground mb-2">No completed bookings</h3>
                <p className="text-sm text-muted-foreground">Your completed services will appear here</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
