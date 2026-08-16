import { ServicePartner, Review, Booking, Job, PartnerStats } from '../types';

export const mockServicePartners: ServicePartner[] = [
  {
    id: '1',
    name: 'Dr. Sarah Veterinary Clinic',
    category: 'Veterinary',
    rating: 4.8,
    reviewCount: 234,
    distance: 1.2,
    eta: 15,
    priceRange: '₹500-2000',
    available: true,
    image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop',
    expertise: ['Pet Care', 'Emergency Care', 'Vaccination', 'Surgery'],
    description: 'Expert veterinary care for all your pets. 15+ years of experience.',
    verified: true,
    services: [
      { id: 's1', name: 'General Checkup', price: 500, duration: 30, description: 'Complete health examination' },
      { id: 's2', name: 'Vaccination', price: 800, duration: 20, description: 'Annual vaccination shots' },
      { id: 's3', name: 'Emergency Care', price: 2000, duration: 60, description: '24/7 emergency services' },
    ],
    availability: [
      { date: '2026-04-04', slots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'] },
      { date: '2026-04-05', slots: ['09:00', '10:00', '11:00', '14:00', '15:00'] },
      { date: '2026-04-06', slots: ['09:00', '11:00', '14:00', '16:00'] },
    ]
  },
  {
    id: '2',
    name: 'PowerFix Electricians',
    category: 'Electrician',
    rating: 4.6,
    reviewCount: 189,
    distance: 0.8,
    eta: 10,
    priceRange: '₹300-1500',
    available: true,
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=400&fit=crop',
    expertise: ['Wiring', 'Repairs', 'Installation', 'Emergency'],
    description: 'Licensed electricians for all your electrical needs.',
    verified: true,
    services: [
      { id: 's4', name: 'Fan Installation', price: 300, duration: 45, description: 'Install ceiling fan' },
      { id: 's5', name: 'Wiring Repair', price: 800, duration: 90, description: 'Fix electrical wiring issues' },
      { id: 's6', name: 'Switch/Socket Replacement', price: 200, duration: 30, description: 'Replace faulty switches' },
    ],
    availability: [
      { date: '2026-04-04', slots: ['08:00', '09:00', '10:00', '14:00', '15:00', '17:00'] },
      { date: '2026-04-05', slots: ['08:00', '09:00', '11:00', '15:00', '17:00'] },
    ]
  },
  {
    id: '3',
    name: 'QuickFix Plumbing',
    category: 'Plumber',
    rating: 4.7,
    reviewCount: 312,
    distance: 2.0,
    eta: 20,
    priceRange: '₹400-2000',
    available: true,
    image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&h=400&fit=crop',
    expertise: ['Pipe Repair', 'Leak Fix', 'Bathroom', 'Kitchen'],
    description: 'Expert plumbers available 24/7 for emergency services.',
    verified: true,
    services: [
      { id: 's7', name: 'Leak Repair', price: 500, duration: 60, description: 'Fix water leaks' },
      { id: 's8', name: 'Drain Cleaning', price: 700, duration: 45, description: 'Clear blocked drains' },
      { id: 's9', name: 'Tap Installation', price: 400, duration: 30, description: 'Install new taps' },
    ],
    availability: [
      { date: '2026-04-04', slots: ['09:00', '10:00', '14:00', '16:00'] },
      { date: '2026-04-05', slots: ['08:00', '10:00', '11:00', '15:00'] },
    ]
  },
  {
    id: '4',
    name: 'Sparkle Home Cleaning',
    category: 'Home Cleaning',
    rating: 4.9,
    reviewCount: 456,
    distance: 1.5,
    eta: 18,
    priceRange: '₹800-3000',
    available: false,
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=400&fit=crop',
    expertise: ['Deep Cleaning', 'Regular Cleaning', 'Kitchen', 'Bathroom'],
    description: 'Professional home cleaning services with eco-friendly products.',
    verified: true,
    services: [
      { id: 's10', name: 'Regular Cleaning', price: 800, duration: 120, description: 'Complete home cleaning' },
      { id: 's11', name: 'Deep Cleaning', price: 2500, duration: 240, description: 'Intensive deep cleaning' },
      { id: 's12', name: 'Kitchen Cleaning', price: 1200, duration: 90, description: 'Kitchen deep clean' },
    ],
    availability: [
      { date: '2026-04-05', slots: ['09:00', '14:00'] },
      { date: '2026-04-06', slots: ['09:00', '10:00', '14:00'] },
    ]
  },
  {
    id: '5',
    name: 'AC Care Experts',
    category: 'AC Repair',
    rating: 4.5,
    reviewCount: 178,
    distance: 3.2,
    eta: 30,
    priceRange: '₹500-2500',
    available: true,
    image: 'https://images.unsplash.com/photo-1631545806609-6b3c0f4e8ec6?w=400&h=400&fit=crop',
    expertise: ['AC Service', 'Repair', 'Installation', 'Gas Refill'],
    description: 'Certified AC technicians for all major brands.',
    verified: true,
    services: [
      { id: 's13', name: 'AC Service', price: 500, duration: 60, description: 'Regular AC maintenance' },
      { id: 's14', name: 'Gas Refill', price: 1800, duration: 45, description: 'AC gas refilling' },
      { id: 's15', name: 'AC Repair', price: 1200, duration: 90, description: 'Fix AC issues' },
    ],
    availability: [
      { date: '2026-04-04', slots: ['10:00', '14:00', '16:00'] },
      { date: '2026-04-05', slots: ['09:00', '11:00', '15:00'] },
    ]
  },
];

export const mockReviews: Review[] = [
  {
    id: 'r1',
    userId: 'u1',
    userName: 'Rahul Sharma',
    userImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Excellent service! Very professional and took great care of my dog. Highly recommended.',
    tags: ['Professional', 'On Time', 'Friendly'],
    date: '2026-03-28',
    photos: ['https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=300&h=300&fit=crop']
  },
  {
    id: 'r2',
    userId: 'u2',
    userName: 'Priya Patel',
    userImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Fixed the wiring issue quickly and efficiently. Great work!',
    tags: ['Quick Service', 'Expert', 'Value for Money'],
    date: '2026-03-25',
  },
  {
    id: 'r3',
    userId: 'u3',
    userName: 'Amit Kumar',
    userImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    rating: 4,
    comment: 'Good service but took a bit longer than expected. Overall satisfied.',
    tags: ['Good Quality', 'Polite'],
    date: '2026-03-20',
  },
];

export const mockBookings: Booking[] = [
  {
    id: 'b1',
    partnerId: '1',
    partnerName: 'Dr. Sarah Veterinary Clinic',
    partnerImage: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop',
    service: 'General Checkup',
    date: '2026-04-04',
    time: '10:00',
    status: 'assigned',
    price: 500,
    address: '123 MG Road, Bangalore',
    category: 'Veterinary'
  },
  {
    id: 'b2',
    partnerId: '2',
    partnerName: 'PowerFix Electricians',
    partnerImage: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=400&fit=crop',
    service: 'Fan Installation',
    date: '2026-04-05',
    time: '14:00',
    status: 'pending',
    price: 300,
    address: '123 MG Road, Bangalore',
    category: 'Electrician'
  },
  {
    id: 'b3',
    partnerId: '4',
    partnerName: 'Sparkle Home Cleaning',
    partnerImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=400&fit=crop',
    service: 'Deep Cleaning',
    date: '2026-03-30',
    time: '09:00',
    status: 'completed',
    price: 2500,
    address: '123 MG Road, Bangalore',
    category: 'Home Cleaning'
  },
];

export const mockPartnerStats: PartnerStats = {
  todayJobs: 5,
  todayEarnings: 3200,
  weeklyEarnings: 18500,
  monthlyEarnings: 72000,
  totalRating: 4.8,
  totalReviews: 234,
  completionRate: 98,
};

export const mockJobs: Job[] = [
  {
    id: 'j1',
    customerId: 'c1',
    customerName: 'Rahul Sharma',
    customerImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    service: 'General Checkup',
    date: '2026-04-04',
    time: '10:00',
    status: 'pending',
    price: 500,
    address: '123 MG Road, Bangalore',
    distance: 1.2,
  },
  {
    id: 'j2',
    customerId: 'c2',
    customerName: 'Priya Patel',
    customerImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    service: 'Vaccination',
    date: '2026-04-04',
    time: '14:00',
    status: 'accepted',
    price: 800,
    address: '456 Indiranagar, Bangalore',
    distance: 2.5,
  },
  {
    id: 'j3',
    customerId: 'c3',
    customerName: 'Amit Kumar',
    customerImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    service: 'Emergency Care',
    date: '2026-04-04',
    time: '16:00',
    status: 'in-progress',
    price: 2000,
    address: '789 Koramangala, Bangalore',
    distance: 0.8,
  },
];

export const serviceCategories = [
  { name: 'Veterinary', icon: '🐾' },
  { name: 'Electrician', icon: '⚡' },
  { name: 'Plumber', icon: '🔧' },
  { name: 'Home Cleaning', icon: '🧹' },
  { name: 'AC Repair', icon: '❄️' },
  { name: 'Carpenter', icon: '🔨' },
  { name: 'Painter', icon: '🎨' },
  { name: 'Appliance Repair', icon: '🔌' },
];

export const suggestedPrompts = [
  'Find vet near me',
  'Book electrician',
  'Home cleaning tomorrow',
  'Emergency plumber',
  'AC repair service',
  'Carpenter for furniture',
];
