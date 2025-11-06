import { useState, useEffect, useCallback } from 'react';
import { HubStatus } from '../types/index';
import { AdminAPI } from '../app/api/admin';

export function useHubStatus() {
  const [hubs, setHubs] = useState<HubStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHubs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const hubData = await AdminAPI.getHubs();
      setHubs(hubData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch hub statuses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHubs();
    const interval = setInterval(fetchHubs, 30000);
    return () => clearInterval(interval);
  }, [fetchHubs]);

  return { hubs, loading, error, refetch: fetchHubs };
}