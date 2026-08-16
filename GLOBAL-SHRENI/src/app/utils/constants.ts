// App-wide constants and configuration

export const APP_NAME = 'Global Shreni';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'AI-Powered Service Marketplace';

// Navigation routes
export const ROUTES = {
  ONBOARDING: '/',
  ROLE_SELECTION: '/role-selection',
  AUTH: '/auth',
  CUSTOMER: {
    HOME: '/customer',
    PARTNER_DETAIL: (id: string) => `/customer/partner/${id}`,
    BOOKING: (partnerId: string, serviceId: string) => `/customer/booking/${partnerId}/${serviceId}`,
    PAYMENT: (bookingId: string) => `/customer/payment/${bookingId}`,
    TRACKING: (bookingId: string) => `/customer/tracking/${bookingId}`,
    BOOKINGS: '/customer/bookings',
    PROFILE: '/customer/profile',
  },
  PARTNER: {
    DASHBOARD: '/partner',
    TASKS: '/partner/tasks',
    AVAILABILITY: '/partner/availability',
    EARNINGS: '/partner/earnings',
    REVIEWS: '/partner/reviews',
  },
};

// Service categories
export const SERVICE_CATEGORIES = [
  { id: 'veterinary', name: 'Veterinary', icon: '🐾', color: '#6366f1' },
  { id: 'electrician', name: 'Electrician', icon: '⚡', color: '#8b5cf6' },
  { id: 'plumber', name: 'Plumber', icon: '🔧', color: '#ec4899' },
  { id: 'home-cleaning', name: 'Home Cleaning', icon: '🧹', color: '#10b981' },
  { id: 'ac-repair', name: 'AC Repair', icon: '❄️', color: '#3b82f6' },
  { id: 'carpenter', name: 'Carpenter', icon: '🔨', color: '#f59e0b' },
  { id: 'painter', name: 'Painter', icon: '🎨', color: '#8b5cf6' },
  { id: 'appliance', name: 'Appliance Repair', icon: '🔌', color: '#6366f1' },
];

// Status configurations
export const BOOKING_STATUSES = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  ON_THE_WAY: 'on-the-way',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Default location
export const DEFAULT_LOCATION = {
  city: 'Bangalore',
  latitude: 12.9716,
  longitude: 77.5946,
};

// Payment methods
export const PAYMENT_METHODS = {
  UPI: 'upi',
  CARD: 'card',
  WALLET: 'wallet',
};

// Time slots
export const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00',
];

// Week days
export const WEEK_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

// AI suggested prompts
export const AI_PROMPTS = [
  'Find vet near me',
  'Book electrician',
  'Home cleaning tomorrow',
  'Emergency plumber',
  'AC repair service',
  'Carpenter for furniture',
];

// Feature flags
export const FEATURES = {
  AI_CHAT: true,
  LIVE_TRACKING: true,
  REVIEWS: true,
  PAYMENTS: true,
  NOTIFICATIONS: true,
};
