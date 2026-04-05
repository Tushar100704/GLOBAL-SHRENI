import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Calendar, Clock, MapPin } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { motion } from 'motion/react';
import { fetchPartnerById, createBooking } from '../../api/marketplaceApi';
import { Service, ServicePartner } from '../../types';
import { getCustomerId } from '../../utils/session';

export function BookingFlow() {
  const { partnerId, serviceId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState<'datetime' | 'address' | 'confirm'>('datetime');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [address, setAddress] = useState('123 MG Road, Bangalore');
  const [notes, setNotes] = useState('');
  const [partner, setPartner] = useState<ServicePartner | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!partnerId || !serviceId) {
      return;
    }

    let active = true;
    setLoading(true);

    fetchPartnerById(partnerId)
      .then((partnerResponse) => {
        if (!active) {
          return;
        }

        setPartner(partnerResponse);
        const selectedService = partnerResponse.services.find((candidate) => candidate.id === serviceId) || null;
        setService(selectedService);
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }

        setError(requestError instanceof Error ? requestError.message : 'Unable to load booking details.');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [partnerId, serviceId]);

  const handleConfirmBooking = async () => {
    if (!partner || !service || !selectedDate || !selectedTime || !address) {
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const booking = await createBooking({
        customerId: getCustomerId(),
        partnerId: partner.id,
        serviceId: service.id,
        date: selectedDate,
        time: selectedTime,
        address,
        notes,
      });

      navigate(`/customer/payment/${booking.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create booking.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading booking...</div>;
  }

  if (!partner || !service) {
    return <div className="p-6">{error || 'Booking not found.'}</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-primary to-accent text-white px-6 py-4 shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold">Book Service</h1>
            <p className="text-xs text-white/80">{partner.name}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          {['datetime', 'address', 'confirm'].map((currentStep, index) => (
            <div key={currentStep} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step === currentStep
                    ? 'bg-primary text-white'
                    : ['datetime', 'address', 'confirm'].indexOf(step) > index
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index + 1}
              </div>
              {index < 2 && (
                <div
                  className={`w-16 h-0.5 ${
                    ['datetime', 'address', 'confirm'].indexOf(step) > index
                      ? 'bg-primary'
                      : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <img src={partner.image} alt={partner.name} className="w-16 h-16 rounded-xl object-cover" />
          <div className="flex-1">
            <h3 className="font-semibold">{service.name}</h3>
            <p className="text-sm text-muted-foreground">{partner.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-semibold text-primary">INR {service.price}</span>
              <span className="text-xs text-muted-foreground">- {service.duration} min</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 pb-28">
        {step === 'datetime' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Select Date and Time</h2>
              <div className="space-y-3">
                {partner.availability.map((day) => (
                  <div key={day.date} className="border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold">{day.date}</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {day.slots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => {
                            setSelectedDate(day.date);
                            setSelectedTime(slot);
                          }}
                          className={`border rounded-lg px-3 py-2 text-sm transition-all ${
                            selectedDate === day.date && selectedTime === slot
                              ? 'bg-primary text-white border-primary'
                              : 'bg-gradient-to-br from-blue-50 to-purple-50 border-primary/20 hover:border-primary'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step === 'address' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Service Address</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Address</label>
                  <Textarea
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder="Enter your address"
                    className="min-h-24 bg-input-background border-0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Additional Notes (Optional)</label>
                  <Textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Any special instructions..."
                    className="min-h-20 bg-input-background border-0"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'confirm' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Confirm Booking</h2>
              <div className="space-y-3">
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <Calendar className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date and Time</p>
                      <p className="font-semibold">{selectedDate} at {selectedTime}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 mb-3">
                    <MapPin className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Service Address</p>
                      <p className="font-semibold">{address}</p>
                    </div>
                  </div>
                  {notes && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p className="font-semibold">{notes}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border rounded-xl p-4">
                  <h3 className="font-semibold mb-3">Price Breakdown</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service Fee</span>
                      <span>INR {service.price}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform Fee</span>
                      <span>INR 50</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold text-base">
                      <span>Total</span>
                      <span className="text-primary">INR {service.price + 50}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 max-w-md mx-auto">
        <div className="flex gap-3">
          {step !== 'datetime' && (
            <Button
              variant="outline"
              onClick={() => {
                if (step === 'address') setStep('datetime');
                if (step === 'confirm') setStep('address');
              }}
              className="flex-1 h-12"
            >
              Back
            </Button>
          )}
          <Button
            onClick={() => {
              if (step === 'datetime' && selectedDate && selectedTime) setStep('address');
              else if (step === 'address' && address) setStep('confirm');
              else if (step === 'confirm') void handleConfirmBooking();
            }}
            disabled={
              submitting ||
              (step === 'datetime' && (!selectedDate || !selectedTime)) ||
              (step === 'address' && !address)
            }
            className="flex-1 h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            {step === 'confirm'
              ? (submitting ? 'Creating Booking...' : 'Proceed to Payment')
              : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
