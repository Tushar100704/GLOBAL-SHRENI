import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, CreditCard, Smartphone, Wallet, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { motion } from 'motion/react';
import { Booking } from '../../types';
import { fetchBookingById, payForBooking } from '../../api/marketplaceApi';

export function Payment() {
  const navigate = useNavigate();
  const { bookingId } = useParams();
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [showSuccess, setShowSuccess] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      setError('Booking id is missing.');
      return;
    }

    let active = true;
    setLoading(true);
    setError('');

    fetchBookingById(bookingId)
      .then((response) => {
        if (active) {
          setBooking(response);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load booking.');
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
  }, [bookingId]);

  const handlePayment = async () => {
    if (!bookingId) {
      return;
    }

    setProcessing(true);
    setError('');
    try {
      await payForBooking(bookingId, paymentMethod);
      setShowSuccess(true);
      setTimeout(() => {
        navigate('/customer/bookings');
      }, 1800);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Payment failed.');
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading payment...</div>;
  }

  if (!booking) {
    return <div className="p-6">{error || 'Booking not found.'}</div>;
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-muted-foreground">Your booking is confirmed. Redirecting...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="bg-gradient-to-r from-primary to-accent text-white px-6 py-4 shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold">Payment</h1>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 mb-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">Total Amount</p>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            INR {booking.price}
          </h2>
          <p className="text-xs text-muted-foreground mt-2">{booking.service} - {booking.partnerName}</p>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold mb-4">Select Payment Method</h3>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
            <div className="space-y-3">
              <div className={`border rounded-xl p-4 cursor-pointer transition-all ${paymentMethod === 'upi' ? 'border-primary bg-blue-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="upi" id="upi" />
                  <Label htmlFor="upi" className="flex-1 cursor-pointer flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">UPI</p>
                      <p className="text-xs text-muted-foreground">Google Pay, PhonePe, Paytm</p>
                    </div>
                  </Label>
                </div>
                {paymentMethod === 'upi' && (
                  <div className="mt-4 pl-8">
                    <Input placeholder="Enter UPI ID" className="bg-white border-0" />
                  </div>
                )}
              </div>

              <div className={`border rounded-xl p-4 cursor-pointer transition-all ${paymentMethod === 'card' ? 'border-primary bg-blue-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card" className="flex-1 cursor-pointer flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">Credit/Debit Card</p>
                      <p className="text-xs text-muted-foreground">Visa, Mastercard, Rupay</p>
                    </div>
                  </Label>
                </div>
              </div>

              <div className={`border rounded-xl p-4 cursor-pointer transition-all ${paymentMethod === 'wallet' ? 'border-primary bg-blue-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="wallet" id="wallet" />
                  <Label htmlFor="wallet" className="flex-1 cursor-pointer flex items-center gap-3">
                    <Wallet className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">Wallet</p>
                      <p className="text-xs text-muted-foreground">Paytm, Amazon Pay</p>
                    </div>
                  </Label>
                </div>
              </div>
            </div>
          </RadioGroup>
        </div>

        <div className="border rounded-xl p-4 mb-6">
          <h3 className="font-semibold mb-3">Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Fee</span>
              <span>INR {Math.max(0, booking.price - 50)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform Fee</span>
              <span>INR 50</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold text-base">
              <span>Total</span>
              <span className="text-primary">INR {booking.price}</span>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 max-w-md mx-auto">
        <Button
          onClick={() => void handlePayment()}
          disabled={processing}
          className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90"
        >
          {processing ? 'Processing...' : `Pay INR ${booking.price}`}
        </Button>
      </div>
    </div>
  );
}
