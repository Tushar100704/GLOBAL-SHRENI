# Global Shreni - AI-Powered Service Marketplace

## 🎯 Overview

Global Shreni is a modern, mobile-first AI-powered service marketplace platform that connects customers with local service providers through an intelligent conversational interface.

## 🏗️ Application Structure

### User Flows

#### 1. **Onboarding Flow** (`/`)
- 4 premium slides introducing the AI-powered platform
- Skip option to jump directly to role selection
- Smooth animations and gradient backgrounds

#### 2. **Role Selection** (`/role-selection`)
- Choose between Customer and Service Partner roles
- Clean, card-based interface

#### 3. **Authentication** (`/auth`)
- Phone number + OTP verification
- Google Sign-In option
- Frictionless UX

### Customer Experience

#### **AI Chat Home** (`/customer`)
- ChatGPT-style conversational interface
- Natural language service discovery
- Suggested prompts for quick actions
- Real-time AI responses with service cards
- Typing animation for AI thinking state

#### **Service Partner Detail** (`/customer/partner/:id`)
- Comprehensive partner profile
- Services with pricing
- Reviews and ratings
- Availability calendar
- Direct booking and call options

#### **Booking Flow** (`/customer/booking/:partnerId/:serviceId`)
- 3-step booking process:
  1. Date & Time selection
  2. Address & Notes
  3. Confirmation
- Visual progress indicator
- Service and price summary

#### **Payment** (`/customer/payment/:bookingId`)
- Multiple payment methods (UPI, Card, Wallet)
- Transparent pricing breakdown
- Success animation

#### **Live Tracking** (`/customer/tracking/:bookingId`)
- Real-time status updates
- 4-stage tracking flow:
  1. Assigned
  2. On the way
  3. In progress
  4. Completed
- Partner contact options
- ETA display

#### **My Bookings** (`/customer/bookings`)
- Tabbed interface (Upcoming/Completed)
- Booking status tracking
- Rebook and rate options

#### **Profile** (`/customer/profile`)
- User statistics
- Menu options (addresses, favorites, settings)
- Logout functionality

### Service Partner Experience

#### **Partner Dashboard** (`/partner`)
- Today's jobs and earnings
- Performance overview
- Earnings summary
- Today's job list
- Quick action buttons

#### **Task Manager** (`/partner/tasks`)
- 3 tabs: Pending, Active, Completed
- Accept/Reject job requests
- Status management (accept → on-the-way → in-progress → completed)
- Customer contact options

#### **Availability** (`/partner/availability`)
- Day-wise availability toggle
- Time slot management
- Visual slot selection
- Save changes functionality

#### **Earnings** (`/partner/earnings`)
- Weekly/Monthly earnings graphs
- Transaction history
- Payout requests
- Performance metrics

#### **Reviews & Ratings** (`/partner/reviews`)
- Overall rating display
- Rating distribution graph
- Individual reviews with customer feedback
- Reply to reviews functionality

## 🎨 Design System

