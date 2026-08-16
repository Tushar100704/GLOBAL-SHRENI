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

type WeeklyAvailability = Record<string, { enabled: boolean; slots: string[] }>;

interface OfflineAuthRequest {
  phone: string;
  role: UserRole;
  code: string;
  createdAt: number;
  lastSentAt: number;
  expiresAt: number;
  attempts: number;
}

interface OfflineTransaction {
  id: string;
  partnerId: string;
  bookingId: string;
  customer: string;
  service: string;
  amount: number;
  date: string;
  status: 'pending' | 'completed';
}

interface OfflineStore {
  suggestedPrompts: string[];
  servicePartners: ServicePartner[];
  reviews: Review[];
  bookings: Booking[];
  jobs: Job[];
  partnerAvailabilityByPartnerId: Record<string, WeeklyAvailability>;
  transactions: OfflineTransaction[];
  users: SessionUser[];
  marketplaceJobs: MarketplaceJob[];
  marketplaceApplications: MarketplaceApplication[];
  marketplaceMessages: MarketplaceMessage[];
  marketplaceNotifications: MarketplaceNotification[];
  clickLogs: Array<{
    id: string;
    userId: string;
    action: string;
    target: string;
    metadata: Record<string, unknown>;
    timestamp: string;
  }>;
  authRequests: Record<string, OfflineAuthRequest>;
  sessions: Array<{ token: string; userId: string; createdAt: number }>;
}

const STORE_KEY = 'offlineMarketplaceStoreV1';
const DEFAULT_CUSTOMER_ID = 'u-customer-1';
const DEFAULT_PARTNER_ID = '1';
const OTP_EXPIRY_MS = 5 * 60 * 1000;

