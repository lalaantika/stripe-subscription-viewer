import { useEffect, useState } from 'react';
import type { SubscriptionResponse } from '../lib/types';
import { getSubscription } from '../lib/api';

interface UseSubscriptionState {
  data: SubscriptionResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSubscription(): UseSubscriptionState {
  const [data, setData] = useState<SubscriptionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = () => {
    setReloadToken((t) => t + 1);
  };

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const result = await getSubscription();
        if (!cancelled) {
          setData(result);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? 'Failed to load subscription');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return { data, loading, error, refetch };
}