### Colors
- **Primary**: Blue (#6366f1)
- **Accent**: Purple (#8b5cf6)
- **Gradients**: Blue to Purple (135deg)
- **Success**: Green (#10b981)
- **Warning**: Orange (#f59e0b)
- **Destructive**: Red (#d4183d)

### Typography
- Modern sans-serif font stack
- Responsive text sizes
- Medium weight for headings (500)
- Normal weight for body (400)

### Spacing
- 8pt grid system
- Consistent padding and margins
- Responsive containers

### Components
- Rounded corners (12-16px radius)
- Soft shadows
- Gradient backgrounds
- Smooth transitions
- Micro-interactions

## 📱 Mobile-First Features

- Bottom navigation (persistent)
- Swipe gestures support
- Touch-friendly tap targets
- Optimized viewport
- Smooth scrolling
- Pull-to-refresh ready

## 🤖 AI Features

- Natural language understanding
- Context-aware suggestions
- Smart service matching
- Suggested prompts
- Typing indicators
- Structured responses with actionable cards

## 🔐 Trust & Safety

- Verified service partner badges
- KYC verification indicators
- Rating and review system
- Secure payment flow
- Real-time tracking
- Emergency contact options

## 📊 Mock Data

The prototype uses comprehensive mock data for:
- 5 service categories (Veterinary, Electrician, Plumber, Home Cleaning, AC Repair)
- Service partners with detailed profiles
- Reviews and ratings
- Bookings and transactions
- Partner statistics and earnings

## 🚀 Quick Start Guide

### Customer Journey:
1. Open app → Onboarding slides
2. Select "I'm a Customer"
3. Sign in with phone or Google
4. Chat with AI to find services
5. Select service partner
6. Book service (date/time/address)
7. Make payment
8. Track service in real-time
9. Rate and review

### Partner Journey:
1. Open app → Onboarding slides
2. Select "I'm a Service Partner"
3. Sign in with phone or Google
4. View dashboard and stats
5. Accept/Reject job requests
6. Update job status
7. Manage availability
8. View earnings and reviews

## 🎯 Key Features Implemented

✅ AI-powered conversational interface
✅ Real-time service discovery
✅ Comprehensive booking flow
✅ Multiple payment methods
✅ Live job tracking
✅ Partner task management
✅ Earnings analytics with charts
✅ Reviews and ratings system
✅ Availability management
✅ Bottom navigation
✅ Gradient-based modern UI
✅ Smooth animations
✅ Mobile-optimized
✅ Component-based architecture

## 🛠️ Technology Stack

- React 18.3
- React Router 7 (Data mode)
- TypeScript
- Tailwind CSS v4
- Recharts (for analytics)
- Motion (for animations)
- Lucide React (icons)
- Radix UI (components)
- Sonner (toasts)

## 📁 File Structure

```
/src/app
├── App.tsx                 # Main app with RouterProvider
├── routes.tsx             # Route configuration
├── types/
│   └── index.ts           # TypeScript interfaces
├── data/
│   └── mockData.ts        # Mock data
├── utils/
│   ├── constants.ts       # App constants
│   └── helpers.ts         # Utility functions
├── components/
│   ├── ui/                # Radix UI components
│   ├── BottomNav.tsx      # Bottom navigation
│   ├── ServiceCard.tsx    # Service partner card
│   ├── ChatMessage.tsx    # AI chat message
│   ├── StatusBadge.tsx    # Status indicator
│   ├── DemoHelper.tsx     # Demo tips
│   ├── LoadingScreen.tsx  # Loading state
│   └── AIFloatingButton.tsx
├── layouts/
│   ├── CustomerLayout.tsx # Customer app layout
│   └── PartnerLayout.tsx  # Partner app layout
├── pages/
│   ├── Onboarding.tsx
│   ├── RoleSelection.tsx
│   ├── Auth.tsx
│   ├── customer/
│   │   ├── Home.tsx
│   │   ├── ServicePartnerDetail.tsx
│   │   ├── BookingFlow.tsx
│   │   ├── Payment.tsx
│   │   ├── LiveTracking.tsx
│   │   ├── MyBookings.tsx
│   │   └── CustomerProfile.tsx
│   └── partner/
│       ├── PartnerDashboard.tsx
│       ├── TaskManager.tsx
│       ├── Availability.tsx
│       ├── Earnings.tsx
│       └── PartnerReviews.tsx
```

## 🎨 Customization

The app uses CSS variables for easy theme customization. See `/src/styles/theme.css` for color tokens.

## 📝 Notes

- This is a fully interactive prototype with mock data
- All payment flows are simulated (no real transactions)
- Location services use static data (Bangalore)
- AI responses are rule-based (not actual AI)
- All images from Unsplash (free to use)

## 🎓 Learning Points

This prototype demonstrates:
- Modern React patterns (hooks, context)
- React Router data mode routing
- Component composition
- State management
- TypeScript interfaces
- Responsive design
- Animation techniques
- UX best practices for mobile apps
- AI-first interface design
- Two-sided marketplace patterns

---

**Created with ❤️ for Global Shreni**
