import { ApiError, apiRequest } from './client';
import {
  Booking,
  Job,
  MarketplaceApplication,
  MarketplaceJob,
  MarketplaceMessage,
  MarketplaceNotification,
  MarketplaceProfile,
  PartnerStats,
  Review,
  ServicePartner,
  UserRole,
} from '../types';
import { SessionUser } from '../utils/session';
import * as offline from './offlineService';

export type WeeklyAvailability = Record<string, { enabled: boolean; slots: string[] }>;

export interface AuthOtpResponse {
  otpToken: string;
  message: string;
  demoOtpCode?: string;
  expiresInSeconds?: number;
}

export interface AuthVerifyResponse {
  token: string;
  user: SessionUser;
}

export interface GoogleSignInPayload {
  role: UserRole;
  idToken?: string;
  email?: string;
  name?: string;
}

export interface ChatResponse {
  content: string;
  serviceResults: ServicePartner[];
}

export interface TrackingResponse {
  booking: Booking;
  partner: {
    id: string;
    name: string;
    image: string;
    phone: string;
    eta: number;
  } | null;
  statusFlow: Array<{ key: string; label: string }>;
  currentStatusIndex: number;
}

export interface PartnerDashboardResponse {
  stats: PartnerStats;
  todayJobs: Job[];
}

export interface PartnerEarningsResponse {
  stats: PartnerStats;
  weeklyData: Array<{ day: string; amount: number }>;
  monthlyData: Array<{ week: string; amount: number }>;
  transactions: Array<{
    id: string;
    customer: string;
    service: string;
    amount: number;
    date: string;
    status: string;
  }>;
}

export interface PartnerReviewsResponse {
  stats: PartnerStats;
  reviews: Review[];
  ratingDistribution: Array<{ stars: number; count: number; percentage: number }>;
}

export interface MarketplaceRecommendationsResponse {
  profile: MarketplaceProfile;
  jobs: Array<MarketplaceJob & { matchScore: number }>;
}

export interface MarketplaceConversation {
  peer: {
    user_id: string;
    name: string;
    role: 'worker' | 'client';
    ratings: number;
    rank: number;
  };
  lastMessage: MarketplaceMessage;
  unreadCount: number;
}

async function withOfflineFallback<T>(online: () => Promise<T>, offlineHandler: () => Promise<T>): Promise<T> {
  try {
    return await online();
  } catch (error) {
    if (error instanceof ApiError && error.isNetworkError) {
      return offlineHandler();
    }
    throw error;
  }
}

export async function sendOtp(phone: string, role: UserRole): Promise<AuthOtpResponse> {
  return withOfflineFallback(
    () => apiRequest<AuthOtpResponse>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, role }),
    }),
    () => offline.sendOtp(phone, role),
  );
}

export async function verifyOtp(
  phone: string,
  role: UserRole,
  otp: string,
  otpToken: string,
): Promise<AuthVerifyResponse> {
  return withOfflineFallback(
    () => apiRequest<AuthVerifyResponse>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, role, otp, otpToken }),
    }),
    () => offline.verifyOtp(phone, role, otp, otpToken),
  );
}

export async function signInWithGoogle(payload: GoogleSignInPayload): Promise<AuthVerifyResponse> {
  return withOfflineFallback(
    () => apiRequest<AuthVerifyResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    () => offline.signInWithGoogle(payload),
  );
}

export async function fetchSuggestedPrompts(): Promise<string[]> {
  return withOfflineFallback(
    async () => {
      const response = await apiRequest<{ prompts: string[] }>('/prompts');
      return response.prompts;
    },
    () => offline.fetchSuggestedPrompts(),
  );
}

export async function queryAssistant(query: string): Promise<ChatResponse> {
  return withOfflineFallback(
    () => apiRequest<ChatResponse>('/chat/query', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),
    () => offline.queryAssistant(query),
  );
}

export async function fetchPartnerById(id: string): Promise<ServicePartner> {
  return withOfflineFallback(
    () => apiRequest<ServicePartner>(`/partners/${id}`),
    () => offline.fetchPartnerById(id),
  );
}

export async function fetchPartnerReviews(id: string, limit = 20): Promise<Review[]> {
  return withOfflineFallback(
    () => apiRequest<Review[]>(`/partners/${id}/reviews?limit=${limit}`),
    () => offline.fetchPartnerReviews(id, limit),
  );
}

export async function createBooking(payload: {
  customerId: string;
  partnerId: string;
  serviceId: string;
  date: string;
  time: string;
  address: string;
  notes?: string;
}): Promise<Booking> {
  return withOfflineFallback(
    () => apiRequest<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    () => offline.createBooking(payload),
  );
}

