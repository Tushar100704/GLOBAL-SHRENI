import { createBrowserRouter } from 'react-router';
import { Onboarding } from './pages/Onboarding';
import { RoleSelection } from './pages/RoleSelection';
import { Auth } from './pages/Auth';
import { CustomerLayout } from './layouts/CustomerLayout';
import { PartnerLayout } from './layouts/PartnerLayout';
import { HomeFeed } from './pages/marketplace/HomeFeed';
import { ServicePartnerDetail } from './pages/customer/ServicePartnerDetail';
import { BookingFlow } from './pages/customer/BookingFlow';
import { Payment } from './pages/customer/Payment';
import { LiveTracking } from './pages/customer/LiveTracking';
import { MyBookings } from './pages/customer/MyBookings';
import { JobsBoard } from './pages/marketplace/JobsBoard';
import { PostWork } from './pages/marketplace/PostWork';
import { MessagesPanel } from './pages/marketplace/MessagesPanel';
import { MarketplaceProfilePage } from './pages/marketplace/MarketplaceProfilePage';
import { NotificationsPanel } from './pages/marketplace/NotificationsPanel';
import { PartnerDashboard } from './pages/partner/PartnerDashboard';
import { TaskManager } from './pages/partner/TaskManager';
import { Availability } from './pages/partner/Availability';
import { Earnings } from './pages/partner/Earnings';
import { PartnerReviews } from './pages/partner/PartnerReviews';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Onboarding,
  },
  {
    path: '/role-selection',
    Component: RoleSelection,
  },
  {
    path: '/auth',
    Component: Auth,
  },
  {
    path: '/customer',
    Component: CustomerLayout,
    children: [
      { index: true, Component: HomeFeed },
      { path: 'jobs', Component: JobsBoard },
      { path: 'post-work', Component: PostWork },
      { path: 'messages', Component: MessagesPanel },
      { path: 'profile', Component: MarketplaceProfilePage },
      { path: 'notifications', Component: NotificationsPanel },

      { path: 'partner/:id', Component: ServicePartnerDetail },
      { path: 'booking/:partnerId/:serviceId', Component: BookingFlow },
      { path: 'payment/:bookingId', Component: Payment },
      { path: 'tracking/:bookingId', Component: LiveTracking },
      { path: 'bookings', Component: MyBookings },

      { path: 'services/partner/:id', Component: ServicePartnerDetail },
      { path: 'services/booking/:partnerId/:serviceId', Component: BookingFlow },
      { path: 'services/payment/:bookingId', Component: Payment },
      { path: 'services/tracking/:bookingId', Component: LiveTracking },
      { path: 'services/bookings', Component: MyBookings },
    ],
  },
  {
    path: '/partner',
    Component: PartnerLayout,
    children: [
      { index: true, Component: HomeFeed },
      { path: 'jobs', Component: JobsBoard },
      { path: 'post-work', Component: PostWork },
      { path: 'messages', Component: MessagesPanel },
      { path: 'profile', Component: MarketplaceProfilePage },
      { path: 'notifications', Component: NotificationsPanel },

      { path: 'tasks', Component: TaskManager },
      { path: 'availability', Component: Availability },
      { path: 'earnings', Component: Earnings },
      { path: 'reviews', Component: PartnerReviews },

      { path: 'service/dashboard', Component: PartnerDashboard },
      { path: 'service/tasks', Component: TaskManager },
      { path: 'service/availability', Component: Availability },
      { path: 'service/earnings', Component: Earnings },
      { path: 'service/reviews', Component: PartnerReviews },
    ],
  },
]);
