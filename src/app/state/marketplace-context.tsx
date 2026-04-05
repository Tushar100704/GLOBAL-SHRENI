import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MarketplaceProfile } from '../types';
import { fetchMarketplaceProfile, fetchNotifications } from '../api/marketplaceApi';

interface MarketplaceContextValue {
  profile: MarketplaceProfile | null;
  unreadNotifications: number;
  refreshing: boolean;
  refreshMarketplace: () => Promise<void>;
}

const MarketplaceContext = createContext<MarketplaceContextValue | undefined>(undefined);

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<MarketplaceProfile | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const refreshMarketplace = useCallback(async () => {
    setRefreshing(true);
    try {
      const [profileResponse, notificationsResponse] = await Promise.all([
        fetchMarketplaceProfile(),
        fetchNotifications(),
      ]);
      setProfile(profileResponse);
      setUnreadNotifications(notificationsResponse.filter((item) => !item.isRead).length);
    } catch {
      // Ignore here; individual screens will show specific errors.
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshMarketplace();
  }, [refreshMarketplace]);

  const value = useMemo(
    () => ({
      profile,
      unreadNotifications,
      refreshing,
      refreshMarketplace,
    }),
    [profile, unreadNotifications, refreshing, refreshMarketplace],
  );

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}

export function useMarketplaceContext(): MarketplaceContextValue {
  const value = useContext(MarketplaceContext);
  if (!value) {
    throw new Error('useMarketplaceContext must be used within MarketplaceProvider');
  }
  return value;
}