export async function fetchBookingById(id: string): Promise<Booking> {
  return withOfflineFallback(
    () => apiRequest<Booking>(`/bookings/${id}`),
    () => offline.fetchBookingById(id),
  );
}

export async function fetchCustomerBookings(customerId: string): Promise<Booking[]> {
  return withOfflineFallback(
    () => apiRequest<Booking[]>(`/bookings?customerId=${customerId}`),
    () => offline.fetchCustomerBookings(customerId),
  );
}

export async function payForBooking(bookingId: string, paymentMethod: string): Promise<Booking> {
  return withOfflineFallback(
    async () => {
      const response = await apiRequest<{ success: boolean; booking: Booking }>('/payments', {
        method: 'POST',
        body: JSON.stringify({ bookingId, paymentMethod }),
      });

      return response.booking;
    },
    () => offline.payForBooking(bookingId, paymentMethod),
  );
}

export async function fetchTracking(bookingId: string): Promise<TrackingResponse> {
  return withOfflineFallback(
    () => apiRequest<TrackingResponse>(`/tracking/${bookingId}`),
    () => offline.fetchTracking(bookingId),
  );
}

export async function fetchPartnerDashboard(partnerId: string): Promise<PartnerDashboardResponse> {
  return withOfflineFallback(
    () => apiRequest<PartnerDashboardResponse>(`/partner/${partnerId}/dashboard`),
    () => offline.fetchPartnerDashboard(partnerId),
  );
}

export async function fetchPartnerJobs(partnerId: string): Promise<Job[]> {
  return withOfflineFallback(
    () => apiRequest<Job[]>(`/partner/${partnerId}/jobs`),
    () => offline.fetchPartnerJobs(partnerId),
  );
}

export async function updatePartnerJobStatus(
  jobId: string,
  status: 'accepted' | 'on-the-way' | 'in-progress' | 'completed',
): Promise<Job> {
  return withOfflineFallback(
    () => apiRequest<Job>(`/partner/jobs/${jobId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
    () => offline.updatePartnerJobStatus(jobId, status),
  );
}

export async function rejectPartnerJob(jobId: string): Promise<void> {
  return withOfflineFallback(
    async () => {
      await apiRequest<{ success: boolean }>(`/partner/jobs/${jobId}`, { method: 'DELETE' });
    },
    () => offline.rejectPartnerJob(jobId),
  );
}

export async function fetchPartnerAvailability(partnerId: string): Promise<WeeklyAvailability> {
  return withOfflineFallback(
    () => apiRequest<WeeklyAvailability>(`/partner/${partnerId}/availability`),
    () => offline.fetchPartnerAvailability(partnerId),
  );
}

export async function savePartnerAvailability(
  partnerId: string,
  availability: WeeklyAvailability,
): Promise<WeeklyAvailability> {
  return withOfflineFallback(
    () => apiRequest<WeeklyAvailability>(`/partner/${partnerId}/availability`, {
      method: 'PUT',
      body: JSON.stringify({ availability }),
    }),
    () => offline.savePartnerAvailability(partnerId, availability),
  );
}

export async function fetchPartnerEarnings(partnerId: string): Promise<PartnerEarningsResponse> {
  return withOfflineFallback(
    () => apiRequest<PartnerEarningsResponse>(`/partner/${partnerId}/earnings`),
    () => offline.fetchPartnerEarnings(partnerId),
  );
}

export async function fetchPartnerReviewsPanel(partnerId: string): Promise<PartnerReviewsResponse> {
  return withOfflineFallback(
    () => apiRequest<PartnerReviewsResponse>(`/partner/${partnerId}/reviews`),
    () => offline.fetchPartnerReviewsPanel(partnerId),
  );
}

export async function replyToReview(partnerId: string, reviewId: string, text: string): Promise<Review> {
  return withOfflineFallback(
    () => apiRequest<Review>(`/partner/${partnerId}/reviews/${reviewId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
    () => offline.replyToReview(partnerId, reviewId, text),
  );
}

export async function fetchJobs(params?: {
  status?: 'open' | 'ongoing' | 'completed';
  mode?: 'online' | 'offline' | 'hybrid';
  search?: string;
  location?: string;
  mine?: boolean;
}): Promise<MarketplaceJob[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.mode) searchParams.set('mode', params.mode);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.location) searchParams.set('location', params.location);
  if (params?.mine) searchParams.set('mine', 'true');
  const qs = searchParams.toString();

  return withOfflineFallback(
    () => apiRequest<MarketplaceJob[]>(`/marketplace/jobs${qs ? `?${qs}` : ''}`),
    () => offline.fetchJobs(params),
  );
}

