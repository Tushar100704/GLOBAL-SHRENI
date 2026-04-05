export interface ServicePartner {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  distance: number;
  eta: number;
  priceRange: string;
  available: boolean;
  image: string;
  phone?: string;
  expertise: string[];
  description: string;
  verified: boolean;
  services: Service[];
  availability: TimeSlot[];
}

export type WorkMode = 'online' | 'offline' | 'hybrid';
export type MarketplaceJobStatus = 'open' | 'ongoing' | 'completed';
export type MarketplaceRole = 'worker' | 'client';

export interface MarketplaceJob {
  job_id: string;
  owner_id: string;
  title: string;
  description: string;
  budget: number;
  location: string;
  mode: WorkMode;
  status: MarketplaceJobStatus;
  requiredSkills: string[];
  attachments: string[];
  createdAt: string;
  applicationsCount: number;
  selectedApplicantId?: string;
}

export interface MarketplaceApplication {
  application_id: string;
  applicant_id: string;
  job_id: string;
  proposal: string;
  status: 'pending' | 'shortlisted' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface MarketplaceMessage {
  message_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  timestamp: string;
  job_id?: string;
}

export interface MarketplaceNotification {
  notification_id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'info' | 'application' | 'message' | 'system';
  isRead: boolean;
  createdAt: string;
}

export interface MarketplaceProfile {
  user_id: string;
  name: string;
  role: MarketplaceRole;
  rank: number;
  rankLabel: string;
  ratings: number;
  walletBalance: number;
  completedJobs: number;
  postedJobs: number;
  applicationsSubmitted: number;
  location: string;
  skills: string[];
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description: string;
}

export interface TimeSlot {
  date: string;
  slots: string[];
}

export interface Review {
  id: string;
  partnerId?: string;
  userId: string;
  userName: string;
  userImage: string;
  rating: number;
  comment: string;
  tags: string[];
  date: string;
  photos?: string[];
  reply?: string;
  replyDate?: string;
}

export interface Booking {
  id: string;
  customerId?: string;
  partnerId: string;
  partnerName: string;
  partnerImage: string;
  serviceId?: string;
  service: string;
  date: string;
  time: string;
  status: 'pending' | 'assigned' | 'on-the-way' | 'in-progress' | 'completed' | 'cancelled';
  paymentStatus?: 'pending' | 'paid';
  paymentMethod?: string;
  price: number;
  address: string;
  notes?: string;
  category: string;
  jobId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  serviceResults?: ServicePartner[];
  type?: 'text' | 'service-cards' | 'booking-confirmation';
}

export interface PartnerStats {
  todayJobs: number;
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  totalRating: number;
  totalReviews: number;
  completionRate: number;
}

export interface Job {
  id: string;
  bookingId?: string;
  partnerId?: string;
  customerId: string;
  customerName: string;
  customerImage: string;
  service: string;
  date: string;
  time: string;
  status: 'pending' | 'accepted' | 'on-the-way' | 'in-progress' | 'completed';
  price: number;
  address: string;
  distance: number;
}

export type UserRole = 'customer' | 'partner';
