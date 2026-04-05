import { Navigate, Outlet } from 'react-router';
import { BottomNav } from '../components/BottomNav';
import { getSessionUser } from '../utils/session';

export function CustomerLayout() {
  const sessionUser = getSessionUser();
  if (!sessionUser) {
    return <Navigate to="/auth" replace />;
  }
  if (sessionUser.role !== 'customer') {
    return <Navigate to="/partner" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <Outlet />
      </div>
      <BottomNav type="customer" />
    </div>
  );
}