export async function postJob(payload: {
  title: string;
  description: string;
  budget: number;
  location: string;
  mode: 'online' | 'offline' | 'hybrid';
  requiredSkills: string[];
  attachments?: string[];
}): Promise<MarketplaceJob> {
  return withOfflineFallback(
    () => apiRequest<MarketplaceJob>('/marketplace/jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    () => offline.postJob(payload),
  );
}

export async function applyToJob(jobId: string, proposal: string): Promise<MarketplaceApplication> {
  return withOfflineFallback(
    () => apiRequest<MarketplaceApplication>(`/marketplace/jobs/${jobId}/apply`, {
      method: 'POST',
      body: JSON.stringify({ proposal }),
    }),
    () => offline.applyToJob(jobId, proposal),
  );
}

export async function fetchJobApplications(jobId: string): Promise<Array<MarketplaceApplication & {
  applicant: {
    user_id: string;
    name: string;
    role: 'worker' | 'client';
    ratings: number;
    rank: number;
  } | null;
}>> {
  return withOfflineFallback(
    () => apiRequest(`/marketplace/jobs/${jobId}/applications`),
    () => offline.fetchJobApplications(jobId),
  );
}

export async function updateApplicationStatus(
  applicationId: string,
  status: 'shortlisted' | 'accepted' | 'rejected',
): Promise<MarketplaceApplication> {
  return withOfflineFallback(
    () => apiRequest<MarketplaceApplication>(`/marketplace/applications/${applicationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
    () => offline.updateApplicationStatus(applicationId, status),
  );
}

export async function updateMarketplaceJobStatus(
  jobId: string,
  status: 'open' | 'ongoing' | 'completed',
): Promise<MarketplaceJob> {
  return withOfflineFallback(
    () => apiRequest<MarketplaceJob>(`/marketplace/jobs/${jobId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
    () => offline.updateMarketplaceJobStatus(jobId, status),
  );
}

export async function fetchMarketplaceProfile(): Promise<MarketplaceProfile> {
  return withOfflineFallback(
    () => apiRequest<MarketplaceProfile>('/marketplace/profile'),
    () => offline.fetchMarketplaceProfile(),
  );
}

export async function updateMarketplaceProfile(payload: {
  location?: string;
  skills?: string[];
}): Promise<MarketplaceProfile> {
  return withOfflineFallback(
    () => apiRequest<MarketplaceProfile>('/marketplace/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
    () => offline.updateMarketplaceProfile(payload),
  );
}

export async function fetchRecommendations(): Promise<MarketplaceRecommendationsResponse> {
  return withOfflineFallback(
    () => apiRequest<MarketplaceRecommendationsResponse>('/marketplace/recommendations'),
    () => offline.fetchRecommendations(),
  );
}

export async function fetchConversations(): Promise<MarketplaceConversation[]> {
  return withOfflineFallback(
    () => apiRequest<MarketplaceConversation[]>('/marketplace/conversations'),
    () => offline.fetchConversations(),
  );
}

export async function fetchMessages(peerId: string): Promise<MarketplaceMessage[]> {
  return withOfflineFallback(
    () => apiRequest<MarketplaceMessage[]>(`/marketplace/messages/${peerId}`),
    () => offline.fetchMessages(peerId),
  );
}

export async function sendMessage(payload: {
  receiver_id: string;
  message: string;
  job_id?: string;
}): Promise<MarketplaceMessage> {
  return withOfflineFallback(
    () => apiRequest<MarketplaceMessage>('/marketplace/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    () => offline.sendMessage(payload),
  );
}

export async function fetchNotifications(): Promise<MarketplaceNotification[]> {
  return withOfflineFallback(
    () => apiRequest<MarketplaceNotification[]>('/marketplace/notifications'),
    () => offline.fetchNotifications(),
  );
}

export async function markNotificationRead(notificationId: string): Promise<MarketplaceNotification> {
  return withOfflineFallback(
    () => apiRequest<MarketplaceNotification>(`/marketplace/notifications/${notificationId}/read`, {
      method: 'PATCH',
    }),
    () => offline.markNotificationRead(notificationId),
  );
}

export async function logUiClick(action: string, target: string, metadata: Record<string, unknown> = {}): Promise<void> {
  try {
    await apiRequest<{ success: boolean }>('/telemetry/click', {
      method: 'POST',
      body: JSON.stringify({ action, target, metadata }),
    });
  } catch {
    // click logging should never block user actions
  }
}
