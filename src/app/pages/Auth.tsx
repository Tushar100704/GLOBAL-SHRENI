import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../components/ui/input-otp';
import { motion } from 'motion/react';
import { ArrowLeft, Chrome } from 'lucide-react';
import { sendOtp, signInWithGoogle, verifyOtp } from '../api/marketplaceApi';
import { getSessionUser, getUserRole, setSession } from '../utils/session';
import { toast } from 'sonner';
import { checkApiHealth, getApiBaseUrl, getStoredApiBaseUrl, setStoredApiBaseUrl } from '../api/client';

export function Auth() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showNetworkSettings, setShowNetworkSettings] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState(getStoredApiBaseUrl() || getApiBaseUrl());
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [showGoogleForm, setShowGoogleForm] = useState(false);
  const [googleName, setGoogleName] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const userRole = getUserRole();

  useEffect(() => {
    const existing = getSessionUser();
    if (!existing) {
      return;
    }
    navigate(existing.role === 'partner' ? '/partner' : '/customer', { replace: true });
  }, [navigate]);

  const handleSendOTP = async () => {
    if (phone.length !== 10) {
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const response = await sendOtp(phone, userRole);
      setOtpToken(response.otpToken);
      setStep('otp');
      if (response.demoOtpCode) {
        toast.success(`OTP sent. Demo OTP: ${response.demoOtpCode}`);
      } else {
        toast.success('OTP sent successfully.');
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send OTP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const session = await verifyOtp(phone, userRole, otp, otpToken);
      setSession(session.token, session.user);
      navigate(userRole === 'customer' ? '/customer' : '/partner');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to verify OTP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!showGoogleForm) {
      setShowGoogleForm(true);
      setError('');
      return;
    }

    const normalizedEmail = googleEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid Google email to continue.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const session = await signInWithGoogle({
        role: userRole,
        email: normalizedEmail,
        name: googleName.trim(),
      });
      setSession(session.token, session.user);
      navigate(userRole === 'customer' ? '/customer' : '/partner');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Google sign in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveApiUrl = () => {
    setStoredApiBaseUrl(apiUrlInput);
    const active = getStoredApiBaseUrl() || getApiBaseUrl();
    setApiUrlInput(active);
    toast.success('Backend URL saved');
  };

  const handleResetApiUrl = () => {
    setStoredApiBaseUrl('');
    setApiUrlInput(getApiBaseUrl());
    toast.success('Using default backend URL');
  };

  const handleTestApi = async () => {
    setIsTestingApi(true);
    const healthy = await checkApiHealth(apiUrlInput);
    if (healthy) {
      toast.success('Backend connection successful');
    } else {
      toast.error('Backend not reachable. App will use offline mode.');
    }
    setIsTestingApi(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <button
          onClick={() => step === 'otp' ? setStep('phone') : navigate('/role-selection')}
          className="mb-8 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 shadow-xl"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">
              {step === 'phone' ? 'Welcome!' : 'Verify OTP'}
            </h1>
            <p className="text-muted-foreground">
              {step === 'phone'
                ? 'Enter your phone number to continue'
                : `Enter the OTP sent to +91 ${phone}`}
            </p>
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          </div>

          {step === 'phone' ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm">Phone Number</label>
                <div className="flex gap-2">
                  <div className="w-16 h-12 bg-muted rounded-xl flex items-center justify-center text-sm font-medium">
                    +91
                  </div>
                  <Input
                    type="tel"
                    placeholder="Enter phone number"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 h-12 bg-input-background border-0"
                  />
                </div>
              </div>

              <Button
                onClick={handleSendOTP}
                disabled={phone.length !== 10 || isSubmitting}
                className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                {isSubmitting ? 'Sending...' : 'Send OTP'}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-muted"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button
                onClick={handleGoogleSignIn}
                variant="outline"
                disabled={isSubmitting}
                className="w-full h-12"
              >
                <Chrome className="w-5 h-5 mr-2" />
                {isSubmitting ? 'Signing in...' : showGoogleForm ? 'Continue Google Sign-In' : 'Sign in with Google'}
              </Button>

              {showGoogleForm && (
                <div className="space-y-2 rounded-xl border p-3 bg-muted/20">
                  <p className="text-xs text-muted-foreground">
                    Enter your Google account details. For production OAuth, configure Google credentials on backend.
                  </p>
                  <Input
                    type="text"
                    placeholder="Full name"
                    value={googleName}
                    onChange={(event) => setGoogleName(event.target.value)}
                    className="h-10 bg-white"
                  />
                  <Input
                    type="email"
                    placeholder="name@gmail.com"
                    value={googleEmail}
                    onChange={(event) => setGoogleEmail(event.target.value)}
                    className="h-10 bg-white"
                  />
                </div>
              )}

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowNetworkSettings((previous) => !previous)}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  {showNetworkSettings ? 'Hide backend settings' : 'Backend settings'}
                </button>

                {showNetworkSettings && (
                  <div className="mt-3 p-3 rounded-xl border bg-muted/30 space-y-2">
                    <label className="text-xs text-muted-foreground block">Backend URL</label>
                    <Input
                      value={apiUrlInput}
                      onChange={(event) => setApiUrlInput(event.target.value)}
                      placeholder="http://192.168.1.100:4000/api"
                      className="h-10 bg-white"
                    />
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={handleSaveApiUrl}>
                        Save
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={handleResetApiUrl}>
                        Default
                      </Button>
                      <Button type="button" size="sm" onClick={() => void handleTestApi()} disabled={isTestingApi}>
                        {isTestingApi ? 'Testing...' : 'Test'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                onClick={handleVerifyOTP}
                disabled={otp.length !== 6 || isSubmitting}
                className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                {isSubmitting ? 'Verifying...' : 'Verify & Continue'}
              </Button>

              <div className="text-center">
                <button
                  onClick={() => void handleSendOTP()}
                  className="text-sm text-primary hover:underline"
                >
                  Didn't receive OTP? Resend
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
