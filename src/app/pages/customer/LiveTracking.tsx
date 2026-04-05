import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, MapPin, Phone, MessageSquare, CheckCircle2, Clock, Navigation } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { motion } from 'motion/react';
import { fetchTracking, TrackingResponse } from '../../api/marketplaceApi';
import { callContact, messageContact } from '../../utils/contact';

const iconByStatus: Record<string, typeof CheckCircle2> = {
  assigned: CheckCircle2,
  'on-the-way': Navigation,
  'in-progress': Clock,
  completed: CheckCircle2,
};

export function LiveTracking() {
  const navigate = useNavigate();
  const { bookingId } = useParams();
  const [tracking, setTracking] = useState<TrackingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      setError('Booking id is missing.');
      return;
    }

    let active = true;

    const loadTracking = async () => {
      try {
        const response = await fetchTracking(bookingId);
        if (active) {
          setTracking(response);
          setError('');
        }
      } catch (requestError) {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to fetch tracking details.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadTracking();
    const timer = setInterval(() => {
      void loadTracking();
    }, 5000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [bookingId]);

  if (loading) {
    return <div className="p-6">Loading tracking...</div>;
  }

  if (!tracking || !tracking.partner) {
    return <div className="p-6">{error || 'Tracking unavailable.'}</div>;
  }

  const { booking, statusFlow, currentStatusIndex, partner } = tracking;

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-primary to-accent text-white px-6 py-4 shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold">Track Your Service</h1>
            <p className="text-xs text-white/80">Live updates</p>
          </div>
        </div>
      </div>

      <div className="h-80 bg-gradient-to-br from-blue-100 to-purple-100 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-32 h-32 rounded-full bg-primary/20"
          />
          <div className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <MapPin className="w-8 h-8 text-white" />
          </div>
        </div>
        <div className="absolute top-4 right-4 bg-white rounded-full px-4 py-2 shadow-lg">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">{partner.eta} min</span>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="mb-6">
          <h2 className="font-semibold mb-4">Service Status</h2>
          <div className="space-y-4">
            {statusFlow.map((status, index) => {
              const Icon = iconByStatus[status.key] || Clock;
              const isCompleted = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;

              return (
                <div key={status.key} className="flex items-start gap-3">
                  <div className="relative">
                    <motion.div
                      initial={false}
                      animate={{ scale: isCurrent ? [1, 1.2, 1] : 1 }}
                      transition={{ duration: 1, repeat: isCurrent ? Infinity : 0 }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCompleted ? 'bg-gradient-to-br from-primary to-accent' : 'bg-muted'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isCompleted ? 'text-white' : 'text-muted-foreground'}`} />
                    </motion.div>
                    {index < statusFlow.length - 1 && (
                      <div className={`absolute left-5 top-10 w-0.5 h-8 ${isCompleted ? 'bg-primary' : 'bg-muted'}`} />
                    )}
                  </div>
                  <div className="flex-1 pt-2">
                    <h3 className={`font-semibold ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {status.label}
                    </h3>
                    {isCurrent && <p className="text-sm text-primary">In progress...</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <img src={partner.image} alt={partner.name} className="w-16 h-16 rounded-xl object-cover" />
            <div className="flex-1">
              <h3 className="font-semibold">Your Service Partner</h3>
              <p className="text-sm text-muted-foreground">{partner.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{partner.phone}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => callContact(partner.name, partner.phone)}>
              <Phone className="w-4 h-4 mr-2" />
              Call
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => messageContact(partner.name, partner.phone)}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Message
            </Button>
          </div>
        </div>

        <div className="mt-4 border rounded-xl p-4">
          <h3 className="font-semibold mb-3">Service Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service</span>
              <span className="font-medium">{booking.service}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date and Time</span>
              <span className="font-medium">{booking.date} at {booking.time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location</span>
              <span className="font-medium">{booking.address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment</span>
              <span className="font-medium text-green-600">{booking.paymentStatus === 'paid' ? 'Paid' : 'Pending'}</span>
            </div>
          </div>
        </div>

        {currentStatusIndex === statusFlow.length - 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
            <Button onClick={() => navigate('/customer/bookings')} className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90">
              Rate Service
            </Button>
          </motion.div>
        )}

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
      </div>
    </div>
  );
}
