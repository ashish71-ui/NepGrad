import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import wcService, { type WCGroup } from '../../services/wcService';
import { useAuth } from '../../context/AuthContext';

interface WCGroupContextValue {
  myGroup: WCGroup | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const WCGroupContext = createContext<WCGroupContextValue>({
  myGroup: null,
  loading: true,
  refetch: async () => {},
});

export const WCGroupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [myGroup, setMyGroup] = useState<WCGroup | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!isAuthenticated || user?.is_staff) {
      setMyGroup(null);
      setLoading(false);
      return;
    }
    try {
      const g = await wcService.getMyGroup();
      setMyGroup(g);
    } catch {
      setMyGroup(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.is_staff]);

  useEffect(() => { refetch(); }, [refetch]);

  return (
    <WCGroupContext.Provider value={{ myGroup, loading, refetch }}>
      {children}
    </WCGroupContext.Provider>
  );
};

export const useWCGroup = () => useContext(WCGroupContext);
