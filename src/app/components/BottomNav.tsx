import { BriefcaseBusiness, Home, MessageSquare, PlusSquare, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { trackUiAction } from '../utils/interaction';

interface BottomNavProps {
  type: 'customer' | 'partner';
}

export function BottomNav({ type }: BottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const customerNavItems = [
    { icon: Home, label: 'Home', path: '/customer' },
    { icon: BriefcaseBusiness, label: 'Jobs', path: '/customer/jobs' },
    { icon: PlusSquare, label: 'Post Work', path: '/customer/post-work' },
    { icon: MessageSquare, label: 'Messages', path: '/customer/messages' },
    { icon: User, label: 'Profile', path: '/customer/profile' },
  ];

  const partnerNavItems = [
    { icon: Home, label: 'Home', path: '/partner' },
    { icon: BriefcaseBusiness, label: 'Jobs', path: '/partner/jobs' },
    { icon: PlusSquare, label: 'Post Work', path: '/partner/post-work' },
    { icon: MessageSquare, label: 'Messages', path: '/partner/messages' },
    { icon: User, label: 'Profile', path: '/partner/profile' },
  ];

  const items = type === 'customer' ? customerNavItems : partnerNavItems;

  const isActive = (path: string) => {
    if (path === '/customer' || path === '/partner') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50">
      <div className="max-w-md mx-auto flex justify-around items-center h-16 px-4">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => {
                trackUiAction('bottom_nav_click', item.path, { role: type });
                navigate(item.path);
              }}
              aria-label={item.label}
              className={`flex flex-col items-center justify-center gap-1 flex-1 transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