const trackingSteps = [
  { key: 'assigned', label: 'Assigned' },
  { key: 'on-the-way', label: 'On the way' },
  { key: 'in-progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
];

const bookingToTrackingIndex: Record<string, number> = {
  pending: 0,
  assigned: 0,
  'on-the-way': 1,
  'in-progress': 2,
  completed: 3,
  cancelled: 0,
};

const jobToBookingStatus: Record<string, Booking['status']> = {
  pending: 'assigned',
  accepted: 'assigned',
  'on-the-way': 'on-the-way',
  'in-progress': 'in-progress',
  completed: 'completed',
};

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const jsDayToWeekDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIsoDate(date = new Date()): string {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function startOfDayMs(dateString: string): number {
  return new Date(`${dateString}T00:00:00`).getTime();
}

function getDaysAgo(dateString: string, referenceDateString: string): number {
  const diff = startOfDayMs(referenceDateString) - startOfDayMs(dateString);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function seedStore(): OfflineStore {
  const servicePartners: ServicePartner[] = [
    {
      id: '1',
      name: 'Dr. Sarah Veterinary Clinic',
      category: 'Veterinary',
      rating: 4.8,
      reviewCount: 234,
      distance: 1.2,
      eta: 15,
      priceRange: 'INR 500-2000',
      available: true,
      image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop',
      phone: '+91 9000000001',
      expertise: ['Pet Care', 'Emergency Care', 'Vaccination', 'Surgery'],
      description: 'Expert veterinary care for pets with 15+ years of experience.',
      verified: true,
      services: [
        { id: 's1', name: 'General Checkup', price: 500, duration: 30, description: 'Complete health examination' },
        { id: 's2', name: 'Vaccination', price: 800, duration: 20, description: 'Annual vaccination shots' },
        { id: 's3', name: 'Emergency Care', price: 2000, duration: 60, description: 'Urgent emergency service' },
      ],
      availability: [
        { date: '2026-04-05', slots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'] },
        { date: '2026-04-06', slots: ['09:00', '10:00', '11:00', '14:00', '15:00'] },
        { date: '2026-04-07', slots: ['09:00', '11:00', '14:00', '16:00'] },
      ],
    },
    {
      id: '2',
      name: 'PowerFix Electricians',
      category: 'Electrician',
      rating: 4.6,
      reviewCount: 189,
      distance: 0.8,
      eta: 10,
      priceRange: 'INR 300-1500',
      available: true,
      image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=400&fit=crop',
      phone: '+91 9000000002',
      expertise: ['Wiring', 'Repairs', 'Installation', 'Emergency'],
      description: 'Licensed electricians for home and office electrical needs.',
      verified: true,
      services: [
        { id: 's4', name: 'Fan Installation', price: 300, duration: 45, description: 'Install ceiling fan' },
        { id: 's5', name: 'Wiring Repair', price: 800, duration: 90, description: 'Fix wiring issues' },
        { id: 's6', name: 'Switch Replacement', price: 200, duration: 30, description: 'Replace faulty switches' },
      ],
      availability: [
        { date: '2026-04-05', slots: ['08:00', '09:00', '10:00', '14:00', '15:00', '17:00'] },
        { date: '2026-04-06', slots: ['08:00', '09:00', '11:00', '15:00', '17:00'] },
      ],
    },
    {
      id: '3',
      name: 'QuickFix Plumbing',
      category: 'Plumber',
      rating: 4.7,
      reviewCount: 312,
      distance: 2.0,
      eta: 20,
      priceRange: 'INR 400-2000',
      available: true,
      image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&h=400&fit=crop',
      phone: '+91 9000000003',
      expertise: ['Pipe Repair', 'Leak Fix', 'Bathroom', 'Kitchen'],
      description: 'Trusted plumbing experts available for emergency support.',
      verified: true,
      services: [
        { id: 's7', name: 'Leak Repair', price: 500, duration: 60, description: 'Fix pipe or tap leaks' },
        { id: 's8', name: 'Drain Cleaning', price: 700, duration: 45, description: 'Unblock drainage lines' },
        { id: 's9', name: 'Tap Installation', price: 400, duration: 30, description: 'Install or replace taps' },
      ],
      availability: [
        { date: '2026-04-05', slots: ['09:00', '10:00', '14:00', '16:00'] },
        { date: '2026-04-06', slots: ['08:00', '10:00', '11:00', '15:00'] },
      ],
    },
    {
      id: '4',
      name: 'Sparkle Home Cleaning',
      category: 'Home Cleaning',
      rating: 4.9,
      reviewCount: 456,
      distance: 1.5,
      eta: 18,
      priceRange: 'INR 800-3000',
      available: false,
      image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=400&fit=crop',
      phone: '+91 9000000004',
      expertise: ['Deep Cleaning', 'Regular Cleaning', 'Kitchen', 'Bathroom'],
      description: 'Professional home cleaning with eco-friendly products.',
      verified: true,
      services: [
        { id: 's10', name: 'Regular Cleaning', price: 800, duration: 120, description: 'Complete home cleaning' },
        { id: 's11', name: 'Deep Cleaning', price: 2500, duration: 240, description: 'Intensive deep cleaning' },
        { id: 's12', name: 'Kitchen Cleaning', price: 1200, duration: 90, description: 'Detailed kitchen cleaning' },
      ],
      availability: [
        { date: '2026-04-06', slots: ['09:00', '14:00'] },
        { date: '2026-04-07', slots: ['09:00', '10:00', '14:00'] },
      ],
    },
    {
      id: '5',
      name: 'AC Care Experts',
      category: 'AC Repair',
      rating: 4.5,
      reviewCount: 178,
      distance: 3.2,
      eta: 30,
      priceRange: 'INR 500-2500',
      available: true,
      image: 'https://images.unsplash.com/photo-1631545806609-6b3c0f4e8ec6?w=400&h=400&fit=crop',
      phone: '+91 9000000005',
      expertise: ['AC Service', 'Repair', 'Installation', 'Gas Refill'],
      description: 'Certified AC technicians for all major brands.',
      verified: true,
      services: [
        { id: 's13', name: 'AC Service', price: 500, duration: 60, description: 'Regular AC maintenance' },
        { id: 's14', name: 'Gas Refill', price: 1800, duration: 45, description: 'AC gas refill' },
        { id: 's15', name: 'AC Repair', price: 1200, duration: 90, description: 'Repair and diagnostics' },
      ],
      availability: [
        { date: '2026-04-05', slots: ['10:00', '14:00', '16:00'] },
        { date: '2026-04-06', slots: ['09:00', '11:00', '15:00'] },
      ],
    },
  ];

  const reviews: Review[] = [
    {
      id: 'r1',
      partnerId: '1',
      userId: 'u-customer-1',
      userName: 'Rahul Sharma',
      userImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      rating: 5,
      comment: 'Excellent service, very professional and punctual.',
      tags: ['Professional', 'On Time', 'Friendly'],
      date: '2026-03-28',
      photos: ['https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=300&h=300&fit=crop'],
    },
    {
      id: 'r2',
      partnerId: '2',
      userId: 'u-customer-2',
      userName: 'Priya Patel',
      userImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      rating: 5,
      comment: 'Fixed the wiring issue quickly and efficiently.',
      tags: ['Quick Service', 'Expert', 'Value for Money'],
      date: '2026-03-25',
    },
    {
      id: 'r3',
      partnerId: '1',
      userId: 'u-customer-3',
      userName: 'Amit Kumar',
      userImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
      rating: 4,
      comment: 'Good service overall and polite communication.',
      tags: ['Good Quality', 'Polite'],
      date: '2026-03-20',
    },
  ];

  const bookings: Booking[] = [
    {
      id: 'b1',
      customerId: DEFAULT_CUSTOMER_ID,
      partnerId: '1',
      partnerName: 'Dr. Sarah Veterinary Clinic',
      partnerImage: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop',
      serviceId: 's1',
      service: 'General Checkup',
      date: '2026-04-05',
      time: '10:00',
      status: 'assigned',
      paymentStatus: 'paid',
      paymentMethod: 'upi',
      price: 550,
      address: '123 MG Road, Bangalore',
      category: 'Veterinary',
      jobId: 'j1',
      notes: '',
    },
  ];

  const jobs: Job[] = [
    {
      id: 'j1',
      bookingId: 'b1',
      partnerId: '1',
      customerId: DEFAULT_CUSTOMER_ID,
      customerName: 'Rahul Sharma',
      customerImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      service: 'General Checkup',
      date: '2026-04-05',
      time: '10:00',
      status: 'accepted',
      price: 500,
      address: '123 MG Road, Bangalore',
      distance: 1.2,
    },
  ];

  const availabilityByPartnerId: Record<string, WeeklyAvailability> = {
    '1': {
      Monday: { enabled: true, slots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'] },
      Tuesday: { enabled: true, slots: ['09:00', '10:00', '11:00', '14:00', '15:00'] },
      Wednesday: { enabled: true, slots: ['09:00', '11:00', '14:00', '16:00'] },
      Thursday: { enabled: true, slots: ['09:00', '10:00', '14:00', '15:00', '16:00'] },
      Friday: { enabled: true, slots: ['09:00', '10:00', '11:00', '15:00', '16:00'] },
      Saturday: { enabled: false, slots: [] },
      Sunday: { enabled: false, slots: [] },
    },
  };

  const transactions: OfflineTransaction[] = [
    {
      id: 't1',
      partnerId: '1',
      bookingId: 'b1',
      customer: 'Rahul Sharma',
      service: 'General Checkup',
      amount: 500,
      date: '2026-04-05',
      status: 'completed',
    },
  ];

  return {
    suggestedPrompts: [
      'Find vet near me',
      'Book electrician',
      'Home cleaning tomorrow',
      'Emergency plumber',
      'AC repair service',
      'Carpenter for furniture',
    ],
    servicePartners,
    reviews,
    bookings,
    jobs,
    partnerAvailabilityByPartnerId: availabilityByPartnerId,
    transactions,
    users: [
      {
        id: DEFAULT_CUSTOMER_ID,
        name: 'Rahul Sharma',
        role: 'customer',
        marketplaceRole: 'client',
        phone: '9876543210',
        email: 'rahul.sharma@example.com',
        ratings: 4.7,
        walletBalance: 3250,
        location: 'Bangalore',
        skills: ['Client Management', 'Planning'],
      },
      {
        id: 'u-partner-1',
        name: 'Dr. Sarah Veterinary Clinic',
        role: 'partner',
        marketplaceRole: 'worker',
        phone: '9000000001',
        email: 'partner1@example.com',
        partnerId: '1',
        ratings: 4.9,
        walletBalance: 18900,
        location: 'Bangalore',
        skills: ['Veterinary', 'Emergency Care', 'Pet Grooming'],
      },
    ],
    marketplaceJobs: [
      {
        job_id: 'mj-1',
        owner_id: DEFAULT_CUSTOMER_ID,
        title: 'Need React landing page designer',
        description: 'Design and implement a responsive landing page for our startup.',
        budget: 12000,
        location: 'Remote',
        mode: 'online',
        status: 'open',
        requiredSkills: ['React', 'UI/UX', 'Tailwind'],
        attachments: [],
        createdAt: '2026-04-04T10:00:00.000Z',
        applicationsCount: 1,
        selectedApplicantId: '',
      },
      {
        job_id: 'mj-2',
        owner_id: DEFAULT_CUSTOMER_ID,
        title: 'Electrician for office wiring check',
        description: 'Need on-site inspection and minor repairs in Koramangala office.',
        budget: 3500,
        location: 'Bangalore',
        mode: 'offline',
        status: 'ongoing',
        requiredSkills: ['Electrical', 'Troubleshooting'],
        attachments: [],
        createdAt: '2026-04-03T08:00:00.000Z',
        applicationsCount: 1,
        selectedApplicantId: 'u-partner-1',
      },
      {
        job_id: 'mj-3',
        owner_id: DEFAULT_CUSTOMER_ID,
        title: 'Logo and brand guideline',
        description: 'Create professional logo variations and brand color guide.',
        budget: 8000,
        location: 'Remote',
        mode: 'online',
        status: 'completed',
        requiredSkills: ['Branding', 'Illustrator'],
        attachments: [],
        createdAt: '2026-04-01T07:30:00.000Z',
        applicationsCount: 1,
        selectedApplicantId: 'u-partner-1',
      },
    ],
    marketplaceApplications: [
      {
        application_id: 'ma-1',
        applicant_id: 'u-partner-1',
        job_id: 'mj-1',
        proposal: 'I can deliver this in 3 days with 2 revision rounds.',
        status: 'pending',
        createdAt: '2026-04-04T12:00:00.000Z',
      },
      {
        application_id: 'ma-2',
        applicant_id: 'u-partner-1',
        job_id: 'mj-2',
        proposal: 'Available today evening, can complete within 2 hours.',
        status: 'accepted',
        createdAt: '2026-04-03T09:15:00.000Z',
      },
      {
        application_id: 'ma-3',
        applicant_id: 'u-partner-1',
        job_id: 'mj-3',
        proposal: 'Sharing 3 concepts and final exports.',
        status: 'accepted',
        createdAt: '2026-04-01T08:10:00.000Z',
      },
    ],
    marketplaceMessages: [
      {
        message_id: 'mm-1',
        sender_id: DEFAULT_CUSTOMER_ID,
        receiver_id: 'u-partner-1',
        message: 'Can you share your portfolio links?',
        timestamp: '2026-04-04T12:30:00.000Z',
        job_id: 'mj-1',
      },
      {
        message_id: 'mm-2',
        sender_id: 'u-partner-1',
        receiver_id: DEFAULT_CUSTOMER_ID,
        message: 'Sure, sharing now. Also available for call.',
        timestamp: '2026-04-04T12:35:00.000Z',
        job_id: 'mj-1',
      },
    ],
    marketplaceNotifications: [
      {
        notification_id: 'mn-1',
        user_id: DEFAULT_CUSTOMER_ID,
        title: 'New application received',
        body: 'Dr. Sarah Veterinary Clinic applied to "Need React landing page designer".',
        type: 'application',
        isRead: false,
        createdAt: '2026-04-04T12:00:00.000Z',
      },
      {
        notification_id: 'mn-2',
        user_id: 'u-partner-1',
        title: 'Application accepted',
        body: 'Your application was accepted for "Electrician for office wiring check".',
        type: 'application',
        isRead: false,
        createdAt: '2026-04-03T09:30:00.000Z',
      },
    ],
    clickLogs: [],
    authRequests: {},
    sessions: [],
  };
}

let cache: OfflineStore | null = null;

function ensureStoreShape(store: OfflineStore): OfflineStore {
  store.marketplaceJobs = Array.isArray(store.marketplaceJobs) ? store.marketplaceJobs : [];
  store.marketplaceApplications = Array.isArray(store.marketplaceApplications) ? store.marketplaceApplications : [];
  store.marketplaceMessages = Array.isArray(store.marketplaceMessages) ? store.marketplaceMessages : [];
  store.marketplaceNotifications = Array.isArray(store.marketplaceNotifications) ? store.marketplaceNotifications : [];
  store.clickLogs = Array.isArray(store.clickLogs) ? store.clickLogs : [];
  return store;
}

function getStore(): OfflineStore {
  if (cache) {
    return cache;
  }

  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) {
    cache = ensureStoreShape(seedStore());
    localStorage.setItem(STORE_KEY, JSON.stringify(cache));
    return cache;
  }

  try {
    cache = ensureStoreShape(JSON.parse(raw) as OfflineStore);
  } catch {
    cache = ensureStoreShape(seedStore());
    localStorage.setItem(STORE_KEY, JSON.stringify(cache));
  }
  return cache;
}

function saveStore(): void {
  if (!cache) {
    return;
  }
  localStorage.setItem(STORE_KEY, JSON.stringify(cache));
}

function getQueryCategory(query: string): string {
  const normalized = query.toLowerCase();
  if (/(vet|veterinary|pet|dog|cat)/.test(normalized)) return 'Veterinary';
  if (/(electric|wiring|power|switch)/.test(normalized)) return 'Electrician';
  if (/(plumb|leak|pipe|drain)/.test(normalized)) return 'Plumber';
  if (/(clean|house|home|kitchen|bathroom)/.test(normalized)) return 'Home Cleaning';
  if (/(ac|air condition|cooling)/.test(normalized)) return 'AC Repair';
  return '';
}

function filterPartnersByQuery(partners: ServicePartner[], query: string): ServicePartner[] {
  const normalized = query.toLowerCase().trim();
  if (!normalized) {
    return partners.slice(0, 3);
  }

  const category = getQueryCategory(normalized);
  if (category) {
    return partners.filter((partner) => partner.category === category);
  }

  return partners.filter((partner) => {
    const haystack = [
      partner.name,
      partner.category,
      partner.description,
      ...partner.expertise,
      ...partner.services.map((service) => service.name),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

function getQueryResponseText(query: string, resultCount: number): string {
  const category = getQueryCategory(query);
  if (category === 'Veterinary') return 'I found these veterinary services near you:';
  if (category === 'Electrician') return 'Here are the best electricians in your area:';
  if (category === 'Plumber') return 'I found these plumbing experts for you:';
  if (category === 'Home Cleaning') return 'Here are professional cleaning services near you:';
  if (category === 'AC Repair') return 'I found these AC repair services:';
  if (resultCount === 0) return 'No exact matches found. Here are some popular services:';
  return 'Here are some popular services in your area:';
}

function calculatePartnerStats(partnerId: string, store: OfflineStore): PartnerStats {
  const today = toIsoDate();
  const jobs = store.jobs.filter((job) => job.partnerId === partnerId);
  const reviews = store.reviews.filter((review) => review.partnerId === partnerId);
  const transactions = store.transactions.filter((tx) => tx.partnerId === partnerId);

  const completedJobs = jobs.filter((job) => job.status === 'completed').length;
  const actionableJobs = jobs.filter((job) => job.status !== 'pending').length;
  const todayJobs = jobs.filter((job) => job.date === today && job.status !== 'completed').length;

  const completedTransactions = transactions.filter((tx) => tx.status === 'completed');
  const todayEarnings = completedTransactions
    .filter((tx) => tx.date === today)
    .reduce((total, tx) => total + tx.amount, 0);

  const weeklyEarnings = completedTransactions
    .filter((tx) => getDaysAgo(tx.date, today) >= 0 && getDaysAgo(tx.date, today) < 7)
    .reduce((total, tx) => total + tx.amount, 0);

  const monthlyEarnings = completedTransactions
    .filter((tx) => getDaysAgo(tx.date, today) >= 0 && getDaysAgo(tx.date, today) < 30)
    .reduce((total, tx) => total + tx.amount, 0);

  const totalRating = reviews.length > 0
    ? Number((reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1))
    : 0;

  const completionRate = actionableJobs > 0
    ? Math.round((completedJobs / actionableJobs) * 100)
    : 0;

  return {
    todayJobs,
    todayEarnings,
    weeklyEarnings,
    monthlyEarnings,
    totalRating,
    totalReviews: reviews.length,
    completionRate,
  };
}

function buildWeeklyEarningsData(transactions: OfflineTransaction[]): Array<{ day: string; amount: number }> {
  const today = new Date();
  const completed = transactions.filter((tx) => tx.status === 'completed');

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const iso = toIsoDate(date);
    const amount = completed
      .filter((tx) => tx.date === iso)
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      amount,
    };
  });
}

function buildMonthlyEarningsData(transactions: OfflineTransaction[]): Array<{ week: string; amount: number }> {
  const today = toIsoDate();
  const buckets = [0, 0, 0, 0];
  transactions
    .filter((tx) => tx.status === 'completed')
    .forEach((tx) => {
      const daysAgo = getDaysAgo(tx.date, today);
      if (daysAgo < 0 || daysAgo >= 28) {
        return;
      }
      const bucketIndex = 3 - Math.floor(daysAgo / 7);
      buckets[bucketIndex] += tx.amount;
    });

  return buckets.map((amount, index) => ({
    week: `Week ${index + 1}`,
    amount,
  }));
}

function buildRatingDistribution(reviews: Review[]): Array<{ stars: number; count: number; percentage: number }> {
  const total = reviews.length || 1;
  return [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((review) => review.rating === stars).length;
    return {
      stars,
      count,
      percentage: Math.round((count / total) * 100),
    };
  });
}

function generateRollingAvailability(weeklyAvailability: WeeklyAvailability): ServicePartner['availability'] {
  const result: ServicePartner['availability'] = [];
  const today = new Date();

  for (let offset = 0; offset < 10; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    const weekDayName = jsDayToWeekDay[date.getDay()];
    const dayConfig = weeklyAvailability[weekDayName];
    if (!dayConfig || !dayConfig.enabled || dayConfig.slots.length === 0) {
      continue;
    }
    result.push({
      date: toIsoDate(date),
      slots: [...dayConfig.slots].sort(),
    });
  }

  return result;
}

export async function sendOtp(
  phone: string,
  role: UserRole,
): Promise<{ otpToken: string; message: string; demoOtpCode?: string; expiresInSeconds?: number }> {
  if (!/^\d{10}$/.test(phone)) {
    throw new Error('Phone must be 10 digits.');
  }
  const store = getStore();
  const now = Date.now();
  const otpToken = createId('otp');
  store.authRequests[otpToken] = {
    phone,
    role,
    code: '123456',
    createdAt: now,
    lastSentAt: now,
    expiresAt: now + OTP_EXPIRY_MS,
    attempts: 0,
  };
  saveStore();
  return {
    otpToken,
    message: 'OTP sent successfully.',
    demoOtpCode: '123456',
    expiresInSeconds: Math.floor(OTP_EXPIRY_MS / 1000),
  };
}

export async function verifyOtp(
  phone: string,
  role: UserRole,
  otp: string,
  otpToken: string,
): Promise<{ token: string; user: SessionUser }> {
  if (!/^\d{10}$/.test(phone)) {
    throw new Error('Phone must be 10 digits.');
  }
  if (!/^\d{6}$/.test(otp)) {
    throw new Error('OTP must be 6 digits.');
  }
  if (!otpToken) {
    throw new Error('OTP session not found. Please request a new OTP.');
  }

  const store = getStore();
  const authRequest = store.authRequests[otpToken];
  if (!authRequest || authRequest.phone !== phone || authRequest.role !== role) {
    throw new Error('OTP session not found. Please request a new OTP.');
  }
  if ((authRequest.expiresAt || 0) <= Date.now()) {
    delete store.authRequests[otpToken];
    saveStore();
    throw new Error('OTP expired. Please request a new OTP.');
  }
  if ((authRequest.attempts || 0) >= 5) {
    delete store.authRequests[otpToken];
    saveStore();
    throw new Error('Too many invalid OTP attempts. Please request a new OTP.');
  }
  if (authRequest.code !== otp) {
    authRequest.attempts = (authRequest.attempts || 0) + 1;
    if (authRequest.attempts >= 5) {
      delete store.authRequests[otpToken];
    }
    saveStore();
    throw new Error('Invalid OTP.');
  }

  let user = store.users.find((candidate) => candidate.phone === phone && candidate.role === role);
  if (!user) {
      user = {
        id: createId(role === 'partner' ? 'u-partner' : 'u-customer'),
        name: role === 'partner' ? 'Service Partner' : 'Customer',
        role,
        marketplaceRole: role === 'partner' ? 'worker' : 'client',
        phone,
        ratings: 4.5,
        walletBalance: 0,
        location: 'Bangalore',
        skills: role === 'partner' ? ['General Service'] : ['Client Management'],
        partnerId: role === 'partner' ? DEFAULT_PARTNER_ID : undefined,
      };
    store.users.push(user);
  }

  const token = createId('session');
  store.sessions.push({ token, userId: user.id, createdAt: Date.now() });
  if (otpToken) {
    delete store.authRequests[otpToken];
  }
  saveStore();

  return { token, user };
}

export async function signInWithGoogle(payload: {
  role: UserRole;
  idToken?: string;
  email?: string;
  name?: string;
}): Promise<{ token: string; user: SessionUser }> {
  const email = String(payload.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('A valid email is required for Google sign in.');
  }

  const role = payload.role;
  const store = getStore();
  let user = store.users.find(
    (candidate) => candidate.role === role && String(candidate.email || '').toLowerCase() === email,
  );

  if (!user) {
      user = {
        id: createId(role === 'partner' ? 'u-partner' : 'u-customer'),
        name: String(payload.name || email.split('@')[0]),
        role,
        marketplaceRole: role === 'partner' ? 'worker' : 'client',
        phone: '0000000000',
        email,
        ratings: 4.5,
        walletBalance: 0,
        location: 'Bangalore',
        skills: role === 'partner' ? ['General Service'] : ['Client Management'],
        partnerId: role === 'partner' ? DEFAULT_PARTNER_ID : undefined,
      };
      store.users.push(user);
    } else {
      user.name = String(payload.name || user.name || email.split('@')[0]);
      user.email = email;
      if (!user.marketplaceRole) {
        user.marketplaceRole = role === 'partner' ? 'worker' : 'client';
      }
      if (!Array.isArray(user.skills)) {
        user.skills = role === 'partner' ? ['General Service'] : ['Client Management'];
      }
      if (role === 'partner' && !user.partnerId) {
        user.partnerId = DEFAULT_PARTNER_ID;
      }
  }

  const token = createId('session');
  store.sessions.push({ token, userId: user.id, createdAt: Date.now() });
  saveStore();
  return { token, user };
}

export async function fetchSuggestedPrompts(): Promise<string[]> {
  return getStore().suggestedPrompts;
}

export async function queryAssistant(query: string): Promise<{ content: string; serviceResults: ServicePartner[] }> {
  const store = getStore();
  const results = filterPartnersByQuery(store.servicePartners, query);
  const responseResults = results.length > 0 ? results : store.servicePartners.slice(0, 3);
  return {
    content: getQueryResponseText(query.toLowerCase(), responseResults.length),
    serviceResults: responseResults,
  };
}

export async function fetchPartnerById(id: string): Promise<ServicePartner> {
  const partner = getStore().servicePartners.find((candidate) => candidate.id === id);
  if (!partner) {
    throw new Error('Partner not found.');
  }
  return partner;
}

export async function fetchPartnerReviews(id: string, limit = 20): Promise<Review[]> {
  return getStore().reviews
    .filter((review) => review.partnerId === id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
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
  const store = getStore();
  const partner = store.servicePartners.find((candidate) => candidate.id === payload.partnerId);
  if (!partner) {
    throw new Error('Partner not found.');
  }

  const service = partner.services.find((candidate) => candidate.id === payload.serviceId);
  if (!service) {
    throw new Error('Service not found.');
  }

  const booking: Booking = {
    id: createId('b'),
    customerId: payload.customerId || DEFAULT_CUSTOMER_ID,
    partnerId: partner.id,
    partnerName: partner.name,
    partnerImage: partner.image,
    serviceId: service.id,
    service: service.name,
    date: payload.date,
    time: payload.time,
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: '',
    price: service.price + 50,
    address: payload.address,
    notes: payload.notes || '',
    category: partner.category,
    jobId: '',
  };

  store.bookings.push(booking);
  saveStore();
  return booking;
}

export async function fetchBookingById(id: string): Promise<Booking> {
  const booking = getStore().bookings.find((candidate) => candidate.id === id);
  if (!booking) {
    throw new Error('Booking not found.');
  }
  return booking;
}

export async function fetchCustomerBookings(customerId: string): Promise<Booking[]> {
  return getStore().bookings
    .filter((booking) => booking.customerId === customerId)
    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
}

export async function payForBooking(bookingId: string, paymentMethod: string): Promise<Booking> {
  const store = getStore();
  const booking = store.bookings.find((candidate) => candidate.id === bookingId);
  if (!booking) {
    throw new Error('Booking not found.');
  }

  booking.paymentStatus = 'paid';
  booking.paymentMethod = paymentMethod;
  booking.status = 'assigned';

  if (!booking.jobId) {
    const customer = store.users.find((user) => user.id === booking.customerId);
    const job: Job = {
      id: createId('j'),
      bookingId: booking.id,
      partnerId: booking.partnerId,
      customerId: booking.customerId || DEFAULT_CUSTOMER_ID,
      customerName: customer?.name || 'Customer',
      customerImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
      service: booking.service,
      date: booking.date,
      time: booking.time,
      status: 'pending',
      price: Math.max(0, booking.price - 50),
      address: booking.address,
      distance: Number((Math.random() * 4 + 0.5).toFixed(1)),
    };
    store.jobs.push(job);
    booking.jobId = job.id;
  }

  if (!store.transactions.some((tx) => tx.bookingId === booking.id)) {
    store.transactions.push({
      id: createId('t'),
      partnerId: booking.partnerId,
      bookingId: booking.id,
      customer: store.users.find((user) => user.id === booking.customerId)?.name || 'Customer',
      service: booking.service,
      amount: Math.max(0, booking.price - 50),
      date: toIsoDate(),
      status: 'completed',
    });
  }

  saveStore();
  return booking;
}

export async function fetchTracking(bookingId: string): Promise<{
  booking: Booking;
  partner: { id: string; name: string; image: string; phone: string; eta: number } | null;
  statusFlow: Array<{ key: string; label: string }>;
  currentStatusIndex: number;
}> {
  const store = getStore();
  const booking = store.bookings.find((candidate) => candidate.id === bookingId);
  if (!booking) {
    throw new Error('Booking not found.');
  }

  const partner = store.servicePartners.find((candidate) => candidate.id === booking.partnerId);
  const currentStatusIndex = bookingToTrackingIndex[booking.status] ?? 0;

  return {
    booking,
    partner: partner
      ? {
          id: partner.id,
          name: partner.name,
          image: partner.image,
          phone: partner.phone || '+91 98765 43210',
          eta: Math.max(0, partner.eta - currentStatusIndex * 3),
        }
      : null,
    statusFlow: trackingSteps,
    currentStatusIndex,
  };
}

export async function fetchPartnerDashboard(partnerId: string): Promise<{ stats: PartnerStats; todayJobs: Job[] }> {
  const store = getStore();
  const stats = calculatePartnerStats(partnerId, store);
  const today = toIsoDate();
  const todayJobs = store.jobs
    .filter((job) => job.partnerId === partnerId && job.date === today)
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 5);
  return { stats, todayJobs };
}

export async function fetchPartnerJobs(partnerId: string): Promise<Job[]> {
  return getStore().jobs
    .filter((job) => job.partnerId === partnerId)
    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
}

export async function updatePartnerJobStatus(
  jobId: string,
  status: 'accepted' | 'on-the-way' | 'in-progress' | 'completed',
): Promise<Job> {
  const store = getStore();
  const job = store.jobs.find((candidate) => candidate.id === jobId);
  if (!job) {
    throw new Error('Job not found.');
  }
  job.status = status;

  if (job.bookingId) {
    const booking = store.bookings.find((candidate) => candidate.id === job.bookingId);
    if (booking) {
      booking.status = jobToBookingStatus[status];
    }
  }

  saveStore();
  return job;
}

export async function rejectPartnerJob(jobId: string): Promise<void> {
  const store = getStore();
  const index = store.jobs.findIndex((candidate) => candidate.id === jobId);
  if (index === -1) {
    throw new Error('Job not found.');
  }

  const [removed] = store.jobs.splice(index, 1);
  if (removed.bookingId) {
    const booking = store.bookings.find((candidate) => candidate.id === removed.bookingId);
    if (booking) {
      booking.status = 'cancelled';
    }
  }
  saveStore();
}

export async function fetchPartnerAvailability(partnerId: string): Promise<WeeklyAvailability> {
  const store = getStore();
  const existing = store.partnerAvailabilityByPartnerId[partnerId];
  if (existing) {
    return existing;
  }

  const empty = weekDays.reduce((accumulator, day) => {
    accumulator[day] = { enabled: false, slots: [] };
    return accumulator;
  }, {} as WeeklyAvailability);
  store.partnerAvailabilityByPartnerId[partnerId] = empty;
  saveStore();
  return empty;
}

export async function savePartnerAvailability(partnerId: string, availability: WeeklyAvailability): Promise<WeeklyAvailability> {
  const store = getStore();
  store.partnerAvailabilityByPartnerId[partnerId] = availability;
  const partner = store.servicePartners.find((candidate) => candidate.id === partnerId);
  if (partner) {
    partner.availability = generateRollingAvailability(availability);
    partner.available = partner.availability.length > 0;
  }
  saveStore();
  return availability;
}

export async function fetchPartnerEarnings(partnerId: string): Promise<{
  stats: PartnerStats;
  weeklyData: Array<{ day: string; amount: number }>;
  monthlyData: Array<{ week: string; amount: number }>;
  transactions: Array<{ id: string; customer: string; service: string; amount: number; date: string; status: string }>;
}> {
  const store = getStore();
  const transactions = store.transactions
    .filter((tx) => tx.partnerId === partnerId)
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    stats: calculatePartnerStats(partnerId, store),
    weeklyData: buildWeeklyEarningsData(transactions),
    monthlyData: buildMonthlyEarningsData(transactions),
    transactions,
  };
}

export async function fetchPartnerReviewsPanel(partnerId: string): Promise<{
  stats: PartnerStats;
  reviews: Review[];
  ratingDistribution: Array<{ stars: number; count: number; percentage: number }>;
}> {
  const store = getStore();
  const reviews = store.reviews
    .filter((review) => review.partnerId === partnerId)
    .sort((a, b) => b.date.localeCompare(a.date));
  return {
    stats: calculatePartnerStats(partnerId, store),
    reviews,
    ratingDistribution: buildRatingDistribution(reviews),
  };
}

export async function replyToReview(partnerId: string, reviewId: string, text: string): Promise<Review> {
  const store = getStore();
  const review = store.reviews.find((candidate) => candidate.id === reviewId && candidate.partnerId === partnerId);
  if (!review) {
    throw new Error('Review not found.');
  }
  review.reply = text;
  review.replyDate = toIsoDate();
  saveStore();
  return review;
}

function getMarketplaceRole(user: SessionUser): 'worker' | 'client' {
  if (user.marketplaceRole === 'worker' || user.role === 'partner') {
    return 'worker';
  }
  return 'client';
}

function buildMarketplaceProfile(user: SessionUser, store: OfflineStore): MarketplaceProfile {
  const completedAsWorker = store.marketplaceJobs.filter(
    (job) => job.status === 'completed' && job.selectedApplicantId === user.id,
  ).length;
  const completedAsClient = store.marketplaceJobs.filter(
    (job) => job.status === 'completed' && job.owner_id === user.id,
  ).length;
  const postedJobs = store.marketplaceJobs.filter((job) => job.owner_id === user.id).length;
  const applicationsSubmitted = store.marketplaceApplications.filter(
    (application) => application.applicant_id === user.id,
  ).length;
  const acceptedApplications = store.marketplaceApplications.filter(
    (application) => application.applicant_id === user.id && application.status === 'accepted',
  ).length;
  const acceptanceRate = applicationsSubmitted > 0 ? (acceptedApplications / applicationsSubmitted) * 100 : 50;
  const ratings = Number(user.ratings || 4.5);
  const completedJobs = completedAsWorker + completedAsClient;
  const rank = Math.max(0, Math.min(100, Math.round((ratings / 5) * 50 + Math.min(completedJobs, 25) * 1.8 + acceptanceRate * 0.2)));
  const rankLabel = rank >= 90 ? 'Diamond' : rank >= 75 ? 'Gold' : rank >= 60 ? 'Silver' : rank >= 40 ? 'Bronze' : 'Starter';

  return {
    user_id: user.id,
    name: user.name,
    role: getMarketplaceRole(user),
    rank,
    rankLabel,
    ratings,
    walletBalance: Number(user.walletBalance || 0),
    completedJobs,
    postedJobs,
    applicationsSubmitted,
    location: String(user.location || 'Remote'),
    skills: Array.isArray(user.skills) ? user.skills : [],
  };
}

function scoreJobForUser(job: MarketplaceJob, profile: MarketplaceProfile): number {
  const text = `${job.title} ${job.description} ${job.requiredSkills.join(' ')}`.toLowerCase();
  const skillMatches = profile.skills.filter((skill) => text.includes(skill.toLowerCase())).length;
  const locationScore = profile.location && job.location
    ? (job.location.toLowerCase().includes(profile.location.toLowerCase()) ? 20 : 8)
    : 10;
  const modeScore = job.mode === 'online' ? 12 : 8;
  const budgetScore = job.budget >= 5000 ? 12 : 8;
  const openScore = job.status === 'open' ? 20 : 0;
  return openScore + locationScore + modeScore + budgetScore + skillMatches * 10;
}

function getDefaultUser(): SessionUser {
  return getStore().users[0] || {
    id: DEFAULT_CUSTOMER_ID,
    name: 'User',
    role: 'customer',
    phone: '0000000000',
  };
}

export async function fetchJobs(params?: {
  status?: 'open' | 'ongoing' | 'completed';
  mode?: 'online' | 'offline' | 'hybrid';
  search?: string;
  location?: string;
  mine?: boolean;
}): Promise<MarketplaceJob[]> {
  const store = getStore();
  const currentUser = getDefaultUser();

  let jobs = [...store.marketplaceJobs];
  if (params?.mine) {
    jobs = jobs.filter((job) => job.owner_id === currentUser.id || job.selectedApplicantId === currentUser.id);
  }
  if (params?.status) {
    jobs = jobs.filter((job) => job.status === params.status);
  }
  if (params?.mode) {
    jobs = jobs.filter((job) => job.mode === params.mode);
  }
  if (params?.location) {
    const needle = params.location.toLowerCase();
    jobs = jobs.filter((job) => job.location.toLowerCase().includes(needle));
  }
  if (params?.search) {
    const needle = params.search.toLowerCase();
    jobs = jobs.filter((job) => `${job.title} ${job.description} ${job.requiredSkills.join(' ')}`.toLowerCase().includes(needle));
  }

  return jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
  const store = getStore();
  const currentUser = getDefaultUser();

  const job: MarketplaceJob = {
    job_id: createId('mj'),
    owner_id: currentUser.id,
    title: payload.title.trim(),
    description: payload.description.trim(),
    budget: Number(payload.budget),
    location: payload.location.trim(),
    mode: payload.mode,
    status: 'open',
    requiredSkills: payload.requiredSkills,
    attachments: payload.attachments || [],
    createdAt: new Date().toISOString(),
    applicationsCount: 0,
    selectedApplicantId: '',
  };
  store.marketplaceJobs.push(job);
  saveStore();
  return job;
}

export async function applyToJob(jobId: string, proposal: string): Promise<MarketplaceApplication> {
  const store = getStore();
  const currentUser = getDefaultUser();
  const job = store.marketplaceJobs.find((candidate) => candidate.job_id === jobId);
  if (!job) {
    throw new Error('Job not found.');
  }
  if (job.owner_id === currentUser.id) {
    throw new Error('You cannot apply to your own job.');
  }
  const alreadyApplied = store.marketplaceApplications.some(
    (application) => application.job_id === jobId && application.applicant_id === currentUser.id,
  );
  if (alreadyApplied) {
    throw new Error('You have already applied to this job.');
  }

  const application: MarketplaceApplication = {
    application_id: createId('ma'),
    applicant_id: currentUser.id,
    job_id: jobId,
    proposal: proposal.trim(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  store.marketplaceApplications.push(application);
  job.applicationsCount = store.marketplaceApplications.filter((item) => item.job_id === jobId).length;
  store.marketplaceNotifications.push({
    notification_id: createId('mn'),
    user_id: job.owner_id,
    title: 'New application received',
    body: `${currentUser.name} applied to "${job.title}".`,
    type: 'application',
    isRead: false,
    createdAt: new Date().toISOString(),
  });
  saveStore();
  return application;
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
  const store = getStore();
  const applications = store.marketplaceApplications
    .filter((application) => application.job_id === jobId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((application) => {
      const applicant = store.users.find((user) => user.id === application.applicant_id);
      return {
        ...application,
        applicant: applicant
          ? {
              user_id: applicant.id,
              name: applicant.name,
              role: getMarketplaceRole(applicant),
              ratings: Number(applicant.ratings || 4.5),
              rank: Number(applicant.rank || 50),
            }
          : null,
      };
    });
  return applications;
}

export async function updateApplicationStatus(
  applicationId: string,
  status: 'shortlisted' | 'accepted' | 'rejected',
): Promise<MarketplaceApplication> {
  const store = getStore();
  const application = store.marketplaceApplications.find((candidate) => candidate.application_id === applicationId);
  if (!application) {
    throw new Error('Application not found.');
  }
  const job = store.marketplaceJobs.find((candidate) => candidate.job_id === application.job_id);
  if (!job) {
    throw new Error('Job not found.');
  }

  application.status = status;
  if (status === 'accepted') {
    job.selectedApplicantId = application.applicant_id;
    job.status = 'ongoing';
  }
  store.marketplaceNotifications.push({
    notification_id: createId('mn'),
    user_id: application.applicant_id,
    title: `Application ${status}`,
    body: `Your application for "${job.title}" is now ${status}.`,
    type: 'application',
    isRead: false,
    createdAt: new Date().toISOString(),
  });
  saveStore();
  return application;
}

export async function updateMarketplaceJobStatus(
  jobId: string,
  status: 'open' | 'ongoing' | 'completed',
): Promise<MarketplaceJob> {
  const store = getStore();
  const job = store.marketplaceJobs.find((candidate) => candidate.job_id === jobId);
  if (!job) {
    throw new Error('Job not found.');
  }
  job.status = status;

  if (status === 'completed' && job.selectedApplicantId) {
    const worker = store.users.find((user) => user.id === job.selectedApplicantId);
    if (worker) {
      worker.walletBalance = Number(worker.walletBalance || 0) + Math.round(job.budget * 0.9);
      worker.ratings = Number((Math.min(5, Number(worker.ratings || 4.5) + 0.03)).toFixed(2));
    }
  }

  saveStore();
  return job;
}

export async function fetchMarketplaceProfile(): Promise<MarketplaceProfile> {
  const store = getStore();
  const currentUser = getDefaultUser();
  return buildMarketplaceProfile(currentUser, store);
}

export async function updateMarketplaceProfile(payload: {
  location?: string;
  skills?: string[];
}): Promise<MarketplaceProfile> {
  const store = getStore();
  const currentUser = getDefaultUser();
  const user = store.users.find((candidate) => candidate.id === currentUser.id);
  if (!user) {
    throw new Error('User not found.');
  }
  if (payload.location?.trim()) {
    user.location = payload.location.trim();
  }
  if (payload.skills && payload.skills.length > 0) {
    user.skills = payload.skills.map((skill) => skill.trim()).filter(Boolean);
  }
  saveStore();
  return buildMarketplaceProfile(user, store);
}

export async function fetchRecommendations(): Promise<{
  profile: MarketplaceProfile;
  jobs: Array<MarketplaceJob & { matchScore: number }>;
}> {
  const store = getStore();
  const currentUser = getDefaultUser();
  const profile = buildMarketplaceProfile(currentUser, store);
  const jobs = store.marketplaceJobs
    .filter((job) => job.owner_id !== currentUser.id && job.status === 'open')
    .map((job) => ({ ...job, matchScore: scoreJobForUser(job, profile) }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10);

  return { profile, jobs };
}

export async function fetchConversations(): Promise<Array<{
  peer: {
    user_id: string;
    name: string;
    role: 'worker' | 'client';
    ratings: number;
    rank: number;
  };
  lastMessage: MarketplaceMessage;
  unreadCount: number;
}>> {
  const store = getStore();
  const currentUser = getDefaultUser();
  const userId = currentUser.id;
  const allMessages = store.marketplaceMessages
    .filter((message) => message.sender_id === userId || message.receiver_id === userId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const seen = new Set<string>();
  const conversations: Array<{
    peer: {
      user_id: string;
      name: string;
      role: 'worker' | 'client';
      ratings: number;
      rank: number;
    };
    lastMessage: MarketplaceMessage;
    unreadCount: number;
  }> = [];

  allMessages.forEach((message) => {
    const peerId = message.sender_id === userId ? message.receiver_id : message.sender_id;
    if (seen.has(peerId)) {
      return;
    }
    seen.add(peerId);
    const peer = store.users.find((candidate) => candidate.id === peerId);
    conversations.push({
      peer: {
        user_id: peerId,
        name: peer?.name || 'Unknown User',
        role: peer ? getMarketplaceRole(peer) : 'worker',
        ratings: Number(peer?.ratings || 4.5),
        rank: Number(peer?.rank || 50),
      },
      lastMessage: message,
      unreadCount: store.marketplaceNotifications.filter(
        (notification) => notification.user_id === userId && notification.type === 'message' && !notification.isRead,
      ).length,
    });
  });

  return conversations;
}

export async function fetchMessages(peerId: string): Promise<MarketplaceMessage[]> {
  const store = getStore();
  const currentUser = getDefaultUser();
  return store.marketplaceMessages
    .filter(
      (message) =>
        (message.sender_id === currentUser.id && message.receiver_id === peerId) ||
        (message.sender_id === peerId && message.receiver_id === currentUser.id),
    )
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export async function sendMessage(payload: {
  receiver_id: string;
  message: string;
  job_id?: string;
}): Promise<MarketplaceMessage> {
  const store = getStore();
  const currentUser = getDefaultUser();
  const message: MarketplaceMessage = {
    message_id: createId('mm'),
    sender_id: currentUser.id,
    receiver_id: payload.receiver_id,
    message: payload.message.trim(),
    timestamp: new Date().toISOString(),
    job_id: payload.job_id || '',
  };
  store.marketplaceMessages.push(message);
  store.marketplaceNotifications.push({
    notification_id: createId('mn'),
    user_id: payload.receiver_id,
    title: 'New message',
    body: `${currentUser.name}: ${payload.message.trim().slice(0, 80)}`,
    type: 'message',
    isRead: false,
    createdAt: new Date().toISOString(),
  });
  saveStore();
  return message;
}

export async function fetchNotifications(): Promise<MarketplaceNotification[]> {
  const store = getStore();
  const currentUser = getDefaultUser();
  return store.marketplaceNotifications
    .filter((notification) => notification.user_id === currentUser.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function markNotificationRead(notificationId: string): Promise<MarketplaceNotification> {
  const store = getStore();
  const currentUser = getDefaultUser();
  const notification = store.marketplaceNotifications.find(
    (candidate) => candidate.notification_id === notificationId && candidate.user_id === currentUser.id,
  );
  if (!notification) {
    throw new Error('Notification not found.');
  }
  notification.isRead = true;
  saveStore();
  return notification;
}

export function resetOfflineStore(): void {
  cache = deepClone(seedStore());
  saveStore();
}
